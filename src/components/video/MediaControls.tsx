"use client";

import { useState } from "react";

export default function MediaControls({ stream }: { stream: MediaStream | null }) {
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  const toggleAudio = () => {
    stream?.getAudioTracks().forEach(track => { track.enabled = muted; });
    setMuted(v => !v);
  };

  const toggleVideo = () => {
    stream?.getVideoTracks().forEach(track => { track.enabled = cameraOff; });
    setCameraOff(v => !v);
  };

  return (
    <div className="fixed bottom-6 left-1/2 flex -translate-x-1/2 gap-2 rounded-2xl border border-slate-700 bg-slateglass/95 p-2">
      <button onClick={toggleAudio} className="rounded-xl px-4 py-2">{muted ? "Unmute" : "Mute"}</button>
      <button onClick={toggleVideo} className="rounded-xl px-4 py-2">{cameraOff ? "Camera on" : "Camera off"}</button>
      <button onClick={() => stream?.getTracks().forEach(t => t.stop())} className="rounded-xl bg-crimson px-4 py-2">Hang up</button>
    </div>
  );
}
