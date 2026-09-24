# Aegis — Private Communication Fabric

A restricted Next.js control plane for the supplied zero-trust communication and autonomous-agent architecture.

## Administrator-approved access

Public registration is disabled.

1. A visitor enters a name and email.
2. A short-lived pending request is stored.
3. The administrator receives an approval/deny email at `OWNER_APPROVAL_EMAIL`.
4. Approval generates a new one-time access token.
5. The requester receives the secure access link by email.
6. The link creates an HttpOnly session cookie.

Required environment variables: `DATABASE_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `OWNER_APPROVAL_EMAIL`, and `APP_URL`.

Run `npx prisma migrate dev` locally and `npx prisma migrate deploy` in production.

## Architecture

The UI follows the supplied architecture documents: restricted dashboard, Host/App agent planning, strict risk tiers, human approval for high-risk actions, trusted execution status, security events and audit presentation.

The communication product shell includes Messages, Calls, Files and Tasks. Actual Socket.IO/Redis signaling, WebRTC P2P/SFU, coturn, S3 processing and native Android/Windows runners require their corresponding backend infrastructure and credentials before those capabilities become operational.

## Security

Secrets stay server-side. Do not put API keys or OAuth tokens in browser code. High-risk actions remain behind explicit confirmation, and external platform automation should use official APIs and rate limits.
