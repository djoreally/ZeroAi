"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { authClient } from "../../lib/auth-client";

export default function LoginPage(){
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);

  async function submit(event:FormEvent){
    event.preventDefault();
    setBusy(true); setMessage("");
    const result=await authClient.signIn.email({email,password,callbackURL:"/dashboard"});
    setBusy(false);
    if(result.error){setMessage(result.error.message ?? "Unable to sign in.");return;}
    window.location.assign("/dashboard");
  }

  return <main className="auth-wrap"><section className="auth-card">
    <div className="eyebrow">ZeroAI Console</div>
    <h1>Sign in</h1>
    <p className="muted">Access your workspaces, executions, memory, evidence and API keys.</p>
    {message && <div className="notice error">{message}</div>}
    <form onSubmit={submit}>
      <div className="field"><label>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></div>
      <div className="field"><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} /></div>
      <button className="button primary full" disabled={busy}>{busy?"Signing in…":"Sign in"}</button>
    </form>
    <p className="muted">New to ZeroAI? <Link href="/signup">Create an account</Link>.</p>
  </section></main>;
}
