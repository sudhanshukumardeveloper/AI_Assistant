import { useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";

export type SignalEvent =
  | { type: "participant-joined"; socketId: string }
  | { type: "participant-left"; socketId: string }
  | { type: "sdp-offer"; from: string; description: RTCSessionDescriptionInit }
  | { type: "sdp-answer"; from: string; description: RTCSessionDescriptionInit }
  | { type: "ice-candidate"; from: string; candidate: RTCIceCandidateInit };

export function useSignaling(roomId: string) {
  const [events, setEvents] = useState<SignalEvent[]>([]);
  const socket = useMemo<Socket | null>(() => {
    if (typeof window === "undefined") return null;
    return io(process.env.NEXT_PUBLIC_SIGNALING_URL || "http://localhost:4001", {
      transports: ["websocket"]
    });
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.emit("join-room", { roomId });
    const onEvent = (event: SignalEvent) => setEvents(prev => [...prev, event]);
    socket.on("participant-joined", (socketId: string) => onEvent({ type: "participant-joined", socketId }));
    socket.on("participant-left", (socketId: string) => onEvent({ type: "participant-left", socketId }));
    socket.on("sdp-offer", (payload: SignalEvent & { type: "sdp-offer" }) => onEvent(payload));
    socket.on("sdp-answer", (payload: SignalEvent & { type: "sdp-answer" }) => onEvent(payload));
    socket.on("ice-candidate", (payload: SignalEvent & { type: "ice-candidate" }) => onEvent(payload));
    return () => {
      socket.emit("disconnecting-room", { roomId });
      socket.disconnect();
    };
  }, [roomId, socket]);

  const emit = (event: string, payload: unknown) => socket?.emit(event, { roomId, ...payload as object });
  return { emit, events };
}
