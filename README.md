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

Required environment variables: `DATABASE_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `OWNER_APPROVAL_EMAIL`, `APP_URL`, and `SIGNALING_SECRET`. Trusted execution additionally requires `ACTION_RUNNER_URL` and `ACTION_RUNNER_SECRET`.

Run `npx prisma migrate dev` locally and `npx prisma migrate deploy` in production.

## Architecture

The UI follows the supplied architecture documents: restricted dashboard, Host/App agent planning, strict risk tiers, human approval for high-risk actions, trusted execution status, security events and audit presentation.

The communication product shell includes Messages, Calls, Files and Tasks. Socket.IO/Redis signaling, WebRTC P2P/SFU, coturn and S3 require their corresponding infrastructure and credentials. Governed execution is intentionally fail-closed: actions are never reported as successful unless a real trusted runner acknowledges them. Native Android/Windows control and social-platform automation are separate runner/connectors and are not created by the web control plane alone.

## Security

Secrets stay server-side. Do not put API keys or OAuth tokens in browser code. High-risk actions remain behind explicit confirmation, and external platform automation should use official APIs and rate limits.
