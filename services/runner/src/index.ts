import crypto from "node:crypto";
import express from "express";
import { WebSocketServer, WebSocket } from "ws";

const port = Number(process.env.PORT || 4100);
const secret = process.env.ACTION_RUNNER_SECRET;
const androidToken = process.env.ANDROID_RUNNER_TOKEN;
function required(value: string | undefined, name: string) { if (!value) throw new Error(`${name} is required`); return value; }
const runnerSecret = required(secret, "ACTION_RUNNER_SECRET");

const app = express();
app.use(express.json({ limit: "64kb" }));
let android: WebSocket | null = null;
const pending = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: NodeJS.Timeout }>();

function validSignature(req: express.Request, rawBody: string) {
  const ts = req.header("x-aegis-timestamp");
  const signature = req.header("x-aegis-signature");
  if (!ts || !signature) return false;
  const age = Math.abs(Math.floor(Date.now()/1000) - Number(ts));
  if (!Number.isFinite(age) || age > 60) return false;
  const expected = crypto.createHmac("sha256", runnerSecret).update(`${ts}.${rawBody}`).digest("hex");
  return signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

app.get("/health", (_req, res) => res.json({ ok: true, androidConnected: android?.readyState === WebSocket.OPEN }));

app.post("/v1/actions", async (req, res) => {
  const raw = JSON.stringify(req.body);
  if (!validSignature(req, raw)) return res.status(401).json({ accepted:false, error:"invalid_signature" });
  const requestId = req.header("x-aegis-request-id");
  if (!requestId || typeof req.body.action !== "string") return res.status(400).json({ accepted:false, error:"invalid_request" });

  if (req.body.action.toLowerCase().includes("phone") || req.body.payload?.target === "android") {
    if (!android || android.readyState !== WebSocket.OPEN) return res.status(503).json({ accepted:false, error:"android_companion_offline" });
    const result = await new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => { pending.delete(requestId); reject(new Error("android_action_timeout")); }, 15000);
      pending.set(requestId, { resolve, reject, timer });
      android!.send(JSON.stringify({ type:"action", requestId, action:req.body.action, payload:req.body.payload ?? {} }));
    }).catch(error => ({ accepted:false, error:error instanceof Error ? error.message : "android_failed" }));
    if ((result as {accepted?:boolean}).accepted !== true) return res.status(502).json(result);
    return res.json({ accepted:true, requestId, executor:"android-companion", result });
  }

  return res.status(501).json({ accepted:false, error:"No executor configured for this action target" });
});

const server = app.listen(port, () => console.log(`Aegis runner listening on :${port}`));
const wss = new WebSocketServer({ server, path:"/android" });
wss.on("connection", (socket, req) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  if (!androidToken || url.searchParams.get("token") !== androidToken) { socket.close(1008, "unauthorized"); return; }
  android?.close(1000, "replaced");
  android = socket;
  socket.on("message", raw => {
    try {
      const message = JSON.parse(raw.toString()) as { type?:string; requestId?:string; accepted?:boolean; error?:string; result?:unknown };
      if (message.type !== "action_result" || !message.requestId) return;
      const item = pending.get(message.requestId);
      if (!item) return;
      clearTimeout(item.timer); pending.delete(message.requestId);
      item.resolve({ accepted: message.accepted === true, error: message.error, result: message.result });
    } catch {}
  });
  socket.on("close", () => { if (android === socket) android = null; });
});
