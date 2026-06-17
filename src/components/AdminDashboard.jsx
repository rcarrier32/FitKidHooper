import { useEffect, useState } from "react";
import { getSupabaseClient, isSupabaseConfigured } from "../lib/supabaseClient.js";

function StatCard({ label, value, sub }) {
  return (
    <div style={{ background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"14px 16px" }}>
      <div style={{ fontSize:11,color:"#64748b",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.08em" }}>{label}</div>
      <div style={{ fontSize:28,fontWeight:800,color:"#f8fafc",fontFamily:"'DM Mono',monospace" }}>{value ?? "—"}</div>
      {sub && <div style={{ fontSize:11,color:"#475569",marginTop:4 }}>{sub}</div>}
    </div>
  );
}

function Table({ title, columns, rows }) {
  return (
    <div style={{ marginBottom:24 }}>
      <h3 style={{ fontSize:14,fontWeight:700,color:"#e2e8f0",margin:"0 0 10px" }}>{title}</h3>
      <div style={{ overflowX:"auto",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12 }}>
        <table style={{ width:"100%",borderCollapse:"collapse",fontSize:12 }}>
          <thead>
            <tr style={{ background:"rgba(255,255,255,0.04)" }}>
              {columns.map(c => (
                <th key={c.key} style={{ textAlign:"left",padding:"10px 12px",color:"#94a3b8",fontWeight:600 }}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(rows || []).slice(0, 15).map((row, i) => (
              <tr key={i} style={{ borderTop:"1px solid rgba(255,255,255,0.06)" }}>
                {columns.map(c => (
                  <td key={c.key} style={{ padding:"9px 12px",color:"#cbd5e1" }}>{row[c.key] ?? "—"}</td>
                ))}
              </tr>
            ))}
            {(!rows || rows.length === 0) && (
              <tr><td colSpan={columns.length} style={{ padding:16,color:"#475569",textAlign:"center" }}>No data yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const configured = isSupabaseConfigured();
  const [data, setData] = useState(null);
  const [error, setError] = useState(configured ? null : "Supabase is not configured.");
  const [loading, setLoading] = useState(configured);

  useEffect(() => {
    if (!configured) return;
    const sb = getSupabaseClient();
    if (!sb) return;

    (async () => {
      try {
        const [
          summary,
          dau,
          wau,
          mau,
          retention,
          sessions,
          trainingDays,
          screens,
          exercises,
          programs,
          mission,
          challenges,
          badges,
          feedbackSummary,
          featureRequests,
        ] = await Promise.all([
          sb.from("analytics_athlete_summary").select("*").maybeSingle(),
          sb.from("analytics_dau").select("*").order("day", { ascending: false }).limit(14),
          sb.from("analytics_wau").select("*").order("week_start", { ascending: false }).limit(8),
          sb.from("analytics_mau").select("*").order("month_start", { ascending: false }).limit(6),
          sb.from("analytics_retention").select("*").order("cohort_day", { ascending: false }).limit(12),
          sb.from("analytics_sessions_per_week").select("*").order("week_start", { ascending: false }).limit(8),
          sb.from("analytics_training_days_per_week").select("*").order("week_start", { ascending: false }).limit(8),
          sb.from("analytics_top_screens").select("*").limit(10),
          sb.from("analytics_top_exercises").select("*").limit(10),
          sb.from("analytics_top_programs").select("*").limit(10),
          sb.from("analytics_mission_completion").select("*").order("day", { ascending: false }).limit(14),
          sb.from("analytics_challenge_completion").select("*").limit(10),
          sb.from("analytics_badge_distribution").select("*").limit(10),
          sb.from("feedback_summary").select("*").maybeSingle(),
          sb.from("feedback_feature_requests").select("*").limit(10),
        ]);

        const err = [summary, dau, wau, retention, screens, exercises, programs, feedbackSummary, featureRequests]
          .map(r => r.error).find(Boolean);
        if (err) throw err;

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
          programs: programs.data,
          mission: mission.data,
          challenges: challenges.data,
          badges: badges.data,
          feedbackSummary: feedbackSummary.data,
          featureRequests: featureRequests.data,
        });
      } catch (e) {
        setError(e.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [configured]);

  if (loading) {
    return <div style={{ minHeight:"100vh",background:"#060b14",color:"#94a3b8",display:"flex",alignItems:"center",justifyContent:"center" }}>Loading analytics…</div>;
  }

  if (error) {
    return (
      <div style={{ minHeight:"100vh",background:"#060b14",color:"#f87171",padding:24,maxWidth:720,margin:"0 auto" }}>
        <h1 style={{ color:"#f8fafc" }}>FKH Admin Dashboard</h1>
        <p>{error}</p>
        <p style={{ color:"#64748b",fontSize:13 }}>Run <code>supabase/analytics.sql</code> in your Supabase SQL editor.</p>
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

  return (
    <div style={{ minHeight:"100vh",background:"#060b14",color:"#e2e8f0",fontFamily:"'DM Sans',sans-serif",padding:"24px 20px 48px" }}>
      <div style={{ maxWidth:960,margin:"0 auto" }}>
        <h1 style={{ fontSize:24,fontWeight:800,margin:"0 0 4px",letterSpacing:"-0.02em" }}>FKH Product Dashboard</h1>
        <p style={{ fontSize:13,color:"#64748b",margin:"0 0 24px" }}>First-100-users learning view · refresh to update</p>

        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12,marginBottom:28 }}>
          <StatCard label="Active (7d)" value={data.summary?.active_athletes_7d} />
          <StatCard label="New (7d)" value={data.summary?.new_athletes_7d} />
          <StatCard label="Total athletes" value={data.summary?.total_athletes} />
          <StatCard label="DAU" value={latestDau?.dau} sub={latestDau?.day} />
          <StatCard label="WAU" value={latestWau?.wau} sub={latestWau?.week_start} />
          <StatCard label="MAU" value={latestMau?.mau} sub={latestMau?.month_start} />
          <StatCard label="D1 retention" value={latestRetention?.d1_pct != null ? `${latestRetention.d1_pct}%` : "—"} sub={latestRetention?.cohort_day} />
          <StatCard label="D7 retention" value={latestRetention?.d7_pct != null ? `${latestRetention.d7_pct}%` : "—"} />
          <StatCard label="D30 retention" value={latestRetention?.d30_pct != null ? `${latestRetention.d30_pct}%` : "—"} />
          <StatCard label="Sessions / athlete / wk" value={latestSessions?.avg_sessions_per_athlete} sub={latestSessions?.week_start} />
          <StatCard label="Training days / wk" value={latestTraining?.avg_training_days_per_athlete} sub={latestTraining?.week_start} />
        </div>

        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12,marginBottom:28 }}>
          <StatCard label="Feedback total" value={fb?.total ?? 0} />
          <StatCard label="Avg rating" value={fb?.avg_rating ?? "—"} />
          <StatCard label="👍 / 👎" value={`${fb?.thumbs_up ?? 0} / ${fb?.thumbs_down ?? 0}`} />
          <StatCard label="Feature requests" value={fb?.feature_requests ?? 0} sub={`${fb?.bugs ?? 0} bugs`} />
        </div>

        <Table title="Top screens" columns={[
          { key:"screen", label:"Screen" },
          { key:"views", label:"Views" },
          { key:"unique_athletes", label:"Athletes" },
        ]} rows={data.screens} />

        <Table title="Top exercises" columns={[
          { key:"exercise_id", label:"Exercise" },
          { key:"completions", label:"Completions" },
          { key:"unique_athletes", label:"Athletes" },
        ]} rows={data.exercises} />

        <Table title="Top programs" columns={[
          { key:"program_id", label:"Program" },
          { key:"session_completions", label:"Sessions done" },
          { key:"unique_athletes", label:"Athletes" },
        ]} rows={data.programs} />

        <Table title="Mission completion (recent days)" columns={[
          { key:"day", label:"Day" },
          { key:"active", label:"Active" },
          { key:"mission_claims", label:"Claims" },
          { key:"mission_rate_pct", label:"Rate %" },
        ]} rows={data.mission} />

        <Table title="Challenge completions" columns={[
          { key:"challenge_id", label:"Challenge" },
          { key:"completions", label:"Completions" },
        ]} rows={data.challenges} />

        <Table title="Badge earns" columns={[
          { key:"badge_id", label:"Badge" },
          { key:"earns", label:"Earns" },
        ]} rows={data.badges} />

        <Table title="Recent feature requests" columns={[
          { key:"message", label:"Message" },
          { key:"rating", label:"Rating" },
          { key:"created_at", label:"When" },
        ]} rows={data.featureRequests} />
      </div>
    </div>
  );
}
