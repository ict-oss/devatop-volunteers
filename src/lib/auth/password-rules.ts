/** What a new password must be. Plain functions, no browser or server code, so the same rule is tested and reused. Messages never echo the password. */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72; // longer is silently cut by the hashing, so refuse it instead
const COMMON = new Set(["password", "password1", "12345678", "123456789", "1234567890", "qwerty123", "iloveyou", "11111111", "abcd1234", "letmein123", "devatop123", "welcome123"]);

export function checkPassword(password: string, email = ""): string | null {
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (password.length > PASSWORD_MAX) return `Use at most ${PASSWORD_MAX} characters.`;
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Use letters and at least one number.";
  if (COMMON.has(password.toLowerCase())) return "That password is too easy to guess. Pick another.";
  const local = email.split("@")[0]?.toLowerCase();
  if (local && local.length >= 4 && password.toLowerCase().includes(local)) return "Do not use your email name inside your password.";
  return null;
}
