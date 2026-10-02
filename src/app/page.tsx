import Link from "next/link";

export default function Home() {
  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">Zero<span>AI</span></div>
        <nav className="nav">
          <Link href="/login">Sign in</Link>
          <Link className="button primary" href="/signup">Create account</Link>
        </nav>
      </header>
      <main className="page">
        <section className="hero">
          <div className="eyebrow">Deterministic AI Infrastructure</div>
          <h1>Make AI act inside a system you can prove.</h1>
          <p className="lede">ZeroAI gives applications a backend for authority, state, memory, execution, evidence and certification. Models propose. Deterministic systems decide.</p>
          <div className="nav">
            <Link className="button primary" href="/signup">Start with ZeroAI</Link>
            <Link className="button" href="/login">Open console</Link>
          </div>
        </section>
        <section className="grid">
          <div className="card"><div className="eyebrow">Control</div><h3>ZeroPolicy + task graphs</h3><p className="muted">Agents cannot manufacture their own authority or skip deterministic gates.</p></div>
          <div className="card"><div className="eyebrow">Memory</div><h3>ZeroState + ZeroMemory</h3><p className="muted">Canonical state lives outside inference and durable memory stays compact.</p></div>
          <div className="card"><div className="eyebrow">Proof</div><h3>ZeroLedger + ZeroCert</h3><p className="muted">Actions become evidence-backed, tamper-evident execution history.</p></div>
        </section>
      </main>
    </div>
  );
}
