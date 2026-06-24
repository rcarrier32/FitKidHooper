import { Component } from "react";
import { readShotLog, writeShotLog } from "../lib/shotLog.js";

/** Catches ShotTracker render errors so the rest of the app stays usable. */
export default class ShotTrackerErrorBoundary extends Component {
  state = { error: null, attempt: 0 };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[fkh] ShotTracker crashed", error, info);
  }

  repair = () => {
    try {
      writeShotLog(readShotLog());
    } catch { /* ignore */ }
    this.setState(s => ({ error: null, attempt: s.attempt + 1 }));
    this.props.onRepaired?.();
  };

  render() {
    if (this.state.error) {
      const P = this.props.P || "#f97316";
      return (
        <div style={{
          margin: 20, padding: 20, borderRadius: 14,
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
          color: "var(--fkh-text)", fontSize: 13, lineHeight: 1.5,
        }}>
          <div style={{ fontWeight: 800, marginBottom: 8, color: "#f87171" }}>Shots couldn&apos;t load</div>
          <p style={{ margin: "0 0 12px", color: "#94a3b8" }}>
            Your shot log may be in an old format. Tap repair — we&apos;ll keep valid makes and fix the rest.
          </p>
          <button
            type="button"
            onClick={this.repair}
            style={{
              padding: "10px 14px", borderRadius: 10, border: "none",
              background: P, color: "#000", fontWeight: 800, cursor: "pointer", fontSize: 12,
            }}
          >
            Repair shot log
          </button>
        </div>
      );
    }
    return (
      <div key={this.state.attempt}>
        {this.props.children}
      </div>
    );
  }
}
