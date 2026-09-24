import { getWorker } from "./worker";

let router: import("mediasoup").types.Router | undefined;

export async function getRouter() {
  if (router && !router.closed) return router;
  const worker = await getWorker();
  router = await worker.createRouter({
    mediaCodecs: [
      { kind: "audio", mimeType: "audio/opus", clockRate: 48000, channels: 2 },
      { kind: "video", mimeType: "video/VP8", clockRate: 90000 }
    ]
  });
  return router;
}
