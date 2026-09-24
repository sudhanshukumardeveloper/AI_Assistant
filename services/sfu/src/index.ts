import express from "express";
import crypto from "node:crypto";
import { getWorker } from "./worker";
import { createWebRtcTransport } from "./transports";

type Claims = { sub: string; room: string; exp: number };
const routers = new Map<string, any>();
const transports = new Map<string, any>();
const producers = new Map<string, any>();
const consumers = new Map<string, any>();
const transportOwners = new Map<string, { userId: string; roomId: string }>();

function verifyToken(token: unknown): Claims | null {
  if (typeof token !== "string") return null;
  const [payload, signature] = token.split(".");
  const secret = process.env.SIGNALING_SECRET;
  if (!payload || !signature || !secret) return null;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Claims;
    return claims.exp > Math.floor(Date.now()/1000) ? claims : null;
  } catch { return null; }
}

function auth(req: express.Request, res: express.Response) {
  const claims = verifyToken((req.headers.authorization || "").replace(/^Bearer\s+/i, ""));
  if (!claims) { res.status(401).json({ error: "Unauthorized" }); return null; }
  return claims;
}

async function routerFor(roomId: string) {
  let router = routers.get(roomId);
  if (!router || router.closed) {
    const worker = await getWorker();
    router = await worker.createRouter({ mediaCodecs: [
      { kind: "audio", mimeType: "audio/opus", clockRate: 48000, channels: 2 },
      { kind: "video", mimeType: "video/VP8", clockRate: 90000 }
    ]});
    routers.set(roomId, router);
  }
  return router;
}

const app = express();
app.use(express.json({ limit: "2mb" }));
app.get("/health", (_req, res) => res.json({ ok: true, service: "sfu" }));

app.get("/router-capabilities", async (req, res) => {
  const claims = auth(req, res); if (!claims) return;
  const router = await routerFor(claims.room);
  res.json(router.rtpCapabilities);
});

app.post("/transport", async (req, res) => {
  const claims = auth(req, res); if (!claims) return;
  try {
    const router = await routerFor(claims.room);
    const result = await createWebRtcTransport(router);
    transports.set(result.transport.id, result.transport);
    transportOwners.set(result.transport.id, { userId: claims.sub, roomId: claims.room });
    res.json({ id: result.transport.id, iceParameters: result.iceParameters, iceCandidates: result.iceCandidates, dtlsParameters: result.dtlsParameters });
  } catch (error) { console.error(error); res.status(500).json({ error: "Unable to create transport" }); }
});

app.post("/transport/connect", async (req, res) => {
  const claims = auth(req, res); if (!claims) return;
  try {
    const transportId = String(req.body.transportId);
    const transport = transports.get(transportId);
    const owner = transportOwners.get(transportId);
    if (!transport || !owner || owner.userId !== claims.sub || owner.roomId !== claims.room) return res.status(404).json({ error: "Transport not found" });
    await transport.connect({ dtlsParameters: req.body.dtlsParameters });
    res.json({ ok: true });
  } catch { res.status(400).json({ error: "Unable to connect transport" }); }
});

app.post("/produce", async (req, res) => {
  const claims = auth(req, res); if (!claims) return;
  try {
    const transportId = String(req.body.transportId);
    const transport = transports.get(transportId);
    const owner = transportOwners.get(transportId);
    if (!transport || !owner || owner.userId !== claims.sub || owner.roomId !== claims.room) return res.status(404).json({ error: "Transport not found" });
    const producer = await transport.produce({ kind: req.body.kind, rtpParameters: req.body.rtpParameters });
    producers.set(producer.id, { producer, roomId: claims.room });
    producer.on("transportclose", () => producers.delete(producer.id));
    res.json({ id: producer.id });
  } catch { res.status(400).json({ error: "Unable to produce media" }); }
});

app.post("/consume", async (req, res) => {
  const claims = auth(req, res); if (!claims) return;
  try {
    const router = await routerFor(claims.room);
    const producerInfo = producers.get(String(req.body.producerId));
    if (!producerInfo || producerInfo.roomId !== claims.room) return res.status(404).json({ error: "Producer not found" });
    if (!router.canConsume({ producerId: producerInfo.producer.id, rtpCapabilities: req.body.rtpCapabilities })) return res.status(400).json({ error: "Cannot consume producer" });
    const transport = transports.get(String(req.body.transportId));
    if (!transport) return res.status(404).json({ error: "Transport not found" });
    const consumer = await transport.consume({ producerId: producerInfo.producer.id, rtpCapabilities: req.body.rtpCapabilities, paused: true });
    consumers.set(consumer.id, { consumer, roomId: claims.room });
    consumer.on("transportclose", () => consumers.delete(consumer.id));
    res.json({ id: consumer.id, producerId: producerInfo.producer.id, kind: consumer.kind, rtpParameters: consumer.rtpParameters });
  } catch { res.status(400).json({ error: "Unable to consume media" }); }
});

app.post("/consumer/resume", async (req, res) => {
  const claims = auth(req, res); if (!claims) return;
  const consumerInfo = consumers.get(String(req.body.consumerId));
  if (!consumerInfo || consumerInfo.roomId !== claims.room) return res.status(404).json({ error: "Consumer not found" });
  await consumerInfo.consumer.resume();
  res.json({ ok: true });
});

const port = Number(process.env.PORT || 4100);
app.listen(port, () => console.log(`SFU listening on :${port}`));
