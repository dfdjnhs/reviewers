import { useState, useEffect, useRef } from "react";

// ══════════════════════════════════════════════
//  CONFIG — JSONBin cloud storage
// ══════════════════════════════════════════════
const JSONBIN_API_KEY = "$2a$10$pz4aKgAJ5y1ykIr2AEBhtunOyGNMWJe4pDD33Wj/YAk1O529Cjycu";
const JSONBIN_BASE    = "https://api.jsonbin.io/v3";
let   BIN_ID          = null; // auto-created on first run, stored in localStorage

async function getOrCreateBin() {
  if (BIN_ID) return BIN_ID;
  const stored = localStorage.getItem("studydeck_bin_id");
  if (stored) { BIN_ID = stored; return BIN_ID; }
  // create a new bin
  const res = await fetch(`${JSONBIN_BASE}/b`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Master-Key": JSONBIN_API_KEY,
      "X-Bin-Name":   "StudyDeck",
      "X-Bin-Private":"false",
    },
    body: JSON.stringify({ reviewers: [] }),
  });
  const data = await res.json();
  BIN_ID = data.metadata.id;
  localStorage.setItem("studydeck_bin_id", BIN_ID);
  return BIN_ID;
}

async function cloudRead() {
  try {
    const id  = await getOrCreateBin();
    const res = await fetch(`${JSONBIN_BASE}/b/${id}/latest`, {
      headers: { "X-Master-Key": JSONBIN_API_KEY },
    });
    const data = await res.json();
    return data.record?.reviewers || [];
  } catch { return []; }
}

async function cloudWrite(reviewers) {
  try {
    const id  = await getOrCreateBin();
    await fetch(`${JSONBIN_BASE}/b/${id}`, {
      method:  "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": JSONBIN_API_KEY,
      },
      body: JSON.stringify({ reviewers }),
    });
  } catch (e) { console.error("Cloud write failed", e); }
}

// ══════════════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════════════
const ADMIN_PASSWORD = "studydeck2025";

const SUBJECTS = [
  { name:"Math",    color:"#FFD6D6", accent:"#FF6B6B", dark:"#c0392b", emoji:"📐" },
  { name:"Science", color:"#D6F0FF", accent:"#54A0FF", dark:"#2980b9", emoji:"🔬" },
  { name:"Filipino",color:"#FFF3CD", accent:"#F9CA24", dark:"#d4ac0d", emoji:"🇵🇭" },
  { name:"English", color:"#D6FFE8", accent:"#1DD1A1", dark:"#16a085", emoji:"📖" },
  { name:"TLE",     color:"#FFE8D6", accent:"#FF9F43", dark:"#e67e22", emoji:"🔧" },
  { name:"Values",  color:"#EED6FF", accent:"#C56BFF", dark:"#8e44ad", emoji:"✨" },
  { name:"AP",      color:"#D6EEFF", accent:"#48DBFB", dark:"#0984e3", emoji:"🏛️" },
  { name:"MAPEH",   color:"#FFD6F0", accent:"#FF78C4", dark:"#ad1457", emoji:"🎨" },
];

const subjectOf = (name) => SUBJECTS.find(s => s.name === name) || SUBJECTS[0];

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return new Date(ts).toLocaleDateString("en-US",{month:"short",day:"numeric"});
}

const FONT = "'Nunito','Segoe UI',sans-serif";
const MONO = "'DM Mono','Courier New',monospace";

// ══════════════════════════════════════════════
//  SMALL UI COMPONENTS
// ══════════════════════════════════════════════
function Toast({ msg, err }) {
  return (
    <div style={{position:"fixed",bottom:26,left:"50%",transform:"translateX(-50%)",
      background:err?"#fff0f0":"#fff",border:`2px solid ${err?"#ff6b6b":"#e0e0e0"}`,
      color:err?"#c0392b":"#333",padding:"10px 22px",borderRadius:30,fontSize:13,
      fontWeight:700,zIndex:9999,boxShadow:"0 6px 24px rgba(0,0,0,0.13)",
      whiteSpace:"nowrap",animation:"fadeUp .2s ease",fontFamily:FONT}}>
      {msg}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",
      backdropFilter:"blur(6px)",zIndex:1000,display:"flex",
      alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#fff",borderRadius:20,width:"100%",maxWidth:500,
        maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 64px rgba(0,0,0,0.18)",fontFamily:FONT}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:"18px 20px 14px",borderBottom:"2px solid #f0f0f0",
          position:"sticky",top:0,background:"#fff",zIndex:1,borderRadius:"20px 20px 0 0"}}>
          <span style={{fontWeight:800,fontSize:16,color:"#1a1a2e"}}>{title}</span>
          <button onClick={onClose}
            style={{background:"#f5f5f5",border:"none",color:"#888",cursor:"pointer",
              fontSize:18,width:32,height:32,borderRadius:10,
              display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>
        <div style={{padding:20}}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{marginBottom:14}}>
      <label style={{display:"block",fontSize:11,color:"#888",fontWeight:800,
        textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6,fontFamily:FONT}}>
        {label}
      </label>
      {children}
    </div>
  );
}

const iStyle = {
  width:"100%",background:"#fafafa",border:"2px solid #ebebeb",borderRadius:12,
  padding:"10px 14px",color:"#1a1a2e",fontSize:14,outline:"none",
  fontFamily:MONO,boxSizing:"border-box",display:"block",
};

// ══════════════════════════════════════════════
//  MAIN APP
// ══════════════════════════════════════════════
export default function App() {
  const [reviewers,   setReviewers]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [syncing,     setSyncing]     = useState(false);
  const [isAdmin,     setIsAdmin]     = useState(false);
  const [showLogin,   setShowLogin]   = useState(false);
  const [pwInput,     setPwInput]     = useState("");
  const [pwErr,       setPwErr]       = useState(false);

  const [page,           setPage]           = useState("home");
  const [activeSubject,  setActiveSubject]  = useState(null);
  const [activeReviewer, setActiveReviewer] = useState(null);

  const carouselRef = useRef(null);

  const [showAdd,    setShowAdd]    = useState(false);
  const [showEdit,   setShowEdit]   = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const emptyForm = { title:"", subject:"Math", content:"", links:[], files:[], archived:false };
  const [form,        setForm]        = useState(emptyForm);
  const [newUrl,      setNewUrl]      = useState("");
  const [newLabel,    setNewLabel]    = useState("");
  const [showLinkRow, setShowLinkRow] = useState(false);
  const fileRef = useRef(null);

  const [toast,     setToast]     = useState(null);
  const toastTimer  = useRef(null);

  const showToast = (msg, err=false) => {
    setToast({ msg, err });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  };

  // ── LOAD ──
  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await cloudRead();
      setReviewers(data.sort((a,b) => b.updatedAt - a.updatedAt));
      setLoading(false);
    })();
  }, []);

  // ── AUTH ──
  const tryLogin = () => {
    if (pwInput === ADMIN_PASSWORD) {
      setIsAdmin(true); setShowLogin(false); setPwInput(""); setPwErr(false);
      showToast("Admin access granted 🔓");
    } else {
      setPwErr(true);
      setTimeout(() => setPwErr(false), 900);
    }
  };

  // ── SAVE ──
  const saveReviewer = async (isEdit=false) => {
    if (!form.title.trim()) return showToast("Title is required", true);
    setSyncing(true);
    const now = Date.now();
    const r = isEdit && editTarget
      ? { ...editTarget, ...form, updatedAt: now }
      : { ...form, id:`r_${now}_${Math.random().toString(36).slice(2,6)}`, createdAt:now, updatedAt:now };

    const updated = [r, ...reviewers.filter(x => x.id !== r.id)]
      .sort((a,b) => b.updatedAt - a.updatedAt);
    setReviewers(updated);
    await cloudWrite(updated);

    setShowAdd(false); setShowEdit(false); setEditTarget(null); setForm(emptyForm);
    showToast(isEdit ? "Updated ✓" : "Saved to cloud ✓");
    setSyncing(false);
  };

  const deleteReviewer = async (r) => {
    if (!confirm(`Delete "${r.title}"?`)) return;
    setSyncing(true);
    const updated = reviewers.filter(x => x.id !== r.id);
    setReviewers(updated);
    await cloudWrite(updated);
    if (activeReviewer?.id === r.id) { setPage("home"); setActiveReviewer(null); }
    showToast("Deleted");
    setSyncing(false);
  };

  const toggleArchive = async (r) => {
    const updated_r  = { ...r, archived: !r.archived, updatedAt: Date.now() };
    const updated    = reviewers.map(x => x.id === r.id ? updated_r : x)
      .sort((a,b) => b.updatedAt - a.updatedAt);
    setReviewers(updated);
    await cloudWrite(updated);
    if (activeReviewer?.id === r.id) setActiveReviewer(updated_r);
    showToast(updated_r.archived ? "Archived 📦" : "Unarchived ✓");
  };

  const openEdit = (r) => {
    setForm({ title:r.title, subject:r.subject, content:r.content||"",
      links:r.links||[], files:r.files||[], archived:r.archived||false });
    setEditTarget(r); setShowEdit(true); setShowLinkRow(false);
  };

  const addLink = () => {
    if (!newUrl.trim()) return;
    let url = newUrl.trim();
    if (!url.startsWith("http")) url = "https://" + url;
    setForm(f => ({ ...f, links:[...f.links, { url, label:newLabel.trim()||url }] }));
    setNewUrl(""); setNewLabel(""); setShowLinkRow(false);
  };

  const handleFile = (e) => {
    Array.from(e.target.files).forEach(file => {
      if (file.size > 2*1024*1024) { showToast(`${file.name} too large (max 2MB)`,true); return; }
      const reader = new FileReader();
      reader.onload = ev => setForm(f => ({
        ...f, files:[...f.files, { name:file.name, type:file.type, size:file.size, data:ev.target.result }]
      }));
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  // ── DERIVED ──
  const active   = reviewers.filter(r => !r.archived);
  const archived = reviewers.filter(r => r.archived);
  const featured = active.slice(0, 3);
  const recent   = active.slice(0, 6);
  const subjectReviewers = activeSubject ? active.filter(r => r.subject === activeSubject) : [];

  // ── FORM BODY ──
  function FormBody() {
    return (
      <>
        <Field label="Title">
          <input style={iStyle} placeholder="e.g. Chapter 3 – Photosynthesis"
            value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} />
        </Field>
        <Field label="Subject">
          <select style={iStyle} value={form.subject}
            onChange={e => setForm(f=>({...f,subject:e.target.value}))}>
            {SUBJECTS.map(s => <option key={s.name}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Notes">
          <textarea style={{...iStyle,minHeight:120,resize:"vertical",lineHeight:1.7}}
            placeholder="Paste or type content here..."
            value={form.content} onChange={e => setForm(f=>({...f,content:e.target.value}))} />
        </Field>

        {/* Links */}
        <div style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <label style={{fontSize:11,color:"#888",fontWeight:800,textTransform:"uppercase",
              letterSpacing:"0.08em",fontFamily:FONT}}>
              🔗 Links {form.links.length>0 && <span style={{color:"#54A0FF"}}>({form.links.length})</span>}
            </label>
            <button onClick={() => setShowLinkRow(s=>!s)}
              style={{fontSize:11,background:"#eef5ff",border:"none",color:"#54A0FF",
                borderRadius:20,padding:"3px 12px",cursor:"pointer",fontWeight:700,fontFamily:FONT}}>
              {showLinkRow ? "Cancel" : "+ Add"}
            </button>
          </div>
          {showLinkRow && (
            <div style={{background:"#f8f8f8",border:"2px solid #ebebeb",borderRadius:12,padding:12,marginBottom:8}}>
              <input style={{...iStyle,marginBottom:8}} placeholder="https://..."
                value={newUrl} onChange={e=>setNewUrl(e.target.value)} />
              <input style={{...iStyle,marginBottom:8}} placeholder="Label (optional)"
                value={newLabel} onChange={e=>setNewLabel(e.target.value)} />
              <button onClick={addLink}
                style={{width:"100%",background:"#54A0FF",border:"none",color:"#fff",
                  borderRadius:10,padding:"9px",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:FONT}}>
                Add Link
              </button>
            </div>
          )}
          {form.links.map((l,i) => (
            <div key={i} style={{display:"flex",alignItems:"center",gap:8,background:"#f0f7ff",
              border:"2px solid #cce4ff",borderRadius:10,padding:"8px 12px",marginBottom:6}}>
              <span>🔗</span>
              <div style={{flex:1,fontSize:12,color:"#1a1a2e",overflow:"hidden",
                textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:FONT}}>{l.label}</div>
              <button onClick={() => setForm(f=>({...f,links:f.links.filter((_,j)=>j!==i)}))}
                style={{background:"none",border:"none",color:"#ff6b6b",cursor:"pointer",fontSize:16}}>×</button>
            </div>
          ))}
        </div>

        {/* Files */}
        <div style={{marginBottom:4}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <label style={{fontSize:11,color:"#888",fontWeight:800,textTransform:"uppercase",
              letterSpacing:"0.08em",fontFamily:FONT}}>
              📎 Files {form.files.length>0 && <span style={{color:"#54A0FF"}}>({form.files.length})</span>}
            </label>
            <button onClick={() => fileRef.current?.click()}
              style={{fontSize:11,background:"#eef5ff",border:"none",color:"#54A0FF",
                borderRadius:20,padding:"3px 12px",cursor:"pointer",fontWeight:700,fontFamily:FONT}}>
              + Attach
            </button>
          </div>
          <input ref={fileRef} type="file" multiple
            accept="image/*,.pdf,.doc,.docx,.txt,.pptx,.xlsx"
            style={{display:"none"}} onChange={handleFile} />
          <div style={{fontSize:11,color:"#bbb",marginBottom:6,fontFamily:FONT}}>Images, PDFs, docs — max 2MB</div>
          {form.files.map((f,i) => (
            <div key={i} style={{display:"flex",alignItems:"center",gap:8,background:"#fafafa",
              border:"2px solid #ebebeb",borderRadius:10,padding:"8px 12px",marginBottom:6}}>
              <span>{f.type?.startsWith("image/") ? "🖼️" : "📄"}</span>
              <div style={{flex:1,fontSize:12,color:"#1a1a2e",overflow:"hidden",
                textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:FONT}}>{f.name}</div>
              {f.type?.startsWith("image/") && f.data &&
                <img src={f.data} alt="" style={{width:28,height:28,objectFit:"cover",borderRadius:6}} />}
              <button onClick={() => setForm(f2=>({...f2,files:f2.files.filter((_,j)=>j!==i)}))}
                style={{background:"none",border:"none",color:"#ff6b6b",cursor:"pointer",fontSize:16}}>×</button>
            </div>
          ))}
        </div>
      </>
    );
  }

  // ── REVIEWER CARD ──
  function ReviewerCard({ r, onClick }) {
    const subj = subjectOf(r.subject);
    return (
      <div onClick={onClick}
        style={{background:"#fff",border:"2px solid #f0f0f0",borderRadius:16,padding:14,
          cursor:"pointer",transition:"transform .15s,box-shadow .15s",fontFamily:FONT,
          borderTop:`4px solid ${subj.accent}`}}
        onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";
          e.currentTarget.style.boxShadow=`0 8px 24px ${subj.accent}33`;}}
        onMouseLeave={e=>{e.currentTarget.style.transform="none";
          e.currentTarget.style.boxShadow="none";}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:5,background:subj.color,
          borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:800,color:subj.dark,marginBottom:8}}>
          {subj.emoji} {subj.name}
        </div>
        <div style={{fontSize:14,fontWeight:800,color:"#1a1a2e",marginBottom:4,lineHeight:1.3}}>{r.title}</div>
        {r.content && (
          <div style={{fontSize:12,color:"#888",lineHeight:1.5,marginBottom:6}}>
            {r.content.slice(0,60)}{r.content.length>60?"…":""}
          </div>
        )}
        <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:4}}>
          {r.links?.length>0 && <span style={{fontSize:10,background:"#eef5ff",color:"#54A0FF",borderRadius:20,padding:"2px 8px",fontWeight:700}}>🔗 {r.links.length}</span>}
          {r.files?.length>0 && <span style={{fontSize:10,background:"#f3eeff",color:"#8e44ad",borderRadius:20,padding:"2px 8px",fontWeight:700}}>📎 {r.files.length}</span>}
        </div>
        <div style={{fontSize:11,color:"#ccc"}}>{timeAgo(r.updatedAt)}</div>
      </div>
    );
  }

  // ── SUBJECT FOLDER ──
  function SubjectFolder({ subj, count }) {
    return (
      <div onClick={() => { setActiveSubject(subj.name); setPage("subject"); }}
        style={{flexShrink:0,width:148,background:subj.color,borderRadius:18,
          padding:"18px 16px 14px",cursor:"pointer",border:"3px solid transparent",
          transition:"transform .15s,box-shadow .15s,border-color .15s",
          fontFamily:FONT,position:"relative",marginTop:14}}
        onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";
          e.currentTarget.style.boxShadow=`0 12px 28px ${subj.accent}44`;
          e.currentTarget.style.borderColor=subj.accent;}}
        onMouseLeave={e=>{e.currentTarget.style.transform="none";
          e.currentTarget.style.boxShadow="none";
          e.currentTarget.style.borderColor="transparent";}}>
        {/* folder tab */}
        <div style={{position:"absolute",top:-14,left:14,width:48,height:14,
          background:subj.color,borderRadius:"8px 8px 0 0"}} />
        <div style={{fontSize:32,marginBottom:10}}>{subj.emoji}</div>
        <div style={{fontSize:14,fontWeight:800,color:subj.dark,marginBottom:3}}>{subj.name}</div>
        <div style={{fontSize:11,fontWeight:700,color:subj.accent}}>
          {count} reviewer{count!==1?"s":""}
        </div>
      </div>
    );
  }

  // ── SECTION LABEL ──
  const SL = {
    fontSize:11,color:"#aaa",fontWeight:800,textTransform:"uppercase",
    letterSpacing:"0.1em",marginBottom:10,fontFamily:FONT
  };

  // ── DETAIL PAGE ──
  function DetailPage() {
    const r = activeReviewer
      ? (reviewers.find(x => x.id===activeReviewer.id) || activeReviewer)
      : null;
    if (!r) return null;
    const subj = subjectOf(r.subject);
    return (
      <div style={{minHeight:"100vh",background:"#f7f8fc",fontFamily:FONT}}>
        <div style={{background:`linear-gradient(135deg,${subj.color} 0%,${subj.accent}22 100%)`,
          padding:"28px 20px 24px",borderBottom:`3px solid ${subj.accent}33`}}>
          <button onClick={() => { setPage(activeSubject?"subject":"home"); setActiveReviewer(null); }}
            style={{background:"#fff",border:`2px solid ${subj.accent}55`,color:subj.dark,
              borderRadius:20,padding:"6px 16px",cursor:"pointer",fontSize:13,
              fontWeight:800,marginBottom:16,fontFamily:FONT}}>← Back</button>
          <div style={{display:"inline-flex",alignItems:"center",gap:6,background:subj.color,
            border:`2px solid ${subj.accent}`,borderRadius:20,padding:"4px 14px",
            fontSize:12,fontWeight:800,color:subj.dark,marginBottom:12}}>
            {subj.emoji} {subj.name}
          </div>
          <h2 style={{margin:"0 0 6px",fontSize:22,fontWeight:900,color:"#1a1a2e",lineHeight:1.2}}>{r.title}</h2>
          <div style={{fontSize:12,color:"#999"}}>Updated {timeAgo(r.updatedAt)}</div>
          {isAdmin && (
            <div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap"}}>
              <button onClick={() => openEdit(r)}
                style={{background:"#fff",border:"2px solid #e0e0e0",color:"#333",
                  borderRadius:20,padding:"6px 16px",cursor:"pointer",fontSize:12,fontWeight:800,fontFamily:FONT}}>
                ✏️ Edit
              </button>
              <button onClick={() => toggleArchive(r)}
                style={{background:"#fff",border:`2px solid ${subj.accent}`,color:subj.dark,
                  borderRadius:20,padding:"6px 16px",cursor:"pointer",fontSize:12,fontWeight:800,fontFamily:FONT}}>
                {r.archived ? "📤 Unarchive" : "📦 Archive"}
              </button>
              <button onClick={() => deleteReviewer(r)}
                style={{background:"#fff0f0",border:"2px solid #ffcdd2",color:"#c0392b",
                  borderRadius:20,padding:"6px 16px",cursor:"pointer",fontSize:12,fontWeight:800,fontFamily:FONT}}>
                🗑️ Delete
              </button>
            </div>
          )}
        </div>
        <div style={{padding:"20px 20px 40px",maxWidth:700,margin:"0 auto"}}>
          {r.content && (
            <div style={{marginBottom:24}}>
              <div style={SL}>📄 Notes</div>
              <pre style={{whiteSpace:"pre-wrap",fontSize:14,lineHeight:1.85,color:"#444",
                background:"#fff",border:"2px solid #f0f0f0",borderRadius:14,
                padding:"16px 18px",margin:0,fontFamily:MONO,overflowX:"auto"}}>{r.content}</pre>
            </div>
          )}
          {r.links?.length>0 && (
            <div style={{marginBottom:24}}>
              <div style={SL}>🔗 Links</div>
              {r.links.map((l,i) => (
                <a key={i} href={l.url} target="_blank" rel="noreferrer"
                  style={{display:"flex",alignItems:"center",gap:10,background:"#fff",
                    border:"2px solid #e8f4ff",borderRadius:12,padding:"11px 14px",
                    marginBottom:8,textDecoration:"none",transition:"border-color .15s"}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor="#54A0FF"}
                  onMouseLeave={e=>e.currentTarget.style.borderColor="#e8f4ff"}>
                  <span style={{fontSize:18}}>🔗</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,color:"#54A0FF",fontWeight:800,overflow:"hidden",
                      textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:FONT}}>{l.label}</div>
                    <div style={{fontSize:11,color:"#bbb",overflow:"hidden",
                      textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:MONO}}>{l.url}</div>
                  </div>
                  <span style={{color:"#bbb",fontSize:14,flexShrink:0}}>↗</span>
                </a>
              ))}
            </div>
          )}
          {r.files?.length>0 && (
            <div style={{marginBottom:24}}>
              <div style={SL}>📎 Attachments</div>
              {r.files.map((f,i) => (
                <div key={i} style={{marginBottom:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,background:"#fff",
                    border:"2px solid #f0f0f0",borderRadius:12,padding:"11px 14px"}}>
                    <span style={{fontSize:18}}>{f.type?.startsWith("image/")?"🖼️":"📄"}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,color:"#1a1a2e",fontWeight:700,overflow:"hidden",
                        textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:FONT}}>{f.name}</div>
                      {f.size && <div style={{fontSize:11,color:"#bbb"}}>{(f.size/1024).toFixed(1)} KB</div>}
                    </div>
                    {f.data && (
                      <a href={f.data} download={f.name}
                        style={{color:"#54A0FF",fontSize:12,fontWeight:700,
                          textDecoration:"none",flexShrink:0,fontFamily:FONT}}>⬇️ Save</a>
                    )}
                  </div>
                  {f.type?.startsWith("image/") && f.data &&
                    <img src={f.data} alt={f.name}
                      style={{width:"100%",display:"block",borderRadius:"0 0 12px 12px",
                        border:"2px solid #f0f0f0",borderTop:"none"}} />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── SUBJECT PAGE ──
  function SubjectPage() {
    const subj = subjectOf(activeSubject);
    return (
      <div style={{minHeight:"100vh",background:"#f7f8fc",fontFamily:FONT}}>
        <div style={{background:`linear-gradient(135deg,${subj.color},${subj.accent}22)`,
          padding:"24px 20px 20px",borderBottom:`3px solid ${subj.accent}33`}}>
          <button onClick={() => { setPage("home"); setActiveSubject(null); }}
            style={{background:"#fff",border:`2px solid ${subj.accent}55`,color:subj.dark,
              borderRadius:20,padding:"6px 16px",cursor:"pointer",fontSize:13,
              fontWeight:800,marginBottom:14,fontFamily:FONT}}>← Home</button>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:36}}>{subj.emoji}</span>
            <div>
              <h2 style={{margin:0,fontSize:22,fontWeight:900,color:subj.dark}}>{subj.name}</h2>
              <div style={{fontSize:13,color:subj.accent,fontWeight:700}}>
                {subjectReviewers.length} reviewer{subjectReviewers.length!==1?"s":""}
              </div>
            </div>
          </div>
        </div>
        <div style={{padding:"20px",maxWidth:800,margin:"0 auto"}}>
          {subjectReviewers.length===0
            ? <div style={{textAlign:"center",padding:"60px 20px",color:"#bbb",fontSize:14}}>
                No reviewers yet for {subj.name}.
                {isAdmin && <><br/><span style={{color:subj.accent,fontWeight:700}}>Click + New to add one!</span></>}
              </div>
            : <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
                {subjectReviewers.map(r => (
                  <ReviewerCard key={r.id} r={r}
                    onClick={() => { setActiveReviewer(r); setPage("detail"); }} />
                ))}
              </div>
          }
        </div>
      </div>
    );
  }

  // ── HOME PAGE ──
  function HomePage() {
    return (
      <div style={{background:"#f7f8fc",minHeight:"calc(100vh - 56px)",fontFamily:FONT}}>

        {/* Hero Banner */}
        <div style={{background:"linear-gradient(135deg,#667eea 0%,#764ba2 100%)",
          padding:"32px 20px 28px",color:"#fff",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:-40,right:-40,width:200,height:200,
            borderRadius:"50%",background:"rgba(255,255,255,0.06)"}} />
          <div style={{position:"absolute",bottom:-60,left:-20,width:160,height:160,
            borderRadius:"50%",background:"rgba(255,255,255,0.04)"}} />
          <div style={{position:"relative",zIndex:1}}>
            <div style={{fontSize:28,fontWeight:900,letterSpacing:"-0.5px",marginBottom:4}}>📚 StudyDeck</div>
            <div style={{fontSize:14,opacity:0.85,marginBottom:20}}>Your class reviewer hub</div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              {[
                {icon:"📄",label:`${active.length} Reviewers`},
                {icon:"📦",label:`${archived.length} Archived`},
                {icon: loading?"⏳":syncing?"🔄":"✅", label: loading?"Loading…":syncing?"Syncing…":"Cloud synced"},
              ].map((b,i) => (
                <div key={i} style={{background:"rgba(255,255,255,0.18)",backdropFilter:"blur(8px)",
                  borderRadius:14,padding:"9px 16px",fontSize:13,fontWeight:700,
                  display:"flex",alignItems:"center",gap:6}}>
                  {b.icon} {b.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{padding:"0 0 48px",maxWidth:860,margin:"0 auto"}}>

          {/* Subjects Carousel */}
          <div style={{padding:"24px 20px 0"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <h3 style={{margin:0,fontSize:16,fontWeight:900,color:"#1a1a2e"}}>📁 Subjects</h3>
              <div style={{display:"flex",gap:6}}>
                {["‹","›"].map((arrow,i) => (
                  <button key={i} onClick={() => carouselRef.current?.scrollBy({left:(i?1:-1)*180,behavior:"smooth"})}
                    style={{width:32,height:32,borderRadius:"50%",background:"#fff",
                      border:"2px solid #e0e0e0",cursor:"pointer",fontSize:16,
                      display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT}}>
                    {arrow}
                  </button>
                ))}
              </div>
            </div>
            <div ref={carouselRef}
              style={{display:"flex",gap:12,overflowX:"auto",paddingBottom:8,
                scrollbarWidth:"none",scrollSnapType:"x mandatory",paddingTop:4}}>
              {SUBJECTS.map(subj => {
                const cnt = active.filter(r => r.subject===subj.name).length;
                return (
                  <div key={subj.name} style={{scrollSnapAlign:"start",flexShrink:0}}>
                    <SubjectFolder subj={subj} count={cnt} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Featured */}
          {featured.length>0 && (
            <div style={{padding:"28px 20px 0"}}>
              <h3 style={{margin:"0 0 14px",fontSize:16,fontWeight:900,color:"#1a1a2e"}}>⭐ Featured</h3>
              {/* big card */}
              {(() => {
                const r = featured[0];
                const subj = subjectOf(r.subject);
                return (
                  <div onClick={() => { setActiveReviewer(r); setPage("detail"); }}
                    style={{background:`linear-gradient(135deg,${subj.color},${subj.accent}33)`,
                      borderRadius:20,padding:"22px 22px 18px",border:`3px solid ${subj.accent}44`,
                      cursor:"pointer",marginBottom:12,transition:"transform .15s,box-shadow .15s"}}
                    onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";
                      e.currentTarget.style.boxShadow=`0 12px 36px ${subj.accent}33`;}}
                    onMouseLeave={e=>{e.currentTarget.style.transform="none";
                      e.currentTarget.style.boxShadow="none";}}>
                    <div style={{display:"inline-flex",alignItems:"center",gap:6,
                      background:"#fff",borderRadius:20,padding:"4px 14px",
                      fontSize:12,fontWeight:800,color:subj.dark,marginBottom:12}}>
                      {subj.emoji} {subj.name}
                    </div>
                    <div style={{fontSize:20,fontWeight:900,color:"#1a1a2e",
                      marginBottom:6,lineHeight:1.2}}>{r.title}</div>
                    {r.content && (
                      <div style={{fontSize:13,color:"#555",lineHeight:1.6,marginBottom:10}}>
                        {r.content.slice(0,120)}{r.content.length>120?"…":""}
                      </div>
                    )}
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                      {r.links?.length>0 && <span style={{fontSize:11,background:"#fff",color:subj.accent,borderRadius:20,padding:"3px 10px",fontWeight:800}}>🔗 {r.links.length} link{r.links.length>1?"s":""}</span>}
                      {r.files?.length>0 && <span style={{fontSize:11,background:"#fff",color:subj.accent,borderRadius:20,padding:"3px 10px",fontWeight:800}}>📎 {r.files.length} file{r.files.length>1?"s":""}</span>}
                      <span style={{fontSize:11,color:"#888",marginLeft:"auto"}}>{timeAgo(r.updatedAt)}</span>
                    </div>
                  </div>
                );
              })()}
              {featured.length>1 && (
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {featured.slice(1,3).map(r => (
                    <ReviewerCard key={r.id} r={r}
                      onClick={() => { setActiveReviewer(r); setPage("detail"); }} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Recent */}
          {recent.length>0 && (
            <div style={{padding:"28px 20px 0"}}>
              <h3 style={{margin:"0 0 14px",fontSize:16,fontWeight:900,color:"#1a1a2e"}}>🕐 Recent</h3>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:10}}>
                {recent.map(r => (
                  <ReviewerCard key={r.id} r={r}
                    onClick={() => { setActiveReviewer(r); setPage("detail"); }} />
                ))}
              </div>
            </div>
          )}

          {/* Archived */}
          {archived.length>0 && (
            <div style={{padding:"28px 20px 0"}}>
              <h3 style={{margin:"0 0 14px",fontSize:16,fontWeight:900,color:"#aaa"}}>📦 Archived</h3>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:10}}>
                {archived.map(r => (
                  <div key={r.id} style={{opacity:0.6}}>
                    <ReviewerCard r={r}
                      onClick={() => { setActiveReviewer(r); setPage("detail"); }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && reviewers.length===0 && (
            <div style={{textAlign:"center",padding:"60px 20px",color:"#bbb"}}>
              <div style={{fontSize:52,marginBottom:12}}>📭</div>
              <div style={{fontSize:16,fontWeight:800,color:"#888",marginBottom:6}}>No reviewers yet</div>
              <div style={{fontSize:13,color:"#aaa"}}>
                {isAdmin
                  ? <>Click <b style={{color:"#667eea"}}>+ New</b> to add your first reviewer!</>
                  : "Check back when your teacher adds content."}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ══ RENDER ══
  return (
    <div style={{minHeight:"100vh",background:"#f7f8fc",fontFamily:FONT}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-thumb{background:#ddd;border-radius:2px}
        ::-webkit-scrollbar-track{background:transparent}
        select option{background:#fff;color:#1a1a2e}
        @keyframes fadeUp{from{opacity:0;transform:translate(-50%,8px)}to{opacity:1;transform:translate(-50%,0)}}
        @keyframes shake{0%,100%{transform:translateX(0)}25%,75%{transform:translateX(-5px)}50%{transform:translateX(5px)}}
      `}</style>

      {/* TOP NAV */}
      {page !== "detail" && (
        <div style={{height:56,background:"#fff",borderBottom:"2px solid #f0f0f0",
          display:"flex",alignItems:"center",padding:"0 16px",gap:10,
          position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
          {page==="subject" && (
            <button onClick={() => { setPage("home"); setActiveSubject(null); }}
              style={{background:"none",border:"none",color:"#667eea",cursor:"pointer",
                fontSize:20,padding:"4px 6px",fontWeight:900,lineHeight:1}}>←</button>
          )}
          <span style={{fontSize:16,fontWeight:900,color:"#1a1a2e",letterSpacing:"-0.3px"}}>
            {page==="subject" && activeSubject
              ? `${subjectOf(activeSubject).emoji} ${activeSubject}`
              : "📚 StudyDeck"}
          </span>
          <div style={{flex:1}} />
          {isAdmin ? (
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:11,fontWeight:800,color:"#27ae60",background:"#e8faf0",
                border:"2px solid #a9dfbf",borderRadius:20,padding:"2px 10px"}}>🔓 Admin</span>
              <button onClick={() => { setShowAdd(true); setForm(emptyForm); setShowLinkRow(false); }}
                style={{background:"linear-gradient(135deg,#667eea,#764ba2)",border:"none",
                  color:"#fff",borderRadius:20,padding:"8px 18px",cursor:"pointer",
                  fontSize:13,fontWeight:800,fontFamily:FONT,
                  boxShadow:"0 4px 12px #667eea44"}}>+ New</button>
            </div>
          ) : (
            <button onClick={() => setShowLogin(true)}
              style={{background:"#f5f5f5",border:"2px solid #e0e0e0",color:"#888",
                borderRadius:20,padding:"6px 14px",cursor:"pointer",
                fontSize:12,fontWeight:800,fontFamily:FONT}}>🔒 Admin</button>
          )}
        </div>
      )}

      {page==="home"    && <HomePage />}
      {page==="subject" && <SubjectPage />}
      {page==="detail"  && <DetailPage />}

      {/* LOGIN MODAL */}
      {showLogin && (
        <Modal title="🔒 Admin Login"
          onClose={() => { setShowLogin(false); setPwInput(""); setPwErr(false); }}>
          <p style={{fontSize:13,color:"#888",marginBottom:16,lineHeight:1.6,fontFamily:FONT}}>
            Enter your admin password to manage reviewers. Classmates can view without logging in.
          </p>
          <Field label="Password">
            <input type="password"
              style={{...iStyle,animation:pwErr?"shake .35s ease":"none",
                borderColor:pwErr?"#ff6b6b":"#ebebeb"}}
              placeholder="Enter password…" value={pwInput}
              onChange={e => setPwInput(e.target.value)}
              onKeyDown={e => e.key==="Enter" && tryLogin()} autoFocus />
          </Field>
          {pwErr && <div style={{fontSize:12,color:"#ff6b6b",marginBottom:10,fontFamily:FONT}}>❌ Wrong password.</div>}
          <button onClick={tryLogin}
            style={{width:"100%",background:"linear-gradient(135deg,#667eea,#764ba2)",
              border:"none",color:"#fff",borderRadius:12,padding:"12px",
              cursor:"pointer",fontSize:14,fontWeight:800,fontFamily:FONT,
              boxShadow:"0 4px 16px #667eea44"}}>Login</button>
        </Modal>
      )}

      {/* ADD MODAL */}
      {showAdd && (
        <Modal title="📝 New Reviewer" onClose={() => setShowAdd(false)}>
          <FormBody />
          <button onClick={() => saveReviewer(false)}
            style={{width:"100%",background:"linear-gradient(135deg,#667eea,#764ba2)",
              border:"none",color:"#fff",borderRadius:12,padding:"13px",
              cursor:"pointer",fontSize:14,fontWeight:800,fontFamily:FONT,marginTop:8}}>
            {syncing ? "☁️ Saving…" : "☁️ Save to Cloud"}
          </button>
        </Modal>
      )}

      {/* EDIT MODAL */}
      {showEdit && (
        <Modal title="✏️ Edit Reviewer"
          onClose={() => { setShowEdit(false); setEditTarget(null); }}>
          <FormBody />
          <button onClick={() => saveReviewer(true)}
            style={{width:"100%",background:"linear-gradient(135deg,#54A0FF,#2980b9)",
              border:"none",color:"#fff",borderRadius:12,padding:"13px",
              cursor:"pointer",fontSize:14,fontWeight:800,fontFamily:FONT,marginTop:8}}>
            {syncing ? "Saving…" : "💾 Update Reviewer"}
          </button>
        </Modal>
      )}

      {toast && <Toast msg={toast.msg} err={toast.err} />}
    </div>
  );
}
