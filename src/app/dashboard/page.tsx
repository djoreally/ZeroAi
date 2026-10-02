"use client";

import Link from "next/link";
import { authClient } from "../../lib/auth-client";

export default function DashboardPage(){
  const session=authClient.useSession();
  if(session.isPending) return <main className="auth-wrap"><div className="muted">Loading ZeroAI…</div></main>;
  if(!session.data) return <main className="auth-wrap"><section className="auth-card"><h1>Sign in required</h1><Link className="button primary" href="/login">Go to login</Link></section></main>;

  const user=session.data.user as {name?:string;email?:string;role?:string|string[]};
  return <div className="shell">
    <header className="topbar"><div className="brand">Zero<span>AI</span></div><div className="nav"><Link href="/">Public site</Link><button className="button" onClick={()=>authClient.signOut().then(()=>window.location.assign("/login"))}>Sign out</button></div></header>
    <div className="console">
      <aside className="sidebar">
        <Link href="/dashboard">Overview</Link><Link href="/dashboard">Workspaces</Link><Link href="/dashboard">API keys</Link><Link href="/dashboard">Executions</Link><Link href="/dashboard">Memory</Link><Link href="/dashboard">Evidence</Link><Link href="/dashboard">Certifications</Link>
      </aside>
      <main className="console-main">
        <div className="eyebrow">User Console</div>
        <h2>Welcome, {user.name ?? user.email}</h2>
        <p className="muted">Your ZeroAI workspace is the boundary for state, memory, executions, policies, evidence and API keys.</p>
        <div className="grid">
          <div className="card"><div className="muted">Workspaces</div><div className="metric">—</div><p className="muted">Membership-backed tenant access.</p></div>
          <div className="card"><div className="muted">Active executions</div><div className="metric">—</div><p className="muted">Task graphs running through the control plane.</p></div>
          <div className="card"><div className="muted">Certification</div><div className="status">EVIDENCE DRIVEN</div><p className="muted">No evidence remains UNKNOWN.</p></div>
        </div>
      </main>
    </div>
  </div>;
}
