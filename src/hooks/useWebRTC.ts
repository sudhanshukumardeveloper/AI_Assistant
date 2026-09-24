import { useCallback, useEffect, useRef, useState } from "react";
import { useSignaling } from "./useSignaling";

export function useWebRTC(roomId: string) {
  const { emit, events } = useSignaling(roomId);
  const peers = useRef(new Map<string, RTCPeerConnection>());
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});

  const createPeer = useCallback((socketId: string) => {
    const existing = peers.current.get(socketId);
    if (existing) return existing;
    const pc = new RTCPeerConnection();
    pc.onicecandidate = e => {
      if (e.candidate) emit("ice-candidate", { target: socketId, candidate: e.candidate.toJSON() });
    };
    pc.ontrack = e => {
      const stream = e.streams[0];
      if (stream) setRemoteStreams(prev => ({ ...prev, [socketId]: stream }));
    };
    if (localStream) localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    peers.current.set(socketId, pc);
    return pc;
  }, [emit, localStream]);

  useEffect(() => {
    let active = true;
    (async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      if (active) setLocalStream(stream);
      else stream.getTracks().forEach(t => t.stop());
    })().catch(() => undefined);
    return () => {
      active = false;
      localStream?.getTracks().forEach(t => t.stop());
      peers.current.forEach(pc => pc.close());
      peers.current.clear();
    };
  }, []);

  useEffect(() => {
    const latest = events.at(-1);
    if (!latest) return;
    (async () => {
      if (latest.type === "participant-joined") {
        const pc = createPeer(latest.socketId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        emit("sdp-offer", { target: latest.socketId, description: offer });
      }
      if (latest.type === "sdp-offer") {
        const pc = createPeer(latest.from);
        await pc.setRemoteDescription(latest.description);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        emit("sdp-answer", { target: latest.from, description: answer });
      }
      if (latest.type === "sdp-answer") {
        const pc = createPeer(latest.from);
        await pc.setRemoteDescription(latest.description);
      }
      if (latest.type === "ice-candidate") {
        const pc = createPeer(latest.from);
        await pc.addIceCandidate(latest.candidate);
      }
      if (latest.type === "participant-left") {
        peers.current.get(latest.socketId)?.close();
        peers.current.delete(latest.socketId);
        setRemoteStreams(prev => {
          const next = { ...prev };
          delete next[latest.socketId];
          return next;
        });
      }
    })().catch(() => undefined);
  }, [events, createPeer, emit]);

  return { localStream, remoteStreams };
}
