import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

export type SignalEvent =
  | { type: "participant-joined"; socketId: string }
  | { type: "participant-left"; socketId: string }
  | { type: "sdp-offer"; from: string; description: RTCSessionDescriptionInit }
  | { type: "sdp-answer"; from: string; description: RTCSessionDescriptionInit }
  | { type: "ice-candidate"; from: string; candidate: RTCIceCandidateInit };

export function useSignaling(roomId: string) {
  const [events, setEvents] = useState<SignalEvent[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    let active = true;
    let client: Socket | null = null;
    (async () => {
      const response = await fetch("/api/signaling-token", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ roomId }) });
      if (!response.ok) return;
      const { token } = await response.json();
      if (!active) return;
      client = io(process.env.NEXT_PUBLIC_SIGNALING_URL || "http://localhost:4001", { transports: ["websocket"], auth: { token } });
      setSocket(client);
      client.on("connect_error", () => setSocket(null));
      client.on("participant-joined", (socketId: string) => setEvents(prev => [...prev, { type: "participant-joined", socketId }]));
      client.on("participant-left", (socketId: string) => setEvents(prev => [...prev, { type: "participant-left", socketId }]));
      client.on("sdp-offer", (payload) => setEvents(prev => [...prev, { type: "sdp-offer", from: payload.from, description: payload.description }]));
      client.on("sdp-answer", (payload) => setEvents(prev => [...prev, { type: "sdp-answer", from: payload.from, description: payload.description }]));
      client.on("ice-candidate", (payload) => setEvents(prev => [...prev, { type: "ice-candidate", from: payload.from, candidate: payload.candidate }]));
    })();
    return () => { active = false; if (client) { client.emit("disconnecting-room", { roomId }); client.disconnect(); } };
  }, [roomId]);

  const emit = (event: string, payload: unknown) => socket?.emit(event, { roomId, ...(payload as object) });
  return { emit, events, socket };
}
