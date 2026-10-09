"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SignInPage() {
  const router = useRouter();
  const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      router.replace("/");
    } catch (e) { setError(e instanceof Error ? e.message : "Sign-in failed."); } finally { setBusy(false); }
  }
  return <main style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "minmax(320px, 1fr) 1fr" }}>
    <section style={{ background: "var(--navy)", color: "var(--ivory)", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "44px 8vw" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}><div className="brandmark">A</div><span style={{ letterSpacing: ".16em", fontSize: 12 }}>AEGIS <span style={{ color: "#b69b66" }}>AI</span></span></div>
      <div><div className="eyebrow" style={{ color: "#b69b66" }}>Intelligence workbench</div><h1 className="display" style={{ fontSize: "clamp(36px,5vw,64px)", fontWeight: 400, lineHeight: 1.05, maxWidth: 500 }}>Clear thinking for consequential work.</h1><p style={{ color: "#b8c0bb", lineHeight: 1.8, maxWidth: 430 }}>Frame a mission. Follow its work. Keep evidence and decisions in view.</p></div>
      <small style={{ color: "#91a09a" }}>Private workspace · Access controlled</small>
    </section>
    <section style={{ display: "grid", placeItems: "center", padding: 28 }}><form onSubmit={submit} style={{ width: "min(380px,100%)" }}>
      <div style={{ color: "var(--sage)", marginBottom: 20 }}><ShieldCheck size={24} strokeWidth={1.5} /></div><div className="eyebrow">Workspace access</div><h2 className="display" style={{ fontSize: 32, fontWeight: 400, margin: "8px 0 24px" }}>Sign in to AEGIS</h2>
      <label htmlFor="password" style={{ display: "block", fontSize: 12, marginBottom: 8 }}>Demo workspace password</label><input id="password" className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
      {error && <p role="alert" style={{ color: "#9a4a3c", fontSize: 12 }}>{error}</p>}<Button type="submit" disabled={busy} style={{ width: "100%", justifyContent: "center", marginTop: 18 }}>{busy ? "Checking access…" : "Continue"}</Button>
      <p style={{ color: "var(--muted)", fontSize: 11, lineHeight: 1.6, marginTop: 18 }}>Demo access is enabled only when the server is configured with <code>AEGIS_DEMO_MODE=true</code>. No password is sent to the browser from the server.</p>
    </form></section>
  </main>;
}
