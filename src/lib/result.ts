/** What a server action returns to the browser: data, or a plain-language reason (never personal data, rule 5). */
export type Result<T = undefined> = { ok: true; data: T } | { ok: false; code: string; message: string; fields?: Record<string, string> };
