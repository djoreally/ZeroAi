"use client";

import { FormEvent, useState } from "react";
import { authClient } from "../../../lib/auth-client";

export default function ResetPasswordPage(){
  const [password,setPassword]=useState("");
  const [confirm,setConfirm]=useState("");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);

  async function submit(event:FormEvent){
    event.preventDefault();
    if(password!==confirm){setMessage("Passwords do not match.");return;}
    const token=new URLSearchParams(window.location.search).get("token");
    if(!token){setMessage("This setup link is missing or invalid.");return;}
    setBusy(true);
    const result=await authClient.resetPassword({newPassword:password,token});
    setBusy(false);
    if(result.error){setMessage(result.error.message ?? "Unable to set password.");return;}
    window.location.assign("/login");
  }

  return <main className="auth-wrap"><section className="auth-card">
    <div className="eyebrow">Platform Bootstrap</div>
    <h1>Create your password</h1>
    <p className="muted">Choose the password for your pre-provisioned platform-admin identity.</p>
    {message && <div className="notice error">{message}</div>}
    <form onSubmit={submit}>
      <div className="field"><label>New password</label><input type="password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)} /></div>
      <div className="field"><label>Confirm password</label><input type="password" minLength={8} required value={confirm} onChange={e=>setConfirm(e.target.value)} /></div>
      <button className="button primary full" disabled={busy}>{busy?"Saving…":"Set password"}</button>
    </form>
  </section></main>;
}
