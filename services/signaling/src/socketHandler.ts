import type { Server, Socket } from "socket.io";
import { addMember, listMembers, removeMember } from "./roomManager";

type RoomPayload = { roomId: string };
type TargetPayload = RoomPayload & { target: string; description?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };

export function registerSocketHandlers(io: Server) {
  io.on("connection", (socket: Socket) => {
    socket.on("join-room", async ({ roomId }: RoomPayload) => {
      await socket.join(roomId);
      await addMember(roomId, socket.id);
      const existing = (await listMembers(roomId)).filter(id => id !== socket.id);
      socket.emit("room-members", existing);
      socket.to(roomId).emit("participant-joined", socket.id);
    });

    socket.on("sdp-offer", ({ roomId, target, description }: TargetPayload) => {
      io.to(target).emit("sdp-offer", { from: socket.id, description, roomId });
    });

    socket.on("sdp-answer", ({ roomId, target, description }: TargetPayload) => {
      io.to(target).emit("sdp-answer", { from: socket.id, description, roomId });
    });

    socket.on("ice-candidate", ({ roomId, target, candidate }: TargetPayload) => {
      io.to(target).emit("ice-candidate", { from: socket.id, candidate, roomId });
    });

    socket.on("disconnecting-room", async ({ roomId }: RoomPayload) => {
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
