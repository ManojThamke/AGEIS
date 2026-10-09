import { getPrincipal } from "./session";

export async function requirePrincipal() {
  const principal = await getPrincipal();
  if (!principal) throw new Response("Authentication required", { status: 401 });
  return principal;
}
