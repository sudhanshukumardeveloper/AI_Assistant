import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const fromAddress = () => process.env.EMAIL_FROM || "Aegis Access <onboarding@resend.dev>";

export async function sendAccessRequestEmail(input: { requestId: string; requesterName: string; requesterEmail: string; approvalToken: string }) {
  if (!resend) throw new Error("RESEND_API_KEY is not configured");
  const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const approveUrl = `${base}/api/access/admin/approve?token=${encodeURIComponent(input.approvalToken)}`;
  const denyUrl = `${base}/api/access/admin/deny?token=${encodeURIComponent(input.approvalToken)}`;
  return resend.emails.send({
    from: fromAddress(), to: process.env.OWNER_APPROVAL_EMAIL || "", subject: `Aegis access request from ${input.requesterEmail}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:32px;background:#0b0f17;color:#e8edf7"><h2>Aegis access request</h2><p><b>${escapeHtml(input.requesterName)}</b> (${escapeHtml(input.requesterEmail)}) requested access.</p><p>Review this request before access is granted.</p><p><a href="${approveUrl}" style="display:inline-block;padding:12px 18px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px">Approve access</a> <a href="${denyUrl}" style="display:inline-block;padding:12px 18px;background:#2a364f;color:#fff;text-decoration:none;border-radius:8px">Deny</a></p><small>Request ID: ${escapeHtml(input.requestId)}</small></div>`,
  });
}

export async function sendApprovedAccessEmail(input: { email: string; name: string; requestToken: string }) {
  if (!resend) throw new Error("RESEND_API_KEY is not configured");
  const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const accessUrl = `${base}/api/access/verify?token=${encodeURIComponent(input.requestToken)}`;
  return resend.emails.send({
    from: fromAddress(), to: input.email, subject: "Your Aegis access has been approved",
    html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:32px;background:#0b0f17;color:#e8edf7"><h2>Access approved</h2><p>Hello ${escapeHtml(input.name)}, your Aegis account has been approved.</p><p><a href="${accessUrl}" style="display:inline-block;padding:12px 18px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px">Enter Aegis</a></p></div>`,
  });
}

function escapeHtml(value: string) { return value.replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c] || c)); }
