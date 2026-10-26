import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const authProxy = vi.fn(async () => new Response("guarded"));
vi.mock("@/lib/auth/proxy", () => ({ authProxy }));

describe("src/proxy.ts", () => {
  it("hands every request to the sign-in guard (there is no off switch)", async () => {
    const { proxy } = await import("../../src/proxy");
    const res = await proxy(new NextRequest("http://localhost:3000/admin"));
    expect(await res.text()).toBe("guarded");
    expect(authProxy).toHaveBeenCalledOnce();
  });
  it("skips static files, the manifest, the service worker and the brand images", async () => {
    const { config } = await import("../../src/proxy");
    const re = new RegExp("^" + config.matcher[0].replace(/\\\\/g, "\\") + "$");
    for (const p of ["/_next/static/x.js", "/sw.js", "/manifest.webmanifest", "/offline.html", "/brand/devatop-logo.png", "/photos/hero-1.webp", "/video/loop-tally.mp4"]) expect(re.test(p), p).toBe(false);
    for (const p of ["/admin", "/dashboard", "/apply", "/"]) expect(re.test(p), p).toBe(true);
  });
});
