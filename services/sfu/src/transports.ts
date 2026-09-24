import type { Router } from "mediasoup/types";

export async function createWebRtcTransport(router: Router) {
  const transport = await router.createWebRtcTransport({
    listenInfos: [
      {
        protocol: "udp",
        ip: process.env.RTC_ANNOUNCED_IP || "127.0.0.1",
        announcedAddress: process.env.RTC_ANNOUNCED_IP || undefined,
        portRange: { min: 40000, max: 49999 }
      }
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true
  });

  return {
    transport,
    iceParameters: transport.iceParameters,
    iceCandidates: transport.iceCandidates,
    dtlsParameters: transport.dtlsParameters
  };
}
