"use client";

import Link from "next/link";
import { authClient } from "../../lib/auth-client";

function hasPlatformAdmin(role:unknown){
  if(Array.isArray(role)) return role.includes("platform_admin");
  return role==="platform_admin" || (typeof role==="string" && role.split(",").includes("platform_admin"));
}

export default function ControlPlanePage(){
  const session=authClient.useSession();
  if(session.isPending) return <main className="auth-wrap"><div className="muted">Loading control plane…</div></main>;
  if(!session.data) return <main className="auth-wrap"><section className="auth-card"><h1>Sign in required</h1><Link className="button primary" href="/login">Go to login</Link></section></main>;
  const user=session.data.user as {email?:string;role?:unknown};
  if(!hasPlatformAdmin(user.role)) return <main className="auth-wrap"><section className="auth-card"><div className="eyebrow">ZeroPolicy</div><h1>Access denied</h1><p className="muted">Platform-admin authority is assigned outside the signup flow.</p><Link className="button" href="/dashboard">Return to dashboard</Link></section></main>;

  return <div className="shell">
    <header className="topbar"><div className="brand">Zero<span>AI</span> Control Plane</div><div className="nav"><Link href="/dashboard">User console</Link><button className="button" onClick={()=>authClient.signOut().then(()=>window.location.assign("/login"))}>Sign out</button></div></header>
    <div className="console">
      <aside className="sidebar"><Link href="/control-plane">Overview</Link><Link href="/control-plane">Tenants</Link><Link href="/control-plane">Policies</Link><Link href="/control-plane">Agents</Link><Link href="/control-plane">Executions</Link><Link href="/control-plane">Evidence</Link><Link href="/control-plane">System health</Link></aside>
      <main className="console-main">
        <div className="eyebrow">Platform authority</div><h2>Control Plane</h2>
        <p className="muted">Manage tenants, authority, runtime policy, agent registry and infrastructure health. Model output cannot grant access to this surface.</p>
        <div className="grid">
          <div className="card"><div className="muted">Persistence</div><div className="status">NEON DATA API</div><p>Managed tenant state is isolated behind ZeroAI service authorization.</p></div>
          <div className="card"><div className="muted">Policy</div><div className="metric">ZeroPolicy</div><p className="muted">Authority remains deterministic and protected.</p></div>
          <div className="card"><div className="muted">Certification</div><div className="metric">ZeroCert</div><p className="muted">Execution claims require persisted evidence.</p></div>
        </div>
      </main>
    </div>
  </div>;
}
