import type { Server, Socket } from "socket.io";
import crypto from "node:crypto";
import { addMember, listMembers, removeMember } from "./roomManager";

type Claims = { sub: string; room: string; exp: number };
type RoomPayload = { roomId: string };
type TargetPayload = RoomPayload & { target: string; description?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };

function verifyToken(token: unknown): Claims | null {
  if (typeof token !== "string") return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const secret = process.env.SIGNALING_SECRET || process.env.RESEND_API_KEY;
  if (!secret) return null;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Claims;
    return claims.exp > Math.floor(Date.now()/1000) ? claims : null;
  } catch { return null; }
}

export function registerSocketHandlers(io: Server) {
  io.use((socket, next) => {
    const claims = verifyToken(socket.handshake.auth?.token);
    if (!claims) return next(new Error("unauthorized"));
    socket.data.userId = claims.sub;
    socket.data.roomId = claims.room;
    next();
  });

  io.on("connection", (socket: Socket) => {
    socket.on("join-room", async ({ roomId }: RoomPayload) => {
      if (socket.data.roomId !== roomId) return socket.emit("error-message", "Unauthorized room");
      await socket.join(roomId);
      await addMember(roomId, socket.id);
      const existing = (await listMembers(roomId)).filter(id => id !== socket.id);
      socket.emit("room-members", existing);
      socket.to(roomId).emit("participant-joined", socket.id);
    });

    socket.on("sdp-offer", ({ roomId, target, description }: TargetPayload) => {
      if (socket.data.roomId !== roomId) return;
      io.to(target).emit("sdp-offer", { from: socket.id, description, roomId });
    });
    socket.on("sdp-answer", ({ roomId, target, description }: TargetPayload) => {
      if (socket.data.roomId !== roomId) return;
      io.to(target).emit("sdp-answer", { from: socket.id, description, roomId });
    });
    socket.on("ice-candidate", ({ roomId, target, candidate }: TargetPayload) => {
      if (socket.data.roomId !== roomId) return;
      io.to(target).emit("ice-candidate", { from: socket.id, candidate, roomId });
    });

    socket.on("disconnecting-room", async ({ roomId }: RoomPayload) => {
      if (socket.data.roomId !== roomId) return;
      await removeMember(roomId, socket.id);
      socket.to(roomId).emit("participant-left", socket.id);
      await socket.leave(roomId);
    });

    socket.on("disconnect", async () => {
      for (const roomId of socket.rooms) {
        if (roomId !== socket.id) {
          await removeMember(roomId, socket.id);
          socket.to(roomId).emit("participant-left", socket.id);
        }
      }
    });
  });
}
