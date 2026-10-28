/**
 * Local end-to-end harness (dev only). Runs the REAL migrations and seed in an in-memory Postgres (PGlite, served over a socket),
 * plus a tiny fake of Supabase Auth and of Brevo, so the whole app can be driven in a browser.
 *   npx tsx tools/e2e/harness.ts          (keeps running; prints the environment the app needs)
 * The code "123456" is accepted for email codes and authenticator codes. Emails are captured at GET /__mails.
 */
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { createHmac, randomUUID } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { seedOnce } from "../../src/lib/db/seed";

const PG_PORT = Number(process.env.E2E_PG_PORT ?? 54329), AUTH_PORT = Number(process.env.E2E_AUTH_PORT ?? 54330), SECRET = "e2e-secret";
const SUPER_ADMINS = ["admin1@devatop.org", "admin2@devatop.org"];

const b64 = (o: object | Buffer) => Buffer.from(o instanceof Buffer ? o : JSON.stringify(o)).toString("base64url");
const sign = (claims: object) => { const head = b64({ alg: "HS256", typ: "JWT" }), body = b64(claims); return `${head}.${body}.${createHmac("sha256", SECRET).update(`${head}.${body}`).digest("base64url")}`; };
const verify = (t: string) => { const [h, b, s] = t.split("."); if (!s || createHmac("sha256", SECRET).update(`${h}.${b}`).digest("base64url") !== s) return null; const c = JSON.parse(Buffer.from(b, "base64url").toString()); return c.exp * 1000 > Date.now() ? c : null; };

async function main() {
  const pg = new PGlite();
  await pg.exec(fs.readFileSync("tests/db/supabase-stub.sql", "utf8"));
  for (const f of fs.readdirSync("src/lib/db/migrations").filter((x) => x.endsWith(".sql")).sort()) await pg.exec(fs.readFileSync(path.join("src/lib/db/migrations", f), "utf8"));
  await seedOnce(async (text, params) => pg.query(text, params as unknown[]));
  const ids = new Map<string, string>();
  for (const email of SUPER_ADMINS) {
    const id = ((await pg.query<{ id: string }>("insert into auth.users (email) values ($1) returning id", [email])).rows[0]).id; ids.set(email, id);
    await pg.query("insert into admin_roles (user_id, role) values ($1,'super_admin')", [id]);
  }
  await new PGLiteSocketServer({ db: pg, port: PG_PORT, host: "127.0.0.1" }).start();

  // The fake auth and the app share this one in-memory database, and it cannot take two queries at the same instant: if one collides, try again.
  const q: typeof pg.query = (async (...a: Parameters<typeof pg.query>) => { for (let i = 0; ; i++) { try { return await pg.query(...a); } catch (e) { if (i >= 4) throw e; await new Promise((r) => setTimeout(r, 120 * (i + 1))); } } }) as typeof pg.query;

  const factors = new Map<string, { id: string; status: "verified" | "unverified" }[]>(); // per user
  const refresh = new Map<string, { id: string; aal: "aal1" | "aal2" }>();
  const mails: unknown[] = [];
  const passwords = new Map<string, string>(); // email -> password (the real Supabase stores a hash)
  const buckets = new Set<string>(), files = new Map<string, { data: Buffer; type: string }>();

  const userObj = (id: string, email: string) => ({ id, aud: "authenticated", role: "authenticated", email, email_confirmed_at: new Date().toISOString(), phone: "", app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {}, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    factors: (factors.get(id) ?? []).map((f) => ({ id: f.id, factor_type: "totp", status: f.status, friendly_name: "Devatop admin", created_at: new Date().toISOString(), updated_at: new Date().toISOString() })) });
  const session = (id: string, email: string, aal: "aal1" | "aal2") => {
    const now = Math.floor(Date.now() / 1000), rt = `rt-${randomUUID()}`; refresh.set(rt, { id, aal });
    const access = sign({ iss: "e2e", sub: id, aud: "authenticated", role: "authenticated", email, aal, amr: [{ method: aal === "aal2" ? "totp" : "otp", timestamp: now }], session_id: "s-" + id, iat: now, exp: now + 3600, app_metadata: {}, user_metadata: {} });
    return { access_token: access, token_type: "bearer", expires_in: 3600, expires_at: now + 3600, refresh_token: rt, user: userObj(id, email) };
  };
  const emailOf = async (id: string) => (await q<{ email: string }>("select email from auth.users where id=$1", [id])).rows[0]?.email;

  http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://x");
    res.setHeader("access-control-allow-origin", "*"); res.setHeader("access-control-allow-headers", "*"); res.setHeader("access-control-allow-methods", "*");
    if (req.method === "OPTIONS") { res.writeHead(204).end(); return; }
    const chunks: Buffer[] = []; for await (const c of req) chunks.push(c as Buffer);
    const buf = Buffer.concat(chunks), isJson = /json/.test(String(req.headers["content-type"] ?? "")) || !req.headers["content-type"];
    const body = buf.length && isJson ? JSON.parse(buf.toString()) : {};
    const send = (code: number, o: unknown) => { res.writeHead(code, { "content-type": "application/json" }).end(JSON.stringify(o)); };
    const tok = (req.headers.authorization ?? "").replace(/^Bearer /, ""); const claims = tok ? verify(tok) : null;
    try {
      const p = url.pathname;
      if (p === "/__mails") return send(200, mails);
      if (p === "/brevo/v3/smtp/email") { mails.push({ to: body.to?.[0]?.email, subject: body.subject, text: body.textContent, at: Date.now() }); return send(201, { messageId: "x" }); }
      // fake Supabase Storage: just enough for Admin > Site images (buckets, signed upload, list, remove, public download)
      if (p.startsWith("/storage/v1/")) {
        const sp = p.slice("/storage/v1/".length);
        if (sp === "bucket" && req.method === "POST") { if (buckets.has(body.name)) return send(409, { statusCode: "409", error: "Duplicate", message: "The resource already exists" }); buckets.add(body.name); return send(200, { name: body.name }); }
        if (sp.startsWith("bucket/") && req.method === "PUT") return send(200, { message: "ok" });
        let m2 = sp.match(/^object\/upload\/sign\/([^/]+)\/(.+)$/);
        if (m2 && req.method === "POST") return send(200, { url: `/object/upload/sign/${m2[1]}/${m2[2]}?token=t-${randomUUID()}` });
        if (m2 && req.method === "PUT") {
          const ct = String(req.headers["content-type"] ?? ""), b = ct.match(/boundary=(.+)$/)?.[1];
          let data = buf, type = "application/octet-stream";
          if (b) { const part = buf.toString("binary").split("--" + b).find((x) => x.includes("filename")); if (part) { const head = part.indexOf("\r\n\r\n"); type = part.match(/Content-Type: ([^\r\n]+)/i)?.[1] ?? type; data = Buffer.from(part.slice(head + 4).replace(/\r\n$/, ""), "binary"); } }
          files.set(`${m2[1]}/${decodeURIComponent(m2[2])}`, { data, type }); return send(200, { Key: `${m2[1]}/${m2[2]}` });
        }
        m2 = sp.match(/^object\/list\/([^/]+)$/);
        if (m2) return send(200, [...files.entries()].filter(([k]) => k.startsWith(`${m2![1]}/${body.prefix}/`) && k.split("/").pop()!.includes(body.search ?? "")).map(([k, f]) => ({ name: k.split("/").pop(), metadata: { size: f.data.length } })));
        m2 = sp.match(/^object\/([^/]+)$/);
        if (m2 && req.method === "DELETE") { for (const x of body.prefixes ?? []) files.delete(`${m2[1]}/${x}`); return send(200, []); }
        m2 = sp.match(/^object\/public\/([^/]+)\/(.+)$/);
        if (m2) { const f = files.get(`${m2[1]}/${decodeURIComponent(m2[2])}`); if (!f) return send(404, { message: "not found" }); res.writeHead(200, { "content-type": f.type, "content-length": f.data.length }).end(f.data); return; }
        return send(404, { msg: `fake storage: no route ${req.method} ${p}` });
      }
      if (p === "/auth/v1/signup" || (p === "/auth/v1/token" && url.searchParams.get("grant_type") === "password")) await new Promise((r) => setTimeout(r, 350)); // a little latency, so the "working" screens can be seen and tested
      if (p === "/auth/v1/signup" && req.method === "POST") {
        const email = String(body.email ?? "").toLowerCase(); if (!email || !body.password) return send(422, { code: 422, error_code: "validation_failed", msg: "Signup requires a valid password" });
        const existing = (await q<{ id: string }>("select id from auth.users where lower(email)=$1", [email])).rows[0];
        if (existing && passwords.has(email)) return send(422, { code: 422, error_code: "user_already_exists", msg: "User already registered" });
        // an account that was seeded without a password (the first Super Admins) gets its password here, like a first sign-up
        const id = existing?.id ?? (await q<{ id: string }>("insert into auth.users (email) values ($1) returning id", [email])).rows[0].id;
        passwords.set(email, String(body.password)); return send(200, session(id, email, "aal1"));
      }
      if (p === "/auth/v1/user" && req.method === "PUT" && claims) { passwords.set(String(claims.email).toLowerCase(), String(body.password)); return send(200, userObj(claims.sub, claims.email)); }
      if (p === "/auth/v1/recover") return send(200, {});
      if (p === "/auth/v1/otp") return send(200, {});
      if (p === "/auth/v1/verify") {
        if (body.token !== "123456") return send(403, { code: 403, error_code: "otp_expired", msg: "Token has expired or is invalid" });
        let id = (await q<{ id: string }>("select id from auth.users where email=$1", [body.email])).rows[0]?.id;
        if (!id) id = (await q<{ id: string }>("insert into auth.users (email) values ($1) returning id", [body.email])).rows[0].id;
        return send(200, session(id, body.email, "aal1"));
      }
      if (p === "/auth/v1/user") { if (!claims) return send(401, { code: 401, msg: "invalid JWT" }); return send(200, userObj(claims.sub, claims.email)); }
      if (p === "/auth/v1/token" && url.searchParams.get("grant_type") === "password") {
        const email = String(body.email ?? "").toLowerCase(); const row = (await q<{ id: string }>("select id from auth.users where lower(email)=$1", [email])).rows[0];
        if (!row || passwords.get(email) !== body.password) return send(400, { code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" });
        return send(200, session(row.id, email, "aal1"));
      }
      if (p === "/auth/v1/token") { const r = refresh.get(body.refresh_token); if (!r) return send(400, { error: "invalid_grant" }); return send(200, session(r.id, (await emailOf(r.id))!, r.aal)); }
      if (p === "/auth/v1/logout") return res.writeHead(204).end();
      if (p === "/auth/v1/factors" && req.method === "POST" && claims) {
        const f = { id: randomUUID(), status: "unverified" as const }; factors.set(claims.sub, [...(factors.get(claims.sub) ?? []), f]);
        return send(200, { id: f.id, type: "totp", friendly_name: body.friendly_name, totp: { qr_code: "data:image/svg+xml;utf-8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'/>", secret: "JBSWY3DPEHPK3PXP", uri: "otpauth://totp/x" } });
      }
      const m = p.match(/^\/auth\/v1\/factors\/([^/]+)(?:\/(challenge|verify))?$/);
      if (m && claims) {
        if (req.method === "DELETE") { factors.set(claims.sub, (factors.get(claims.sub) ?? []).filter((f) => f.id !== m[1])); return send(200, { id: m[1] }); }
        if (m[2] === "challenge") return send(200, { id: randomUUID(), type: "totp", expires_at: Math.floor(Date.now() / 1000) + 300 });
        if (m[2] === "verify") {
          if (body.code !== "123456") return send(400, { code: 400, error_code: "mfa_verification_failed", msg: "Invalid TOTP code entered" });
          factors.set(claims.sub, (factors.get(claims.sub) ?? []).map((f) => (f.id === m[1] ? { ...f, status: "verified" as const } : f)));
          return send(200, session(claims.sub, claims.email, "aal2"));
        }
      }
      const del = p.match(/^\/auth\/v1\/admin\/users\/([^/]+)$/);
      if (del && req.method === "DELETE") { await q("delete from auth.users where id=$1", [del[1]]); return send(200, {}); }
      send(404, { msg: `fake auth: no route ${req.method} ${p}` });
    } catch (e) { send(500, { msg: (e as Error).message }); }
  }).listen(AUTH_PORT, "127.0.0.1");

  console.log(JSON.stringify({ ready: true, DATABASE_URL: `postgres://postgres@127.0.0.1:${PG_PORT}/postgres`, NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${AUTH_PORT}`, BREVO_API_URL: `http://127.0.0.1:${AUTH_PORT}/brevo`, admins: SUPER_ADMINS }));
}
main().catch((e) => { console.error(e); process.exit(1); });
