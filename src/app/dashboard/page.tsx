"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { authClient } from "../../lib/auth-client";

type WorkspaceItem={
  workspace:{id:string;slug:string;name:string;status:string};
  role:string;
  status:string;
};

type ProviderBinding={
  provider:"openai"|"anthropic"|"ollama"|"custom";
  model:string;
  credentialRef?:{type:"env";name:string}|{type:"vault";id:"primary"};
  baseUrl?:string;
  version?:number;
  updatedAt?:string;
};

export default function DashboardPage(){
  const session=authClient.useSession();
  const [workspaces,setWorkspaces]=useState<WorkspaceItem[]>([]);
  const [workspaceId,setWorkspaceId]=useState("");
  const [binding,setBinding]=useState<ProviderBinding|null>(null);
  const [provider,setProvider]=useState<ProviderBinding["provider"]>("openai");
  const [model,setModel]=useState("");
  const [credentialMode,setCredentialMode]=useState<"local"|"cloud">("local");
  const [credentialEnv,setCredentialEnv]=useState("OPENAI_API_KEY");
  const [apiKey,setApiKey]=useState("");
  const [baseUrl,setBaseUrl]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  const activeWorkspace=useMemo(
    ()=>workspaces.find(item=>item.workspace.id===workspaceId) ?? null,
    [workspaces,workspaceId]
  );

  useEffect(()=>{
    if(!session.data) return;
    fetch("/api/v1/me/workspaces")
      .then(async response=>{
        const body=await response.json();
        if(!response.ok) throw new Error(body.error ?? "Unable to load workspaces.");
        return body;
      })
      .then(body=>{
        const items=(body.workspaces ?? []) as WorkspaceItem[];
        setWorkspaces(items);
        if(items[0]) setWorkspaceId(items[0].workspace.id);
      })
      .catch(error=>setMessage(error instanceof Error ? error.message : "Unable to load workspaces."));
  },[session.data]);

  useEffect(()=>{
    if(!workspaceId) return;
    setMessage("");
    fetch("/api/v1/me/provider-binding",{headers:{"x-zeroai-workspace":workspaceId}})
      .then(async response=>{
        const body=await response.json();
        if(!response.ok) throw new Error(body.error ?? "Unable to load AI connection.");
        return body;
      })
      .then(body=>{
        const value=(body.binding ?? null) as ProviderBinding|null;
        setBinding(value);
        if(value){
          setProvider(value.provider);
          setModel(value.model);
          if(value.credentialRef?.type==="env"){
            setCredentialMode("local");
            setCredentialEnv(value.credentialRef.name);
          }else if(value.credentialRef?.type==="vault"){
            setCredentialMode("cloud");
            setCredentialEnv("");
          }
          setBaseUrl(value.baseUrl ?? "");
        }
      })
      .catch(error=>setMessage(error instanceof Error ? error.message : "Unable to load AI connection."));
  },[workspaceId]);

  useEffect(()=>{
    if(provider==="openai" && (!credentialEnv || credentialEnv==="ANTHROPIC_API_KEY")) setCredentialEnv("OPENAI_API_KEY");
    if(provider==="anthropic" && (!credentialEnv || credentialEnv==="OPENAI_API_KEY")) setCredentialEnv("ANTHROPIC_API_KEY");
    if(provider==="ollama") setCredentialEnv("");
  },[provider,credentialEnv]);

  async function saveProvider(event:FormEvent){
    event.preventDefault();
    if(!workspaceId) return;
    setBusy(true); setMessage("");

    const payload={
      provider,
      model:model.trim(),
      mode:provider==="ollama" ? "local" : credentialMode,
      ...(provider!=="ollama" && credentialMode==="local" ? {credentialEnv:credentialEnv.trim()} : {}),
      ...(provider!=="ollama" && credentialMode==="cloud" ? {apiKey:apiKey.trim()} : {}),
      ...((provider==="ollama" || provider==="custom") && baseUrl.trim() ? {baseUrl:baseUrl.trim()} : {})
    };

    try{
      const response=await fetch("/api/v1/me/provider-binding",{
        method:"PUT",
        headers:{"content-type":"application/json","x-zeroai-workspace":workspaceId},
        body:JSON.stringify(payload)
      });
      const body=await response.json();
      if(!response.ok) throw new Error(body.error ?? "Unable to connect AI provider.");
      setBinding(body.binding);
      setApiKey("");
      setMessage("AI connection saved. The ZeroAI CLI will use this workspace binding.");
    }catch(error){
      setMessage(error instanceof Error ? error.message : "Unable to connect AI provider.");
    }finally{
      setBusy(false);
    }
  }

  if(session.isPending) return <main className="auth-wrap"><div className="muted">Loading ZeroAI…</div></main>;
  if(!session.data) return <main className="auth-wrap"><section className="auth-card"><h1>Sign in required</h1><Link className="button primary" href="/login">Go to login</Link></section></main>;

  const user=session.data.user as {name?:string;email?:string;role?:string|string[]};

  return <div className="shell">
    <header className="topbar">
      <div className="brand">Zero<span>AI</span></div>
      <div className="nav">
        <Link href="/">Public site</Link>
        <button className="button" onClick={()=>authClient.signOut().then(()=>window.location.assign("/login"))}>Sign out</button>
      </div>
    </header>

    <div className="console">
      <aside className="sidebar">
        <Link href="/dashboard">Overview</Link>
        <a href="#connect-ai">Connect AI</a>
        <a href="#cli">CLI setup</a>
        <Link href="/dashboard">Executions</Link>
        <Link href="/dashboard">Memory</Link>
        <Link href="/dashboard">Evidence</Link>
        <Link href="/dashboard">Certifications</Link>
      </aside>

      <main className="console-main">
        <div className="eyebrow">ZeroAI Control Plane</div>
        <h2>Welcome, {user.name ?? user.email}</h2>
        <p className="muted">Connect your AI once. ZeroAI keeps the workspace binding authoritative while the CLI intercepts and governs each prompt.</p>

        {message && <div className={message.startsWith("AI connection saved") ? "notice" : "notice error"}>{message}</div>}

        <div className="grid dashboard-grid">
          <div className="card">
            <div className="muted">Workspace</div>
            <div className="metric small">{activeWorkspace?.workspace.name ?? "No workspace"}</div>
            <p className="muted">{activeWorkspace ? `${activeWorkspace.role} · ${activeWorkspace.workspace.slug}` : "Your account is not attached to an active ZeroAI workspace yet."}</p>
          </div>
          <div className="card">
            <div className="muted">Connected AI</div>
            <div className="metric small">{binding ? binding.provider : "Not connected"}</div>
            <p className="muted">{binding ? binding.model : "Connect a provider below before starting the CLI."}</p>
          </div>
          <div className="card">
            <div className="muted">Execution authority</div>
            <div className="status neutral">R1 · INTERCEPT ONLY</div>
            <p className="muted">Models can receive authorized context, but they cannot execute tools yet.</p>
          </div>
        </div>

        {workspaces.length>1 && <div className="section-card">
          <label className="field">
            <span>Workspace</span>
            <select value={workspaceId} onChange={event=>setWorkspaceId(event.target.value)}>
              {workspaces.map(item=><option key={item.workspace.id} value={item.workspace.id}>{item.workspace.name}</option>)}
            </select>
          </label>
        </div>}

        <section id="connect-ai" className="section-card">
          <div className="section-heading">
            <div>
              <div className="eyebrow">R1 · Provider binding</div>
              <h3>Connect your AI</h3>
            </div>
            <span className={binding ? "status" : "status neutral"}>{binding ? "CONNECTED" : "NOT CONNECTED"}</span>
          </div>
          <p className="muted">Choose local BYOK to keep the provider key on your machine, or cloud BYOK to store it encrypted in ZeroAI. Plaintext keys are never returned by this dashboard.</p>

          <form onSubmit={saveProvider} className="provider-form">
            <label className="field">
              <span>Provider</span>
              <select value={provider} onChange={event=>setProvider(event.target.value as ProviderBinding["provider"])}>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="ollama">Ollama</option>
                <option value="custom">Custom compatible endpoint</option>
              </select>
            </label>

            <label className="field">
              <span>Model</span>
              <input value={model} onChange={event=>setModel(event.target.value)} placeholder="Model name" required />
            </label>

            {provider!=="ollama" && <label className="field">
              <span>Credential mode</span>
              <select value={credentialMode} onChange={event=>setCredentialMode(event.target.value as "local"|"cloud")}>
                <option value="local">Local key — stays on this machine</option>
                <option value="cloud">Cloud key — encrypted by ZeroAI</option>
              </select>
            </label>}

            {provider!=="ollama" && credentialMode==="local" && <label className="field">
              <span>Credential environment variable</span>
              <input value={credentialEnv} onChange={event=>setCredentialEnv(event.target.value.toUpperCase())} placeholder="OPENAI_API_KEY" pattern="[A-Z][A-Z0-9_]*" required />
              <small>ZeroAI stores only the variable name. Set the actual key in your terminal environment.</small>
            </label>}

            {provider!=="ollama" && credentialMode==="cloud" && <label className="field">
              <span>{binding?.credentialRef?.type==="vault" ? "Replace API key" : "API key"}</span>
              <input type="password" value={apiKey} onChange={event=>setApiKey(event.target.value)} autoComplete="off" placeholder={binding?.credentialRef?.type==="vault" ? "Enter a new key to replace the stored key" : "Paste provider API key"} required />
              <small>The key is encrypted before persistence and is never returned to the browser.</small>
            </label>}

            {(provider==="ollama" || provider==="custom") && <label className="field">
              <span>Base URL</span>
              <input type="url" value={baseUrl} onChange={event=>setBaseUrl(event.target.value)} placeholder="http://127.0.0.1:11434" />
            </label>}

            <button className="button primary" disabled={busy || !workspaceId}>{busy ? "Saving…" : binding ? "Update connection" : "Connect AI"}</button>
          </form>
        </section>

        <section id="cli" className="section-card">
          <div className="eyebrow">CLI setup</div>
          <h3>Start ZeroAI inside your repository</h3>
          <div className="terminal">
            <code>npm install -g @zeroai/cli</code>
            <code>export ZEROAI_API_KEY=&quot;your-workspace-key&quot;</code>
            <code>{`zeroai bind ${workspaceId || "<workspace-id>"} --api-url ${typeof window!=="undefined" ? window.location.origin : "<zeroai-url>"}`}</code>
            <code>zeroai login</code>
            <code>cd your-repo</code>
            <code>zeroai</code>
          </div>
          <p className="muted">Once inside the shell, normal prompts enter ZeroIntercept before any provider sees them.</p>
        </section>
      </main>
    </div>
  </div>;
}
