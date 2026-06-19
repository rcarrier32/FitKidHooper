/** Load drill-down detail for the admin dashboard. */

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function shortId(id) {
  if (!id) return "—";
  return `${String(id).slice(0, 8)}…`;
}

/** Prefer a human label (username, then real name) over the raw device/user id. */
function athleteLabel(r) {
  if (r.username) return `@${r.username}`;
  if (r.display_name) return r.display_name;
  return `${shortId(r.athlete_id)} (guest)`;
}

function fmtTime(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString();
}

export async function loadDrilldown(sb, drill) {
  if (!sb || !drill?.type) return { rows: [], columns: [], meta: {} };

  const { type, value, label } = drill;

  if (type === "athletes_active") {
    const { data, error } = await sb
      .from("athlete_rollup")
      .select("athlete_id, username, display_name, age_group, first_session_at, last_session_at, app_version")
      .gte("last_session_at", daysAgo(7))
      .order("last_session_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return {
      title: label || "Active athletes (7d)",
      columns: [
        { key: "athlete_id", label: "Athlete" },
        { key: "age_group", label: "Age" },
        { key: "last_session_at", label: "Last session" },
        { key: "first_session_at", label: "First seen" },
      ],
      rows: (data || []).map(r => ({
        ...r,
        athlete_id: athleteLabel(r),
        _athlete_id: r.athlete_id,
        last_session_at: fmtTime(r.last_session_at),
        first_session_at: fmtTime(r.first_session_at),
      })),
      rowDrill: { type: "athlete", idKey: "_athlete_id", labelKey: "athlete_id" },
    };
  }

  if (type === "athletes_all") {
    const { data, error } = await sb
      .from("athlete_rollup")
      .select("athlete_id, username, display_name, age_group, first_session_at, last_session_at")
      .order("last_session_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return {
      title: label || "All athletes",
      columns: [
        { key: "athlete_id", label: "Athlete" },
        { key: "age_group", label: "Age" },
        { key: "last_session_at", label: "Last session" },
        { key: "first_session_at", label: "First seen" },
      ],
      rows: (data || []).map(r => ({
        ...r,
        athlete_id: athleteLabel(r),
        _athlete_id: r.athlete_id,
        last_session_at: fmtTime(r.last_session_at),
        first_session_at: fmtTime(r.first_session_at),
      })),
      rowDrill: { type: "athlete", idKey: "_athlete_id", labelKey: "athlete_id" },
    };
  }

  if (type === "athletes_new") {
    const { data, error } = await sb
      .from("athlete_rollup")
      .select("athlete_id, username, display_name, age_group, first_session_at, last_session_at")
      .gte("first_session_at", daysAgo(7))
      .order("first_session_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return {
      title: label || "New athletes (7d)",
      columns: [
        { key: "athlete_id", label: "Athlete" },
        { key: "age_group", label: "Age" },
        { key: "first_session_at", label: "First seen" },
        { key: "last_session_at", label: "Last session" },
      ],
      rows: (data || []).map(r => ({
        ...r,
        athlete_id: athleteLabel(r),
        _athlete_id: r.athlete_id,
        first_session_at: fmtTime(r.first_session_at),
        last_session_at: fmtTime(r.last_session_at),
      })),
      rowDrill: { type: "athlete", idKey: "_athlete_id", labelKey: "athlete_id" },
    };
  }

  if (type === "dau_trend") {
    const { data, error } = await sb
      .from("analytics_dau")
      .select("*")
      .order("day", { ascending: false })
      .limit(30);
    if (error) throw error;
    return {
      title: label || "DAU — last 30 days",
      columns: [{ key: "day", label: "Day" }, { key: "dau", label: "Active users" }],
      rows: data || [],
      rowDrill: { type: "dau_day", idKey: "day", labelKey: "day" },
    };
  }

  if (type === "dau_day") {
    const day = value;
    const start = `${day}T00:00:00.000Z`;
    const end = `${day}T23:59:59.999Z`;
    const { data, error } = await sb
      .from("events")
      .select("athlete_id, created_at, app_version, age_group")
      .eq("event_name", "session_start")
      .gte("created_at", start)
      .lte("created_at", end)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    const seen = new Set();
    const rows = [];
    for (const row of data || []) {
      if (seen.has(row.athlete_id)) continue;
      seen.add(row.athlete_id);
      rows.push({
        athlete_id: shortId(row.athlete_id),
        _athlete_id: row.athlete_id,
        age_group: row.age_group,
        session_at: fmtTime(row.created_at),
      });
    }
    return {
      title: label || `Sessions on ${day}`,
      columns: [
        { key: "athlete_id", label: "Athlete" },
        { key: "age_group", label: "Age" },
        { key: "session_at", label: "Session" },
      ],
      rows,
      rowDrill: { type: "athlete", idKey: "_athlete_id", labelKey: "athlete_id" },
    };
  }

  if (type === "retention") {
    const { data, error } = await sb
      .from("analytics_retention")
      .select("*")
      .order("cohort_day", { ascending: false })
      .limit(20);
    if (error) throw error;
    return {
      title: label || "Retention by cohort",
      columns: [
        { key: "cohort_day", label: "Cohort" },
        { key: "cohort_size", label: "Size" },
        { key: "d1_pct", label: "D1 %" },
        { key: "d7_pct", label: "D7 %" },
        { key: "d30_pct", label: "D30 %" },
      ],
      rows: data || [],
    };
  }

  if (type === "screen") {
    const { data, error } = await sb
      .from("events")
      .select("created_at, athlete_id, properties")
      .eq("event_name", "screen_view")
      .eq("properties->>screen", value)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return eventRows(data, label || `Screen: ${value}`);
  }

  if (type === "exercise") {
    const { data, error } = await sb
      .from("events")
      .select("created_at, athlete_id, properties, age_group")
      .eq("event_name", "exercise_complete")
      .eq("properties->>exercise_id", value)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return eventRows(data, label || `Exercise: ${value}`);
  }

  if (type === "program") {
    const { data, error } = await sb
      .from("events")
      .select("created_at, athlete_id, properties, age_group")
      .eq("event_name", "program_session_complete")
      .eq("properties->>program_id", value)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return eventRows(data, label || `Program: ${value}`);
  }

  if (type === "challenge") {
    const { data, error } = await sb
      .from("events")
      .select("created_at, athlete_id, properties")
      .eq("event_name", "challenge_complete")
      .eq("properties->>challenge_id", value)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return eventRows(data, label || `Challenge: ${value}`);
  }

  if (type === "badge") {
    const { data, error } = await sb
      .from("events")
      .select("created_at, athlete_id, properties")
      .eq("event_name", "badge_earn")
      .eq("properties->>badge_id", value)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return eventRows(data, label || `Badge: ${value}`);
  }

  if (type === "mission_day") {
    const day = value;
    const start = `${day}T00:00:00.000Z`;
    const end = `${day}T23:59:59.999Z`;
    const { data, error } = await sb
      .from("events")
      .select("created_at, athlete_id, event_name, properties")
      .eq("event_name", "mission_claim")
      .gte("created_at", start)
      .lte("created_at", end)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return eventRows(data, label || `Mission claims — ${day}`);
  }

  if (type === "feedback") {
    const table = value === "bug" ? "feedback_bugs"
      : value === "feature_request" ? "feedback_feature_requests"
      : "feedback_general";
    const { data, error } = await sb
      .from(table)
      .select("created_at, rating, sentiment, message, athlete_id")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return {
      title: label || `Feedback — ${value}`,
      columns: [
        { key: "created_at", label: "When" },
        { key: "rating", label: "Rating" },
        { key: "sentiment", label: "Sentiment" },
        { key: "message", label: "Message" },
      ],
      rows: (data || []).map(r => ({
        ...r,
        created_at: fmtTime(r.created_at),
        message: r.message || "—",
        rating: r.rating ?? "—",
        sentiment: r.sentiment ?? "—",
      })),
    };
  }

  if (type === "athlete") {
    const athleteId = value;
    const [eventsRes, profileRes] = await Promise.all([
      sb.from("events")
        .select("event_name, properties, created_at")
        .eq("athlete_id", athleteId)
        .order("created_at", { ascending: false })
        .limit(150),
      sb.from("athlete_rollup")
        .select("*")
        .eq("athlete_id", athleteId)
        .maybeSingle(),
    ]);
    if (eventsRes.error) throw eventsRes.error;
    const p = profileRes.data;
    return {
      title: label || (p ? athleteLabel(p) : `Athlete ${shortId(athleteId)}`),
      meta: p ? {
        username: p.username ? `@${p.username}` : "—",
        name: p.display_name || "—",
        age_group: p.age_group,
        first_session: fmtTime(p.first_session_at),
        last_session: fmtTime(p.last_session_at),
      } : {},
      columns: [
        { key: "created_at", label: "When" },
        { key: "event_name", label: "Event" },
        { key: "detail", label: "Detail" },
      ],
      rows: (eventsRes.data || []).map(r => ({
        created_at: fmtTime(r.created_at),
        event_name: r.event_name,
        detail: formatEventDetail(r),
      })),
    };
  }

  if (type === "recent_events") {
    const { data, error } = await sb
      .from("events")
      .select("created_at, athlete_id, event_name, properties")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return {
      title: label || "Recent events",
      columns: [
        { key: "created_at", label: "When" },
        { key: "athlete_id", label: "Athlete" },
        { key: "event_name", label: "Event" },
        { key: "detail", label: "Detail" },
      ],
      rows: (data || []).map(r => ({
        created_at: fmtTime(r.created_at),
        athlete_id: athleteLabel(r),
        _athlete_id: r.athlete_id,
        event_name: r.event_name,
        detail: formatEventDetail(r),
      })),
      rowDrill: { type: "athlete", idKey: "_athlete_id", labelKey: "athlete_id" },
    };
  }

  return { rows: [], columns: [], title: "Unknown drill" };
}

function formatEventDetail(row) {
  const p = row.properties || {};
  if (row.event_name === "screen_view") return p.screen || "—";
  if (row.event_name === "exercise_complete") return p.exercise_id || "—";
  if (row.event_name === "program_session_complete") {
    return `${p.program_id || "?"} w${p.week ?? "?"} s${p.session_idx ?? "?"}`;
  }
  if (row.event_name === "challenge_complete") return p.challenge_id || "—";
  if (row.event_name === "badge_earn") return p.badge_id || "—";
  if (row.event_name === "mission_claim") return p.title || p.mission_day || "claimed";
  if (row.event_name === "shot_session") return `${p.makes ?? 0} makes / ${p.total ?? 0} shots`;
  if (row.event_name === "session_end") return `${p.duration_sec ?? "?"}s`;
  if (row.event_name === "leaderboard_push") return p.success ? "ok" : p.error || "fail";
  const keys = Object.keys(p);
  if (keys.length === 0) return "—";
  return keys.slice(0, 3).map(k => `${k}: ${p[k]}`).join(", ");
}

function eventRows(data, title) {
  return {
    title,
    columns: [
      { key: "created_at", label: "When" },
      { key: "athlete_id", label: "Athlete" },
      { key: "detail", label: "Detail" },
    ],
    rows: (data || []).map(r => ({
      created_at: fmtTime(r.created_at),
      athlete_id: shortId(r.athlete_id),
      _athlete_id: r.athlete_id,
      detail: formatEventDetail(r),
    })),
    rowDrill: { type: "athlete", idKey: "_athlete_id", labelKey: "athlete_id" },
  };
}
