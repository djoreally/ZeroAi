"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { authClient } from "../../lib/auth-client";

export default function SignupPage(){
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);

  async function submit(event:FormEvent){
    event.preventDefault();
    setBusy(true); setMessage("");
    const result=await authClient.signUp.email({name,email,password,callbackURL:"/dashboard"});
    setBusy(false);
    if(result.error){setMessage(result.error.message ?? "Unable to create account.");return;}
    window.location.assign("/dashboard");
  }

  return <main className="auth-wrap"><section className="auth-card">
    <div className="eyebrow">ZeroAI</div>
    <h1>Create account</h1>
    <p className="muted">Regular customer signup. Platform-admin authority is never granted from this flow.</p>
    {message && <div className="notice error">{message}</div>}
    <form onSubmit={submit}>
      <div className="field"><label>Name</label><input value={name} onChange={e=>setName(e.target.value)} required /></div>
      <div className="field"><label>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></div>
      <div className="field"><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} /></div>
      <button className="button primary full" disabled={busy}>{busy?"Creating…":"Create account"}</button>
    </form>
    <p className="muted">Already have an account? <Link href="/login">Sign in</Link>.</p>
  </section></main>;
}
