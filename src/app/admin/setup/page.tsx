"use client";

import { FormEvent, useState } from "react";

export default function AdminSetupPage(){
  const [email,setEmail]=useState("");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);

  async function submit(event:FormEvent){
    event.preventDefault();
    setBusy(true); setMessage("");
    const response=await fetch("/api/v1/admin/password-setup/request",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({email})
    });
    const body=await response.json().catch(()=>({}));
    setBusy(false);
    setMessage(body.message ?? "If this is the configured platform administrator, a secure setup link has been sent.");
  }

  return <main className="auth-wrap"><section className="auth-card">
    <div className="eyebrow">Platform Bootstrap</div>
    <h1>Set admin password</h1>
    <p className="muted">This one-time path is only for the pre-provisioned ZeroAI platform administrator.</p>
    {message && <div className="notice">{message}</div>}
    <form onSubmit={submit}>
      <div className="field"><label>Admin email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></div>
      <button className="button primary full" disabled={busy}>{busy?"Sending…":"Send secure setup link"}</button>
    </form>
  </section></main>;
}
