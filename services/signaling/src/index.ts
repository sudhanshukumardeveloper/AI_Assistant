import express from "express";
import http from "node:http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { redisPub, redisSub } from "./redisClient";
import { registerSocketHandlers } from "./socketHandler";

const app = express();
app.get("/health", (_req, res) => res.json({ ok: true, service: "signaling" }));

const allowedOrigins = (process.env.WEB_ORIGIN || "").split(",").map(v => v.trim()).filter(Boolean);
if (!allowedOrigins.length) throw new Error("WEB_ORIGIN must be configured");

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: allowedOrigins, credentials: true },
  transports: ["websocket"],
  allowRequest: (req, callback) => {
    const origin = req.headers.origin || "";
    callback(null, allowedOrigins.includes(origin));
  }
});

io.adapter(createAdapter(redisPub, redisSub));
registerSocketHandlers(io);

const port = Number(process.env.PORT || 4001);
server.listen(port, () => console.log(`signaling listening on :${port}`));
