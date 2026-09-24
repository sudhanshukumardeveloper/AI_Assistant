"use client";

import { FormEvent, useState } from "react";
import { usePresignedUpload } from "@/hooks/usePresignedUpload";

export default function ChatWindow({ roomId }: { roomId: string }) {
  const [message, setMessage] = useState("");
  const { progress, uploading, upload } = usePresignedUpload();

  const send = (e: FormEvent) => {
    e.preventDefault();
    setMessage("");
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col p-4">
      <header className="surface rounded-xl p-4">
        <h1 className="font-semibold">Room {roomId}</h1>
        <p className="text-sm text-slate-400">Online · realtime messaging</p>
      </header>
      <section className="my-4 flex-1 space-y-3 rounded-xl border border-slate-800 p-4">
        <div className="rounded-lg bg-slateglass p-3">Welcome to the room.</div>
      </section>
      <form onSubmit={send} className="surface flex gap-2 rounded-xl p-3">
        <input value={message} onChange={e => setMessage(e.target.value)}
          className="flex-1 bg-transparent outline-none" placeholder="Write a message..." />
        <label className="cursor-pointer rounded-lg border border-slate-600 px-3 py-2">
          Attach
          <input type="file" className="hidden" onChange={async e => {
            const file = e.target.files?.[0];
            if (file) await upload(file);
          }} />
        </label>
        <button className="rounded-lg bg-indigo px-4 py-2">Send</button>
      </form>
      {uploading && <p className="mt-2 font-mono text-xs text-slate-400">Uploading {progress}%</p>}
    </main>
  );
}
