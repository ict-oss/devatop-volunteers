export type Mail = { from: { name: string; email: string }; to: { email: string; name?: string }; subject: string; html: string; text: string };
export type Sender = (m: Mail) => Promise<{ ok: boolean; skipped?: boolean }>;

/**
 * Sends through Brevo's transactional API (an official Devatop sender must be verified there).
 * Without BREVO_API_KEY nothing is sent: in development that is fine, in production the failure is recorded in email_log.
 * Never logs an address, a subject or a body (rule 5).
 */
export const sendViaBrevo: Sender = async (m) => {
  const key = process.env.BREVO_API_KEY;
  if (!key) return { ok: false, skipped: true };
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ sender: m.from, to: [m.to], subject: m.subject, htmlContent: m.html, textContent: m.text }),
    signal: AbortSignal.timeout(10_000),
  });
  return { ok: res.ok };
};
