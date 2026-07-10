import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient, isSupabaseConfigured } from "../lib/supabaseClient.js";
import { loadDrilldown } from "../lib/adminDrilldown.js";
import AuthSheet from "./AuthSheet.jsx";

const panelStyle = {
  background: "rgba(15,23,42,0.98)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 14,
  padding: "16px 18px",
  marginBottom: 24,
};

function StatCard({ label, value, sub, onClick, active }) {
  const clickable = Boolean(onClick);
  return (
    <div
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? e => { if (e.key === "Enter" || e.key === " ") onClick?.(); } : undefined}
      style={{
        background: active ? "rgba(56,189,248,0.12)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${active ? "rgba(56,189,248,0.45)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 12,
        padding: "14px 16px",
        cursor: clickable ? "pointer" : "default",
        transition: "border-color 0.15s, background 0.15s",
      }}
    >
      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}{clickable && <span style={{ marginLeft: 6, color: "#38bdf8" }}>↗</span>}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: "#f8fafc", fontFamily: "'DM Mono',monospace" }}>{value ?? "—"}</div>
      {sub && <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function DataTable({ title, columns, rows, onRowClick, hint }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", margin: "0 0 4px" }}>{title}</h3>
      {hint && <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 10px" }}>{hint}</p>}
      <div style={{ overflowX: "auto", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.04)" }}>
              {columns.map(c => (
                <th key={c.key} style={{ textAlign: "left", padding: "10px 12px", color: "#94a3b8", fontWeight: 600 }}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(rows || []).slice(0, 50).map((row, i) => (
              <tr
                key={i}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  cursor: onRowClick ? "pointer" : "default",
                  background: onRowClick ? "transparent" : undefined,
                }}
                onMouseEnter={onRowClick ? e => { e.currentTarget.style.background = "rgba(56,189,248,0.06)"; } : undefined}
                onMouseLeave={onRowClick ? e => { e.currentTarget.style.background = "transparent"; } : undefined}
              >
                {columns.map(c => (
                  <td key={c.key} style={{ padding: "9px 12px", color: "#cbd5e1", maxWidth: c.key === "message" ? 360 : undefined, wordBreak: c.key === "message" ? "break-word" : undefined }}>
                    {row[c.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
            {(!rows || rows.length === 0) && (
              <tr><td colSpan={columns.length} style={{ padding: 16, color: "#475569", textAlign: "center" }}>No data yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DrillPanel({ drill, data, loading, onBack, onClose, onRowClick }) {
  if (!drill) return null;

  return (
    <div style={panelStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: "#38bdf8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
            Drill-down
          </div>
          <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: "#f8fafc" }}>{data?.title || drill.label || "Loading…"}</h2>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {onBack && (
            <button type="button" onClick={onBack} style={btnStyle()}>← Back</button>
          )}
          <button type="button" onClick={onClose} style={btnStyle()}>✕ Close</button>
        </div>
      </div>

      {data?.meta && Object.keys(data.meta).length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 14, fontSize: 12, color: "#94a3b8" }}>
          {Object.entries(data.meta).map(([k, v]) => (
            <span key={k}><strong style={{ color: "#cbd5e1" }}>{k.replace(/_/g, " ")}:</strong> {v}</span>
          ))}
        </div>
      )}

      {loading ? (
        <p style={{ color: "#64748b", fontSize: 13 }}>Loading detail…</p>
      ) : (
        <DataTable
          title=""
          columns={data?.columns || []}
          rows={data?.rows || []}
          onRowClick={data?.rowDrill && onRowClick ? row => {
            const rd = data.rowDrill;
            const id = row[rd.idKey];
            if (!id) return;
            onRowClick({
              type: rd.type,
              value: id,
              label: `${rd.labelKey ? row[rd.labelKey] : id}`,
            }, true);
          } : undefined}
          hint={data?.rowDrill ? "Click a row to drill further (e.g. athlete timeline)" : undefined}
        />
      )}
    </div>
  );
}

function btnStyle() {
  return {
    padding: "6px 12px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.05)",
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  };
}

export default function AdminDashboard() {
  const configured = isSupabaseConfigured();
  const [data, setData] = useState(null);
  const [error, setError] = useState(configured ? null : "Supabase is not configured.");
  const [loading, setLoading] = useState(configured);
  const [drill, setDrill] = useState(null);
  const [drillData, setDrillData] = useState(null);
  const [drillLoading, setDrillLoading] = useState(false);
  const [drillStack, setDrillStack] = useState([]);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const openDrill = useCallback(async (nextDrill, pushStack = false) => {
    const sb = getSupabaseClient();
    if (!sb) return;
    if (pushStack && drill) setDrillStack(s => [...s, drill]);
    setDrill(nextDrill);
    setDrillLoading(true);
    try {
      const result = await loadDrilldown(sb, nextDrill);
      setDrillData(result);
    } catch (e) {
      setDrillData({ title: "Error", columns: [], rows: [], error: e.message });
    } finally {
      setDrillLoading(false);
    }
  }, [drill]);

  const closeDrill = () => {
    setDrill(null);
    setDrillData(null);
    setDrillStack([]);
  };

  const drillBack = () => {
    const prev = drillStack.at(-1);
    if (!prev) {
      closeDrill();
      return;
    }
    setDrillStack(s => s.slice(0, -1));
    openDrill(prev, false);
  };

  useEffect(() => {
    if (!configured) return;
    const sb = getSupabaseClient();
    if (!sb) return;

    let cancelled = false;

    // The analytics views are admin-gated by RLS and return EMPTY (not an error)
    // for non-admins. Supabase restores the auth session from storage
    // asynchronously, so we must wait for the session before querying —
    // otherwise the requests race out as `anon` and the dashboard silently
    // paints zeros. We also re-fetch whenever auth state changes (sign-in).
    const fetchAll = async () => {
      if (cancelled) return;
      setNeedsAuth(false);
      setLoading(true);
      try {
        const [
          summary, dau, wau, mau, retention, sessions, trainingDays,
          screens, exercises, favoritedExercises, programs, mission, challenges, badges,
          feedbackSummary, backlog,
        ] = await Promise.all([
          sb.from("analytics_athlete_summary").select("*").maybeSingle(),
          sb.from("analytics_dau").select("*").order("day", { ascending: false }).limit(14),
          sb.from("analytics_wau").select("*").order("week_start", { ascending: false }).limit(8),
          sb.from("analytics_mau").select("*").order("month_start", { ascending: false }).limit(6),
          sb.from("analytics_retention").select("*").order("cohort_day", { ascending: false }).limit(12),
          sb.from("analytics_sessions_per_week").select("*").order("week_start", { ascending: false }).limit(8),
          sb.from("analytics_training_days_per_week").select("*").order("week_start", { ascending: false }).limit(8),
          sb.from("analytics_top_screens").select("*").limit(15),
          sb.from("analytics_top_exercises").select("*").limit(15),
          sb.from("analytics_top_favorited_exercises").select("*").limit(15),
          sb.from("analytics_top_programs").select("*").limit(15),
          sb.from("analytics_mission_completion").select("*").order("day", { ascending: false }).limit(14),
          sb.from("analytics_challenge_completion").select("*").limit(15),
          sb.from("analytics_badge_distribution").select("*").limit(15),
          sb.from("feedback_summary").select("*").maybeSingle(),
          sb.from("feedback_backlog").select("created_at, status, category, title, app_version, message")
            .in("status", ["open", "triaged", "in_progress"]).limit(15),
        ]);

        if (cancelled) return;
        const err = [summary, dau, wau, retention, screens, exercises, programs, feedbackSummary, backlog]
          .map(r => r.error).find(Boolean);
        if (err) throw err;

        setError(null);
        setData({
          summary: summary.data,
          dau: dau.data,
          wau: wau.data,
          mau: mau.data,
          retention: retention.data,
          sessions: sessions.data,
          trainingDays: trainingDays.data,
          screens: screens.data,
          exercises: exercises.data,
          favoritedExercises: favoritedExercises.data,
          programs: programs.data,
          mission: mission.data,
          challenges: challenges.data,
          badges: badges.data,
          feedbackSummary: feedbackSummary.data,
          backlog: (backlog.data || []).map(r => ({
            ...r,
            created_at: r.created_at ? new Date(r.created_at).toLocaleString() : "—",
          })),
        });
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    // Wait for the restored session before the first fetch.
    (async () => {
      const { data: { session } } = await sb.auth.getSession();
      if (cancelled) return;
      if (session?.user) {
        fetchAll();
      } else {
        setLoading(false);
        setNeedsAuth(true);
      }
    })();

    // Re-fetch when the user signs in (covers late session restore too).
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      if (session?.user && !cancelled) fetchAll();
    });

    return () => { cancelled = true; subscription.unsubscribe(); };
  }, [configured, reloadKey]);

  if (needsAuth) {
    return (
      <div style={{ minHeight: "100vh", background: "#060b14", color: "#e2e8f0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>FKH Admin Dashboard</h1>
        <p style={{ fontSize: 14, color: "#94a3b8", margin: "0 0 20px" }}>Sign in with your admin account to view analytics.</p>
        <AuthSheet
          P="#f97316"
          SF="#0d1526"
          onClose={() => {}}
          onSignedIn={() => { setLoading(true); setNeedsAuth(false); setReloadKey(k => k + 1); }}
        />
      </div>
    );
  }

  if (loading) {
    return <div style={{ minHeight: "100vh", background: "#060b14", color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading analytics…</div>;
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: "#060b14", color: "#f87171", padding: 24, maxWidth: 720, margin: "0 auto" }}>
        <h1 style={{ color: "#f8fafc" }}>FKH Admin Dashboard</h1>
        <p>{error}</p>
      </div>
    );
  }

  const latestDau = data.dau?.[0];
  const latestWau = data.wau?.[0];
  const latestMau = data.mau?.[0];
  const latestRetention = data.retention?.[0];
  const latestSessions = data.sessions?.[0];
  const latestTraining = data.trainingDays?.[0];
  const fb = data.feedbackSummary;

  const isActive = type => drill?.type === type;

  return (
    <div style={{ minHeight: "100vh", background: "#060b14", color: "#e2e8f0", fontFamily: "'DM Sans',sans-serif", padding: "24px 20px 48px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px", letterSpacing: "-0.02em" }}>FKH Product Dashboard</h1>
            <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Click any metric or table row to drill down</p>
          </div>
          <button type="button" onClick={() => openDrill({ type: "recent_events", label: "Recent events" })}
            style={{ ...btnStyle(), padding: "8px 14px", color: "#38bdf8", borderColor: "rgba(56,189,248,0.35)" }}>
            Live event feed ↗
          </button>
        </div>

        <DrillPanel
          drill={drill}
          data={drillData}
          loading={drillLoading}
          onBack={drillStack.length ? drillBack : null}
          onClose={closeDrill}
          onRowClick={(next, push) => openDrill(next, push)}
        />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12, marginBottom: 28 }}>
          <StatCard label="Active (7d)" value={data.summary?.active_athletes_7d} active={isActive("athletes_active")}
            onClick={() => openDrill({ type: "athletes_active", label: "Active athletes (7d)" })} />
          <StatCard label="New (7d)" value={data.summary?.new_athletes_7d} active={isActive("athletes_new")}
            onClick={() => openDrill({ type: "athletes_new", label: "New athletes (7d)" })} />
          <StatCard label="Total athletes" value={data.summary?.total_athletes} active={isActive("athletes_all")}
            onClick={() => openDrill({ type: "athletes_all", label: "All athletes" })} />
          <StatCard label="DAU" value={latestDau?.dau} sub={latestDau?.day} active={isActive("dau_trend")}
            onClick={() => openDrill({ type: "dau_trend", label: "DAU trend" })} />
          <StatCard label="WAU" value={latestWau?.wau} sub={latestWau?.week_start} />
          <StatCard label="MAU" value={latestMau?.mau} sub={latestMau?.month_start} />
          <StatCard label="D1 retention" value={latestRetention?.d1_pct != null ? `${latestRetention.d1_pct}%` : "—"} sub={latestRetention?.cohort_day}
            active={isActive("retention")} onClick={() => openDrill({ type: "retention", label: "Retention cohorts" })} />
          <StatCard label="D7 retention" value={latestRetention?.d7_pct != null ? `${latestRetention.d7_pct}%` : "—"} />
          <StatCard label="D30 retention" value={latestRetention?.d30_pct != null ? `${latestRetention.d30_pct}%` : "—"} />
          <StatCard label="Sessions / athlete / wk" value={latestSessions?.avg_sessions_per_athlete} sub={latestSessions?.week_start} />
          <StatCard label="Training days / wk" value={latestTraining?.avg_training_days_per_athlete} sub={latestTraining?.week_start} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12, marginBottom: 28 }}>
          <StatCard label="Open backlog" value={fb?.open_total ?? 0} sub={`${fb?.open_bugs ?? 0} bugs · ${fb?.open_features ?? 0} ideas`}
            active={drill?.value === "backlog"}
            onClick={() => openDrill({ type: "feedback", value: "backlog", label: "Feedback backlog" })} />
          <StatCard label="Open bugs" value={fb?.open_bugs ?? 0} active={drill?.value === "open_bugs"}
            onClick={() => openDrill({ type: "feedback", value: "open_bugs", label: "Open bugs" })} />
          <StatCard label="Open features" value={fb?.open_features ?? 0} active={drill?.value === "open_features"}
            onClick={() => openDrill({ type: "feedback", value: "open_features", label: "Open feature ideas" })} />
          <StatCard label="Feedback total" value={fb?.total ?? 0} active={isActive("feedback")}
            onClick={() => openDrill({ type: "feedback", value: "general", label: "All feedback" })} />
          <StatCard label="Avg rating" value={fb?.avg_rating ?? "—"} />
          <StatCard label="👍 / 👎" value={`${fb?.thumbs_up ?? 0} / ${fb?.thumbs_down ?? 0}`} />
          <StatCard label="All bugs" value={fb?.bugs ?? 0} active={drill?.value === "bug"}
            onClick={() => openDrill({ type: "feedback", value: "bug", label: "All bug reports" })} />
          <StatCard label="All features" value={fb?.feature_requests ?? 0}
            onClick={() => openDrill({ type: "feedback", value: "feature_request", label: "All feature requests" })} />
        </div>

        <DataTable title="Feedback backlog (open items)" hint="Export: select * from feedback_backlog in Supabase SQL"
          columns={[
            { key: "created_at", label: "When" },
            { key: "status", label: "Status" },
            { key: "category", label: "Type" },
            { key: "title", label: "Summary" },
            { key: "app_version", label: "App" },
          ]}
          rows={data.backlog}
          onRowClick={() => openDrill({ type: "feedback", value: "backlog", label: "Feedback backlog" })} />

        <DataTable title="Top screens" hint="Click a row for recent views"
          columns={[{ key: "screen", label: "Screen" }, { key: "views", label: "Views" }, { key: "unique_athletes", label: "Athletes" }]}
          rows={data.screens}
          onRowClick={row => openDrill({ type: "screen", value: row.screen, label: `Screen: ${row.screen}` })} />

        <DataTable title="Top exercises" hint="Click a row for recent completions"
          columns={[{ key: "exercise_id", label: "Exercise" }, { key: "completions", label: "Completions" }, { key: "unique_athletes", label: "Athletes" }]}
          rows={data.exercises}
          onRowClick={row => openDrill({ type: "exercise", value: row.exercise_id, label: `Exercise: ${row.exercise_id}` })} />

        <DataTable title="Most favorited exercises" hint="Click a row for recent favorites"
          columns={[{ key: "exercise_id", label: "Exercise" }, { key: "favorites", label: "Favorites" }, { key: "unique_athletes", label: "Athletes" }]}
          rows={data.favoritedExercises}
          onRowClick={row => openDrill({ type: "exercise_favorite", value: row.exercise_id, label: `Favorited: ${row.exercise_id}` })} />

        <DataTable title="Top programs" hint="Click a row for session completions"
          columns={[{ key: "program_id", label: "Program" }, { key: "session_completions", label: "Sessions" }, { key: "unique_athletes", label: "Athletes" }]}
          rows={data.programs}
          onRowClick={row => openDrill({ type: "program", value: row.program_id, label: `Program: ${row.program_id}` })} />

        <DataTable title="Mission completion" hint="Click a day for mission claims"
          columns={[{ key: "day", label: "Day" }, { key: "active", label: "Active" }, { key: "mission_claims", label: "Claims" }, { key: "mission_rate_pct", label: "Rate %" }]}
          rows={data.mission}
          onRowClick={row => openDrill({ type: "mission_day", value: row.day, label: `Missions — ${row.day}` })} />

        <DataTable title="Challenges" hint="Click for completion events"
          columns={[{ key: "challenge_id", label: "Challenge" }, { key: "completions", label: "Completions" }, { key: "unique_athletes", label: "Athletes" }]}
          rows={data.challenges}
          onRowClick={row => openDrill({ type: "challenge", value: row.challenge_id, label: `Challenge: ${row.challenge_id}` })} />

        <DataTable title="Badges" hint="Click for earn events"
          columns={[{ key: "badge_id", label: "Badge" }, { key: "earns", label: "Earns" }, { key: "unique_athletes", label: "Athletes" }]}
          rows={data.badges}
          onRowClick={row => openDrill({ type: "badge", value: row.badge_id, label: `Badge: ${row.badge_id}` })} />
      </div>
    </div>
  );
}
