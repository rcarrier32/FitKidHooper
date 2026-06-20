import { useState, useEffect, useCallback, useRef } from "react";
import { listMessageThreads, fetchThread, sendMessage } from "../lib/messagesApi.js";

/**
 * Friend messages — inbox of threads + an open conversation. Self-contained;
 * open it bare (inbox) or pass `initialFriend={{ id, name }}` to jump into a chat.
 * Friends-only is enforced server-side.
 */
function timeShort(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function MessagesSheet({ P = "#f97316", SF, bd, onClose, initialFriend = null }) {
  const [threads, setThreads] = useState(null); // inbox; null = loading
  const [active, setActive] = useState(initialFriend); // { id, name }
  const [msgs, setMsgs] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  const loadInbox = useCallback(() => { listMessageThreads().then(setThreads).catch(() => setThreads([])); }, []);
  const loadThread = useCallback((id) => { fetchThread(id).then(setMsgs).catch(() => setMsgs([])); }, []);

  useEffect(() => {
    if (active?.id) loadThread(active.id);
    else loadInbox();
  }, [active, loadInbox, loadThread]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !active?.id) return;
    setSending(true);
    setDraft("");
    const res = await sendMessage(active.id, text);
    if (res.ok) setMsgs(m => [...m, { id: res.id, from_me: true, body: text, created_at: new Date().toISOString() }]);
    else setDraft(text);
    setSending(false);
  };

  const header = active
    ? <><button onClick={() => setActive(null)} style={{ background:"none",border:"none",color:P,fontSize:18,cursor:"pointer",padding:"0 8px 0 0" }}>‹</button>{active.name || "Friend"}</>
    : "💬 Messages";

  return (
    <div onClick={onClose}
      style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",zIndex:320,display:"flex",alignItems:"flex-end",justifyContent:"center",backdropFilter:"blur(6px)" }}>
      <div onClick={e=>e.stopPropagation()}
        style={{ background:SF,borderRadius:"22px 22px 0 0",width:"100%",maxWidth:680,height:"82vh",display:"flex",flexDirection:"column" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px",borderBottom:`1px solid ${bd}` }}>
          <span style={{ fontSize:15,fontWeight:800,color:"var(--fkh-text)",display:"flex",alignItems:"center" }}>{header}</span>
          <button onClick={onClose} aria-label="Close" style={{ background:"none",border:"none",color:"#64748b",fontSize:22,cursor:"pointer" }}>✕</button>
        </div>

        {!active ? (
          <div style={{ flex:1,overflowY:"auto",padding:"6px 0" }}>
            {threads === null ? (
              <div style={{ textAlign:"center",padding:28,color:"#64748b",fontSize:13 }}>Loading…</div>
            ) : threads.length === 0 ? (
              <div style={{ textAlign:"center",padding:28,color:"#64748b",fontSize:13,lineHeight:1.5 }}>
                No messages yet. Open a friend's profile and tap Message to start a chat.
              </div>
            ) : threads.map(t => (
              <button key={t.other_id} onClick={() => setActive({ id:t.other_id, name:t.name || (t.username ? `@${t.username}` : "Friend") })}
                style={{ width:"100%",display:"flex",alignItems:"center",gap:12,padding:"12px 18px",background:"transparent",border:"none",borderBottom:`1px solid ${bd}`,cursor:"pointer",textAlign:"left" }}>
                <div style={{ width:38,height:38,borderRadius:"50%",background:`${P}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0 }}>👤</div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:13,fontWeight:800,color:"var(--fkh-text)" }}>{t.name || `@${t.username || "friend"}`}</div>
                  <div style={{ fontSize:11,color:"#64748b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{t.last}</div>
                </div>
                <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,flexShrink:0 }}>
                  <span style={{ fontSize:10,color:"#475569" }}>{timeShort(t.created_at)}</span>
                  {t.unread > 0 && <span style={{ fontSize:10,fontWeight:800,color:"#000",background:P,borderRadius:99,padding:"1px 7px" }}>{t.unread}</span>}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <>
            <div style={{ flex:1,overflowY:"auto",padding:"14px 16px",display:"flex",flexDirection:"column",gap:8 }}>
              {msgs.map(m => (
                <div key={m.id} style={{ alignSelf:m.from_me?"flex-end":"flex-start",maxWidth:"78%",
                  background:m.from_me?P:"rgba(255,255,255,0.06)",color:m.from_me?"#000":"var(--fkh-text)",
                  borderRadius:m.from_me?"14px 14px 4px 14px":"14px 14px 14px 4px",padding:"8px 12px",fontSize:13,lineHeight:1.4 }}>
                  {m.body}
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <div style={{ display:"flex",gap:8,padding:"10px 14px",borderTop:`1px solid ${bd}`,paddingBottom:"calc(10px + env(safe-area-inset-bottom,0px))" }}>
              <input value={draft} onChange={e=>setDraft(e.target.value.slice(0,1000))}
                onKeyDown={e=>{ if(e.key==="Enter") send(); }} placeholder="Message…"
                style={{ flex:1,padding:"10px 12px",borderRadius:99,border:`1px solid ${bd}`,background:"rgba(255,255,255,0.05)",color:"var(--fkh-text)",fontSize:13 }}/>
              <button onClick={send} disabled={sending||!draft.trim()}
                style={{ padding:"10px 16px",borderRadius:99,border:"none",background:draft.trim()?P:`${P}55`,color:"#000",fontSize:13,fontWeight:800,cursor:draft.trim()?"pointer":"not-allowed" }}>Send</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
