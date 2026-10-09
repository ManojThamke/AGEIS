import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export type Principal = { userId: string; organizationId: string; role: string };
const COOKIE = "aegis_session";
function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters");
  return value;
}
function sign(value: string) { return createHmac("sha256", secret()).update(value).digest("base64url"); }

export async function setSession(principal: Principal) {
  const expires = Date.now() + 1000 * 60 * 60 * 12;
  const body = Buffer.from(JSON.stringify({ ...principal, expires })).toString("base64url");
  (await cookies()).set(COOKIE, `${body}.${sign(body)}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 12 });
}
export async function getPrincipal(): Promise<Principal | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = Buffer.from(sign(body)); const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const value = JSON.parse(Buffer.from(body, "base64url").toString()) as Principal & { expires: number };
    if (value.expires < Date.now() || !value.userId || !value.organizationId) return null;
    return { userId: value.userId, organizationId: value.organizationId, role: value.role };
  } catch { return null; }
}
