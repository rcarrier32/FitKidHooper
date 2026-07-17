/**
 * TodayDigest — the "Today" surface of the product command center.
 *
 * Answers two questions before any other panel on the dashboard:
 *   1. Is the product OK today?      → health header, every metric with a direction
 *   2. What needs me?                → needs-attention list, every row clickable
 *
 * Presentation only. Reads analytics_today_digest / analytics_needs_attention
 * (+ _summary), which are admin-gated by RLS, and hands clicks back up to the
 * dashboard's existing drill-down engine.
 */

const KIND_LABEL = {
  lapsed: "Lapsed",
  stalled_new: "Signed up, never trained",
  feedback: "Feedback",
  sync_error: "Sync errors",
};

function fmtDuration(sec) {
  if (sec == null) return "—";
  const s = Math.round(Number(sec));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem ? `${m}m ${rem}s` : `${m}m`;
}

function timeAgo(ts) {
  if (!ts) return "—";
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(mins, 0)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/** Direction of a change, plus whether that direction is good news. */
function delta(current, previous, { unit = "", suffix = "" } = {}) {
  const cur = current == null ? null : Number(current);
  const prev = previous == null ? null : Number(previous);
  if (cur == null || prev == null) return null;
  const diff = cur - prev;
  if (Math.abs(diff) < 0.05) return { text: `no change ${suffix}`.trim(), tone: "flat" };
  const arrow = diff > 0 ? "▲" : "▼";
  const rounded = Math.abs(diff) >= 10 ? Math.round(Math.abs(diff)) : Math.round(Math.abs(diff) * 10) / 10;
  return {
    text: `${arrow} ${rounded}${unit} ${suffix}`.trim(),
    // Every metric on this header is "higher is better", so up is always good.
    tone: diff > 0 ? "good" : "bad",
  };
}

const TONE = { good: "#34d399", bad: "#f87171", flat: "#64748b" };

function Metric({ label, value, change, sub }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12,
      padding: "14px 16px",
    }}>
      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: "#f8fafc", fontFamily: "'DM Mono',monospace", lineHeight: 1.1 }}>
        {value ?? "—"}
      </div>
      {change && (
        <div style={{ fontSize: 11, color: TONE[change.tone], marginTop: 5, fontWeight: 600 }}>{change.text}</div>
      )}
      {sub && <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function TodayDigest({ digest, attention, attentionSummary, onOpenAthlete, onOpenFeedback }) {
  const d = digest || {};
  const rows = attention || [];
  const summary = attentionSummary || [];
  const critCount = d.attention_crit ?? 0;
  const totalCount = d.attention_total ?? rows.length;
  const allClear = totalCount === 0;

  const missionRate = d.mission_rate_7d_pct != null ? `${d.mission_rate_7d_pct}%` : "—";

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: "#f8fafc" }}>Today</h2>
        <span style={{ fontSize: 11, color: "#475569" }}>
          {d.total_athletes ?? 0} athletes all-time · rates use 7-day windows
        </span>
      </div>

      {/* Health header — is the product OK? */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12, marginBottom: 14 }}>
        <Metric
          label="Active today"
          value={d.dau_today}
          change={delta(d.dau_today, d.dau_yesterday, { suffix: "vs yesterday" })}
        />
        <Metric
          label="Active (7d)"
          value={d.active_7d}
          change={delta(d.active_7d, d.active_prev_7d, { suffix: "vs prior 7d" })}
        />
        <Metric
          label="New (7d)"
          value={d.new_7d}
          change={delta(d.new_7d, d.new_prev_7d, { suffix: "vs prior 7d" })}
          sub={d.new_today ? `${d.new_today} today` : null}
        />
        <Metric
          label="Mission rate (7d)"
          value={missionRate}
          change={delta(d.mission_rate_7d_pct, d.mission_rate_prev_7d_pct, { unit: "pp", suffix: "vs prior 7d" })}
        />
        <Metric
          label="Avg session (7d)"
          value={fmtDuration(d.avg_session_7d_sec)}
          change={delta(d.avg_session_7d_sec, d.avg_session_prev_7d_sec, { unit: "s", suffix: "vs prior 7d" })}
        />
        <Metric
          label="Retention"
          value={d.d1_pct_recent != null ? `${d.d1_pct_recent}%` : "—"}
          sub={`D1 · D7 ${d.d7_pct_recent != null ? `${d.d7_pct_recent}%` : "—"} · 30d cohorts`}
        />
      </div>

      {/* Needs attention — what needs me? */}
      <div style={{
        background: allClear ? "rgba(52,211,153,0.06)" : critCount > 0 ? "rgba(248,113,113,0.07)" : "rgba(251,191,36,0.06)",
        border: `1px solid ${allClear ? "rgba(52,211,153,0.28)" : critCount > 0 ? "rgba(248,113,113,0.32)" : "rgba(251,191,36,0.28)"}`,
        borderRadius: 14,
        padding: "14px 16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: allClear ? 0 : 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: allClear ? "#34d399" : critCount > 0 ? "#f87171" : "#fbbf24" }}>
            {allClear ? "✓ Nothing needs you right now" : `⚠ Needs attention (${totalCount})`}
          </span>
          {!allClear && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {summary.map(s => (
                <span key={`${s.kind}-${s.severity}`} style={{
                  fontSize: 10,
                  fontFamily: "'DM Mono',monospace",
                  color: s.severity === "crit" ? "#f87171" : "#94a3b8",
                  border: `1px solid ${s.severity === "crit" ? "rgba(248,113,113,0.4)" : "rgba(255,255,255,0.14)"}`,
                  borderRadius: 6,
                  padding: "3px 8px",
                }}>
                  {KIND_LABEL[s.kind] || s.kind} {s.items}
                </span>
              ))}
            </div>
          )}
        </div>

        {allClear ? (
          <p style={{ fontSize: 12, color: "#64748b", margin: "6px 0 0" }}>
            No lapsed athletes, untriaged bug reports, stalled signups, or sync errors in the last 7 days.
          </p>
        ) : (
          <>
            <div style={{ display: "grid", gap: 6 }}>
              {rows.map((r, i) => {
                const clickable = Boolean(r.athlete_id || r.ref_id);
                const open = () => {
                  if (r.kind === "feedback") onOpenFeedback?.(r);
                  else if (r.athlete_id) onOpenAthlete?.(r);
                };
                return (
                  <div
                    key={i}
                    onClick={clickable ? open : undefined}
                    role={clickable ? "button" : undefined}
                    tabIndex={clickable ? 0 : undefined}
                    onKeyDown={clickable ? e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } } : undefined}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto",
                      gap: 10,
                      alignItems: "center",
                      background: "rgba(0,0,0,0.22)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderLeft: `2px solid ${r.severity === "crit" ? "#f87171" : "#fbbf24"}`,
                      borderRadius: 8,
                      padding: "8px 11px",
                      cursor: clickable ? "pointer" : "default",
                    }}
                    onMouseEnter={clickable ? e => { e.currentTarget.style.background = "rgba(56,189,248,0.08)"; } : undefined}
                    onMouseLeave={clickable ? e => { e.currentTarget.style.background = "rgba(0,0,0,0.22)"; } : undefined}
                  >
                    <span style={{
                      fontSize: 9,
                      fontFamily: "'DM Mono',monospace",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: r.severity === "crit" ? "#f87171" : "#fbbf24",
                      whiteSpace: "nowrap",
                    }}>
                      {KIND_LABEL[r.kind] || r.kind}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ fontSize: 12.5, color: "#e2e8f0", fontWeight: 600 }}>{r.label}</span>
                      <span style={{ fontSize: 11.5, color: "#64748b", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.detail}
                      </span>
                    </span>
                    <span style={{ fontSize: 10.5, color: "#475569", whiteSpace: "nowrap", fontFamily: "'DM Mono',monospace" }}>
                      {timeAgo(r.occurred_at)}{clickable && <span style={{ color: "#38bdf8", marginLeft: 6 }}>↗</span>}
                    </span>
                  </div>
                );
              })}
            </div>
            {totalCount > rows.length && (
              <p style={{ fontSize: 11, color: "#475569", margin: "9px 0 0" }}>
                Showing the {rows.length} most recent of {totalCount}.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
