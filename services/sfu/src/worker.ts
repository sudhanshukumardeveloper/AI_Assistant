import * as mediasoup from "mediasoup";

let worker: mediasoup.types.Worker | undefined;

export async function getWorker() {
  if (worker && !worker.closed) return worker;
  worker = await mediasoup.createWorker({
    logLevel: "warn",
    rtcMinPort: Number(process.env.RTC_MIN_PORT || 40000),
    rtcMaxPort: Number(process.env.RTC_MAX_PORT || 49999)
  });
  worker.on("died", () => {
    worker = undefined;
    setTimeout(() => void getWorker(), 2000);
  });
  return worker;
}
