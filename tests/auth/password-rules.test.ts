import { describe, expect, it } from "vitest";
import { checkPassword, PASSWORD_MAX } from "../../src/lib/auth/password-rules";

describe("password rules", () => {
  it("accepts a reasonable password", () => { expect(checkPassword("Maple-River-42", "amaka@example.com")).toBeNull(); });
  it("refuses short, letters-only, numbers-only and over-long passwords", () => {
    expect(checkPassword("Ab1")).toMatch(/at least 8/);
    expect(checkPassword("abcdefghij")).toMatch(/letters and at least one number/);
    expect(checkPassword("1234567890123")).toMatch(/letters and at least one number/);
    expect(checkPassword("a1".repeat(PASSWORD_MAX))).toMatch(/at most/);
  });
  it("refuses the most common passwords and ones that contain the email name", () => {
    expect(checkPassword("Password1")).toMatch(/too easy/);
    expect(checkPassword("devatop123")).toMatch(/too easy/);
    expect(checkPassword("amakaobi2026", "amakaobi@example.com")).toMatch(/email name/);
  });
  it("never repeats the password in its message", () => { expect(checkPassword("Sh0rt")).not.toContain("Sh0rt"); });
});
