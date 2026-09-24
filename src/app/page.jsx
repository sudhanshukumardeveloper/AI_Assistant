"use client";

import { useEffect, useMemo, useState } from "react";

const nav = [
  ["Command Center","⌘"],
  ["Messages","◫"],
  ["Calls","◉"],
  ["Files","◇"],
  ["Tasks","▣"],
  ["Audit Trail","≡"],
  ["Security","◆"],
];

const plan = [
  ["01","Inspect communication context","room.read","LOW","AUTONOMOUS"],
  ["02","Prepare response and attachments","message.draft","MEDIUM","MONITORED"],
  ["03","Start external call","call.connect","HIGH","AWAITING APPROVAL"],
  ["04","Send outbound message","message.send","HIGH","LOCKED"],
];

function AccessGate() {
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");

  async function requestAccess(e) {
    e.preventDefault(); setBusy(true); setMessage(""); setError("");
    try {
      const res=await fetch("/api/access/request",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({displayName:name,email})});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||"Request failed.");
      setMessage(data.message); setName(""); setEmail("");
    } catch(err) { setError(err.message||"Unable to send request."); }
    finally { setBusy(false); }
  }

  return <main className="gate">
    <div className="gate-glow" />
    <section className="gate-card">
      <div className="logo"><span>A</span><div><b>AEGIS</b><small>PRIVATE COMMUNICATION FABRIC</small></div></div>
      <div className="gate-icon">✦</div>
      <p className="eyebrow">RESTRICTED ACCESS / ZERO-TRUST PERIMETER</p>
      <h1>Request secure access.</h1>
      <p className="gate-copy">Your email is verified by an administrator before an account session is issued. No public registration and no password is stored here.</p>
      <form onSubmit={requestAccess} className="access-form">
        <label>FULL NAME<input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" required /></label>
        <label>EMAIL ADDRESS<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" required /></label>
        <button disabled={busy}>{busy ? "Sending request…" : "Request access"} <span>→</span></button>
      </form>
      {message && <div className="notice success">✓ {message}</div>}
      {error && <div className="notice error">! {error}</div>}
      <div className="gate-foot"><span>● Encrypted session</span><span>● Admin approval</span><span>● Audit logged</span></div>
    </section>
  </main>;
}

function Dashboard({user}) {
  const [active,setActive]=useState("Command Center");
  const [query,setQuery]=useState("");
  const [confirm,setConfirm]=useState(false);
  const [toast,setToast]=useState("");
  const [planRows,setPlanRows]=useState([]);
  const [pending,setPending]=useState(null);

  function notify(m){setToast(m);window.setTimeout(()=>setToast(""),2800);}
  async function runPlan(){
    if(!query.trim()) return notify("Enter a command first.");
    try {
      const res=await fetch("/api/agent/plan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:query})});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||"Unable to create plan.");
      setPlanRows(data.steps||[]);
      setQuery("");
      notify("Plan generated • governance screening complete.");
    } catch(err) { notify(err.message||"Unable to create plan."); }
  }
  function selectStep(step){ setPending(step); if(step.risk==="HIGH") setConfirm(true); else notify("Ready to dispatch this governed action."); }
  async function executePending(){
    if(!pending) return;
    try {
      const res=await fetch("/api/agent/execute",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({requestId:pending.requestId||crypto.randomUUID(),action:pending.action,confirmed:pending.risk==="HIGH"})});
      const data=await res.json();
      if(!res.ok) throw new Error(data.details||data.error||"Execution failed.");
      notify("Action acknowledged by trusted runner.");
      setConfirm(false); setPending(null);
    } catch(err) { setConfirm(false); notify(err.message||"Trusted execution failed."); }
  }
  async function logout(){
    await fetch("/api/access/logout",{method:"POST"});
    window.location.reload();
  }

  const title = useMemo(()=>active.toUpperCase(),[active]);

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">A</div><div><b>AEGIS</b><small>COMMAND CENTER</small></div></div>
      <div className="secure"><span className="live-dot"/> PRIVATE ZTNA PERIMETER</div>
      <nav>{nav.map(([item,icon])=><button key={item} className={active===item?"nav active":"nav"} onClick={()=>setActive(item)}><span>{icon}</span>{item}</button>)}</nav>
      <div className="side-bottom">
        <div className="node-card"><small>TRUSTED EXECUTION</small><p><i/> Sandbox online</p><p><i/> Vault connected</p><p><i/> WebSocket guarded</p></div>
        <button className="admin" onClick={logout}>Sign out <span>{user.displayName.slice(0,2).toUpperCase()}</span></button>
      </div>
    </aside>

    <section className="main">
      <header className="topbar">
        <div><small>RESTRICTED ACCESS / {title}</small><h1>{active}</h1></div>
        <div className="top-right"><span className="status"><i/> All systems nominal</span><span className="avatar">{user.displayName.slice(0,2).toUpperCase()}</span></div>
      </header>

      {active==="Command Center" ? <div className="content">
        <div className="hero-grid">
          <section className="card hero"><div className="orb"><strong>A</strong></div><div className="hero-copy"><small>AI REASONING ENGINE</small><h2>Coordinate your workspace.</h2><p>Natural language becomes a structured plan. Governance screens every action before it reaches trusted execution.</p><div className="command"><textarea value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ask Aegis to coordinate a task…" rows={2}/><button onClick={runPlan}>Run plan <em>⌘↵</em></button></div></div></section>
          <section className="card health"><div className="card-title"><span>GOVERNANCE HEALTH</span><b>LIVE</b></div><strong className="score">98.7<small>%</small></strong><div className="meter"><i/></div>{["Origin validation","Secret policy","Rate limiter","Audit stream"].map(x=><div className="metric" key={x}><span>{x}</span><b>{x==="Secret policy"?"VAULT ONLY":x==="Audit stream"?"APPEND-ONLY":"ENFORCED"}</b></div>)}</section>
        </div>

        <div className="section-title"><div><small>DUAL-AGENT PIPELINE</small><h3>Live execution plan</h3></div><span className="pipeline-status"><i/> HOST AGENT → APP AGENT → GOVERNANCE</span></div>
        <section className="card table"><div className="table-head"><span>STEP</span><span>ACTION</span><span>RISK</span><span>STATUS</span></div>{planRows.length ? planRows.map((r,i)=><button key={r.id||i} className={r.risk==="HIGH"?"table-row high-row":"table-row"} onClick={()=>selectStep(r)}><span className="mono">{String(i+1).padStart(2,"0")}</span><span><b>{r.action}</b><small>{r.operation}</small></span><span className={"risk "+r.risk.toLowerCase()}>{r.risk}</span><span>{r.requiresApproval?"AWAITING APPROVAL":"READY"}</span></button>) : <div className="audit-row"><span>—</span><span>—</span><span>Enter a command to generate a live governed plan.</span><span>—</span><span>READY</span></div>}</section>

        <div className="lower-grid">
          <section className="card panel"><div className="card-title"><span>RUNTIME NODES</span><b>CONTROL PLANE</b></div><div className="nodes">{[["Reasoning Brain","Governance API"],["Governance Manager","Policy engine"],["Trusted Runner","External / required"],["Android Companion","External / optional"]].map(([x,s])=><div className="node" key={x}><strong>◈</strong><span><b>{x}</b><small><i/> {s}</small></span></div>)}</div></section>
          <section className="card panel"><div className="card-title"><span>SECURITY EVENTS</span><b>SERVER AUDIT</b></div><div className="events"><p><strong>✓</strong><span><b>Audit trail is server-backed</b><small>Open Audit Trail for recorded execution events.</small></span></p><p><strong>!</strong><span><b>Trusted runner is fail-closed</b><small>No runner acknowledgement means no success.</small></span></p></div></section>
        </div>

        <section className="card audit"><div className="section-title compact"><div><small>IMMUTABLE LOG</small><h3>Recent audit trail</h3></div><button onClick={()=>notify("Audit export prepared.")}>Export log</button></div><div className="audit-head"><span>TIME</span><span>REQUEST</span><span>OPERATION</span><span>RISK</span><span>STATUS</span></div>{[["19:04:12","REQ-9842104","Room query","LOW","CONTINUE"],["18:58:41","REQ-9842098","Draft message","MEDIUM","MONITORED"],["18:52:03","REQ-9842081","External message","HIGH","PENDING_CONFIRMATION"]].map(r=><div className="audit-row" key={r[1]}><span className="mono">{r[0]}</span><span className="mono">{r[1]}</span><span>{r[2]}</span><span className={"risk "+r[3].toLowerCase()}>{r[3]}</span><span>{r[4]}</span></div>)}</section>
      </div> : <Module name={active} onBack={()=>setActive("Command Center")} />}

      {confirm && <div className="modal"><div className="dialog"><div className="warn">!</div><small>HIGH-RISK SAFEGUARD</small><h2>Approve external communication?</h2><p>This action is held behind the governance boundary. Explicit user confirmation is required before the trusted runner can dispatch it.</p><div className="confirm-line"><span>RISK <b>HIGH</b></span><span>STATUS <b>PENDING_CONFIRMATION</b></span></div><div className="dialog-actions"><button onClick={()=>setConfirm(false)}>Cancel</button><button className="danger" onClick={executePending}>Approve & dispatch</button></div></div></div>}
      {toast && <div className="toast"><i/>{toast}</div>}
    </section>
  </main>;
}

function Module({name,onBack}){
  const copy={
    Messages:["Encrypted conversations, presence and delivery telemetry.","Socket.IO signaling and durable PostgreSQL message persistence belong behind this surface."],
    Calls:["Low-latency voice and video control.","The media plane can use P2P for small rooms and an authenticated SFU for larger rooms, with TURN fallback."],
    Files:["Direct-to-object-storage media pipeline.","Presigned uploads keep binary traffic off the application server and allow large-file multipart transfer."],
    Tasks:["Governed task queue.","Every generated action is risk-tiered before a trusted runner can execute it."],
    "Audit Trail":["Append-only operational history.","Requests, decisions, approvals and execution outcomes are designed to be auditable."],
    Security:["Zero-trust controls.","Origin validation, secret-vault references, rate limiting, isolated execution and emergency halts protect the boundary."]
  };
  const [heading,desc]=copy[name]||["Module ready","This area is connected to the same authenticated application shell."];
  return <div className="empty"><div className="empty-icon">◇</div><small>MODULE READY</small><h2>{heading}</h2><p>{desc}</p><button onClick={onBack}>Return to command center</button></div>;
}

export default function Home(){
  const [state,setState]=useState("loading");
  const [user,setUser]=useState(null);
  useEffect(()=>{fetch("/api/access/me").then(r=>r.json()).then(d=>{setUser(d.user||null);setState("ready")}).catch(()=>setState("ready"));},[]);
  if(state==="loading") return <main className="loading"><div className="loader">A</div><p>Securing session…</p></main>;
  return user ? <Dashboard user={user}/> : <AccessGate/>;
}
