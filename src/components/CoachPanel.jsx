import { useCallback, useEffect, useState } from "react";
import {
  listClasses,
  scheduleClass,
  setClassStatus,
  listClassInvitees,
  inviteToClass,
  classErrorMessage,
} from "../lib/coachClasses.js";

/**
 * Coach tools — schedule a session, invite athletes, go live.
 *
 * Only reachable by someone the database says is a coach. That check happens
 * server-side on every action too: this panel not rendering is a convenience,
 * not the control.
 *
 * The description field is given as much room as the title because it is the
 * part that does the work. It becomes the body of the notification an athlete
 * receives, so "bring a ball and something to jump over" arrives on their
 * phone rather than sitting behind a tap nobody makes.
 *
 * Going live is one button and ending is one button, because a coach doing
 * this is holding a basketball.
 */
export default function CoachPanel({ P = "#f97316", SF = "#0d1526", onClose, onOpenClass, zIndex = 380, __preview = null }) {
  const [classes, setClasses] = useState(__preview?.classes || []);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const [invitingFor, setInvitingFor] = useState(__preview?.invitingFor || null);
  const [invitees, setInvitees] = useState(__preview?.invitees || []);
  const [picked, setPicked] = useState(() => new Set());
  const isPreview = Boolean(__preview);

  const refresh = useCallback(async () => {
    if (isPreview) return;
    setClasses(await listClasses());
  }, [isPreview]);

  // Loads through the promise rather than calling refresh() in the effect body:
  // a state-setting callback invoked directly there is a cascading render.
  useEffect(() => {
    if (isPreview) return undefined;
    let alive = true;
    listClasses().then(list => { if (alive) setClasses(list); });
    return () => { alive = false; };
  }, [isPreview]);

  const create = useCallback(async (e) => {
    e.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    setStatus(null);
    // datetime-local has no zone; the browser's own offset is the right guess
    // for a coach scheduling their own session.
    const at = when ? new Date(when).toISOString() : null;
    const r = await scheduleClass(title.trim(), description.trim(), at);
    if (!r.ok) setStatus(classErrorMessage(r.error));
    else { setTitle(""); setDescription(""); setWhen(""); setStatus("Class scheduled."); await refresh(); }
    setBusy(false);
  }, [title, description, when, busy, refresh]);

  const openInvites = useCallback(async (classId) => {
    setInvitingFor(classId);
    const list = await listClassInvitees(classId);
    setInvitees(list);
    setPicked(new Set(list.filter(i => i.invited).map(i => i.athlete_id)));
  }, []);

  const sendInvites = useCallback(async () => {
    if (!invitingFor || busy) return;
    setBusy(true);
    const fresh = [...picked].filter(id => !invitees.find(i => i.athlete_id === id)?.invited);
    const r = await inviteToClass(invitingFor, fresh);
    setStatus(r.ok ? `Invited ${r.invited}.` : classErrorMessage(r.error));
    setBusy(false);
    setInvitingFor(null);
  }, [invitingFor, picked, invitees, busy]);

  const go = useCallback(async (classId, next) => {
    setBusy(true);
    const r = await setClassStatus(classId, next);
    if (!r.ok) setStatus(classErrorMessage(r.error));
    else await refresh();
    setBusy(false);
  }, [refresh]);

  const field = {
    width: "100%", boxSizing: "border-box", padding: "11px 13px", borderRadius: 10,
    border: `1px solid ${P}33`, background: "rgba(255,255,255,0.05)",
    color: "var(--fkh-text)", fontSize: 14, marginBottom: 9,
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", zIndex,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div style={{
        background: SF, borderRadius: "22px 22px 0 0", width: "100%", maxWidth: 680,
        padding: "18px 18px 30px", maxHeight: "92vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: "var(--fkh-text)" }}>📋 Coach tools</span>
          <button type="button" onClick={onClose} style={{
            background: "none", border: "none", color: "#64748b", fontSize: 22, cursor: "pointer",
          }}>✕</button>
        </div>
        <p style={{ fontSize: 12, color: "var(--fkh-text-muted)", lineHeight: 1.5, marginBottom: 16 }}>
          Athletes watch and type in chat. Their cameras stay off.
        </p>

        {status && (
          <div style={{
            fontSize: 12, color: P, background: `${P}14`, border: `1px solid ${P}33`,
            borderRadius: 10, padding: "9px 12px", marginBottom: 14,
          }}>{status}</div>
        )}

        {invitingFor ? (
          <>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#94a3b8", marginBottom: 8 }}>
              Who is this for?
            </div>
            {invitees.length === 0 && (
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>No athletes to invite yet.</div>
            )}
            {invitees.map(a => (
              <label key={a.athlete_id} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "9px 2px",
                cursor: a.invited ? "default" : "pointer", opacity: a.invited ? 0.6 : 1,
              }}>
                <input type="checkbox" checked={picked.has(a.athlete_id)} disabled={a.invited}
                  onChange={e => setPicked(prev => {
                    const next = new Set(prev);
                    if (e.target.checked) next.add(a.athlete_id); else next.delete(a.athlete_id);
                    return next;
                  })}
                  style={{ accentColor: P, width: 17, height: 17, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, color: "var(--fkh-text)" }}>{a.name}</span>
                <span style={{ fontSize: 10, color: "#64748b", fontWeight: 700 }}>
                  {a.invited ? "invited" : (a.age_group || "").toUpperCase()}
                </span>
              </label>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button type="button" onClick={() => setInvitingFor(null)} style={{
                flex: 1, padding: 12, borderRadius: 11, border: `1px solid ${P}33`,
                background: "transparent", color: "#94a3b8", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}>Back</button>
              <button type="button" onClick={sendInvites} disabled={busy} style={{
                flex: 1, padding: 12, borderRadius: 11, border: "none",
                background: P, color: "#000", fontSize: 13, fontWeight: 800, cursor: "pointer",
              }}>{busy ? "Sending…" : "Send invites"}</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#94a3b8", marginBottom: 8 }}>New session</div>
            <form onSubmit={create}>
              <input value={title} onChange={e => setTitle(e.target.value)}
                placeholder="What's the session? e.g. Tuesday Handles" style={field} />
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                rows={3}
                placeholder="What should they bring or expect? This is what lands on their phone."
                style={{ ...field, resize: "vertical", fontFamily: "inherit" }} />
              <input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} style={field} />
              <button type="submit" disabled={!title.trim() || busy} style={{
                width: "100%", padding: 13, borderRadius: 12, border: "none", marginBottom: 22,
                background: title.trim() ? P : `${P}55`, color: "#000",
                fontSize: 14, fontWeight: 800, cursor: title.trim() ? "pointer" : "not-allowed",
              }}>{busy ? "…" : "Schedule class"}</button>
            </form>

            <div style={{ fontSize: 12, fontWeight: 800, color: "#94a3b8", marginBottom: 8 }}>Your classes</div>
            {classes.length === 0 ? (
              <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                Nothing scheduled. Sessions you create show up here.
              </div>
            ) : classes.map(c => (
              <div key={c.class_id} style={{
                border: `1px solid ${c.status === "live" ? P : "rgba(148,163,184,0.2)"}`,
                borderRadius: 12, padding: "11px 12px", marginBottom: 9,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 800, color: "var(--fkh-text)" }}>
                    {c.title}
                  </span>
                  {c.status === "live" && (
                    <span style={{ fontSize: 10, fontWeight: 800, color: P }}>🔴 LIVE</span>
                  )}
                </div>
                {c.description && (
                  <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 4, lineHeight: 1.45 }}>{c.description}</div>
                )}
                {c.scheduled_at && (
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                    {new Date(c.scheduled_at).toLocaleString()}
                  </div>
                )}
                <div style={{ display: "flex", gap: 7, marginTop: 10, flexWrap: "wrap" }}>
                  {c.status === "live" ? (
                    <>
                      <button type="button" onClick={() => onOpenClass?.(c)} style={{
                        flex: 1, minWidth: 110, padding: "9px 12px", borderRadius: 9, border: "none",
                        background: P, color: "#000", fontSize: 12, fontWeight: 800, cursor: "pointer",
                      }}>Open room</button>
                      <button type="button" onClick={() => go(c.class_id, "ended")} style={{
                        padding: "9px 12px", borderRadius: 9, border: "1px solid rgba(220,38,38,0.5)",
                        background: "transparent", color: "#f87171", fontSize: 12, fontWeight: 700, cursor: "pointer",
                      }}>End</button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => go(c.class_id, "live")} style={{
                        flex: 1, minWidth: 110, padding: "9px 12px", borderRadius: 9, border: "none",
                        background: P, color: "#000", fontSize: 12, fontWeight: 800, cursor: "pointer",
                      }}>Go live</button>
                      <button type="button" onClick={() => openInvites(c.class_id)} style={{
                        padding: "9px 12px", borderRadius: 9, border: `1px solid ${P}44`,
                        background: "transparent", color: P, fontSize: 12, fontWeight: 700, cursor: "pointer",
                      }}>Invite</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
