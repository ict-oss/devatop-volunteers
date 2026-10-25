import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const authProxy = vi.fn(async () => new Response("guarded"));
vi.mock("@/lib/auth/proxy", () => ({ authProxy }));

afterEach(() => { vi.unstubAllEnvs(); authProxy.mockClear(); });

describe("src/proxy.ts: sign-in protection stays off until AUTH_ENABLED=true (plan B)", () => {
  it("lets every request through untouched while the prototype runs on sample data", async () => {
    const { proxy } = await import("../../src/proxy");
    for (const v of [undefined, "", "false", "TRUE", "1"]) {
      if (v === undefined) vi.stubEnv("AUTH_ENABLED", ""); else vi.stubEnv("AUTH_ENABLED", v);
      const res = await proxy(new NextRequest("http://localhost:3000/admin"));
      expect(res.headers.get("x-middleware-next")).toBe("1");
    }
    expect(authProxy).not.toHaveBeenCalled();
  });
  it("hands the request to the real guard once AUTH_ENABLED=true", async () => {
    vi.stubEnv("AUTH_ENABLED", "true");
    const { proxy } = await import("../../src/proxy");
    const res = await proxy(new NextRequest("http://localhost:3000/admin"));
    expect(await res.text()).toBe("guarded");
    expect(authProxy).toHaveBeenCalledOnce();
  });
  it("exports a matcher that skips static files", async () => {
    const { config } = await import("../../src/proxy");
    expect(config.matcher[0]).toContain("_next/static");
  });
});
