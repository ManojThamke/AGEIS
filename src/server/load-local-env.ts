import { config } from "dotenv";

export function loadLocalEnvironment() {
  const inherited = { ...process.env };
  config({ path: ".env", override: true });
  config({ path: ".env.local", override: true });
  Object.assign(process.env, inherited);
}
