# Project Specification Derived from Supplied Architecture Documents

## 1. Objective
Build a production-grade, high-concurrency multi-modal communication platform with real-time text, presence, audio/video calling, direct cloud media ingestion and telemetry.

## 2. Required design system
- Deep Obsidian: #0B0F17
- Slate Glass surface: #151D2A
- Border: #2A364F
- Indigo: #6366F1
- Electric Violet: #8B5CF6
- Online: #10B981
- Mute/hangup: #EF4444
- UI typography: Inter/Geist
- Logs/telemetry: JetBrains Mono/Courier

## 3. Control plane
Next.js handles application UI and server-only credential APIs. Node.js + Express + Socket.IO handles stateful WebRTC signaling. Redis provides cross-pod pub/sub and room state.

## 4. Media plane
Use P2P mesh for 1–4 participants. Escalate to SFU for 5–100+ participants. Use three simulcast quality layers:
- 1080p / 2.5 Mbps
- 480p / 500 kbps
- 180p / 150 kbps

Use coturn STUN/TURN over TLS/DTLS on port 443 with short-lived HMAC-SHA1 credentials.

## 5. Storage plane
Clients upload directly to S3 with short-lived SigV4 presigned URLs. Files below 100 MB can use single PUT. Larger/video files use multipart upload with 5–10 MB chunks and retry at chunk level.

## 6. Data model
Prisma/PostgreSQL must cover:
- User
- Room
- RoomMember
- Message
- FileAttachment

The Message model uses a room/time index, and room membership and related data use cascading deletes where appropriate.

## 7. Background processing
S3-triggered workers provide malware scanning and media processing. Video processing includes thumbnail extraction, EXIF handling and adaptive HLS transcoding.

## 8. Transport roadmap
Phase 1: authentication, PostgreSQL, Socket.IO signaling and Redis.
Phase 2: direct S3 ingestion and media processors.
Phase 3: hybrid WebRTC P2P/SFU and coturn.
Phase 4: WebTransport with WebSocket fallback and spatial telemetry/map rendering.

## 9. Production hardening checklist
- Replace placeholder identity/authentication checks.
- Add authorization on every room and file operation.
- Add multipart S3 APIs for >100 MB.
- Add durable message persistence in the signaling/message path.
- Add rate limits and abuse controls.
- Add TURN certificate management and secret rotation.
- Add SFU authenticated producer/consumer signaling.
- Add observability: structured logs, metrics, traces and call-quality telemetry.
- Add automated tests, load tests and browser E2E tests.
- Add CI/CD and secret management.
