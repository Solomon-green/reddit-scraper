import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "jr_session";

// The session token is derived from the password, so changing
// DASHBOARD_PASSWORD on Vercel logs every browser out.
export function sessionToken(password = process.env.DASHBOARD_PASSWORD ?? "") {
  return createHmac("sha256", password).update("job-radar-session").digest("hex");
}

export function isValidSession(token: string | undefined) {
  if (!token || !process.env.DASHBOARD_PASSWORD) return false;
  const expected = Buffer.from(sessionToken());
  const given = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
