import { describe, expect, it } from "vitest";
import { toApplication } from "../../src/lib/view/applications";
import { ageFor } from "../../src/lib/store";
import type { QueueRow } from "../../src/lib/services/review";

const row = (o: Partial<QueueRow> = {}): QueueRow => ({
  id: "a1", userId: "u1", stage: "submitted", submittedAt: "2026-10-20T10:00:00.000Z", first: "Tobi", last: "Ade", state: "Lagos", lga: "Ikeja",
  skills: ["Design"], languages: ["English"], availability: "Weekends", email: null, phone: null, dob: null, ageYears: 16,
  guardianVerified: false, guardianName: null, departmentIds: ["d1"], consents: [{ kind: "code_of_conduct", version: "conduct-v1" }, { kind: "photo_media", version: "media-v1" }], ...o,
});

describe("review screen view-model", () => {
  it("maps stages and consent kinds, and keeps hidden details empty rather than invented", () => {
    const a = toApplication(row({ stage: "needs_info" }));
    expect(a.stage).toBe("Needs info");
    expect(a.email).toBe(""); expect(a.dob).toBe("");
    expect(a.consents.map((c) => c.key)).toEqual(["conduct", "media"]);
    expect(a.departments).toEqual(["d1"]);
  });
  it("under-18 gets a guardian block (unverified until the database says so); adults get none", () => {
    expect(toApplication(row()).guardian).toEqual({ name: "", contact: "", verified: false });
    expect(toApplication(row({ guardianVerified: true, guardianName: "Mrs A" })).guardian).toMatchObject({ name: "Mrs A", verified: true });
    expect(toApplication(row({ ageYears: 30 })).guardian).toBeUndefined();
  });
  it("age comes from the database figure even when the date of birth is hidden", () => {
    expect(ageFor(toApplication(row({ ageYears: 16, dob: null })))).toBe(16);
    expect(ageFor({ dob: "2000-01-01" })).toBeGreaterThan(20); // prototype: worked out from the date
  });
});
