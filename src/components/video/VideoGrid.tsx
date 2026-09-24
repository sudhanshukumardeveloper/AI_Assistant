"use client";

import { useEffect, useRef } from "react";
import { useWebRTC } from "@/hooks/useWebRTC";
import MediaControls from "./MediaControls";

function VideoTile({ stream, muted = false }: { stream: MediaStream; muted?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return <video ref={ref} autoPlay playsInline muted={muted} className="h-full w-full rounded-xl object-cover" />;
}

export default function VideoGrid({ roomId }: { roomId: string }) {
  const { localStream, remoteStreams } = useWebRTC(roomId);
  return (
    <main className="min-h-screen bg-obsidian p-4">
      <div className="grid min-h-[80vh] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {localStream && <div className="surface relative overflow-hidden rounded-xl"><VideoTile stream={localStream} muted /></div>}
        {Object.entries(remoteStreams).map(([id, stream]) => (
          <div key={id} className="surface relative overflow-hidden rounded-xl"><VideoTile stream={stream} /></div>
        ))}
      </div>
      <MediaControls stream={localStream} />
    </main>
  );
}
