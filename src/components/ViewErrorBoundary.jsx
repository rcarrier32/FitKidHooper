import { Component } from "react";

/** Keeps one tab/view usable if a child component throws during render. */
export default class ViewErrorBoundary extends Component {
  state = { error: null, attempt: 0 };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error(`[fkh] ${this.props.label || "view"} crashed`, error, info);
    try { window.__FKH_LAST_ERROR__ = { message: error?.message, stack: error?.stack, info }; } catch { /* ignore */ }
  }

  retry = () => {
    this.setState(s => ({ error: null, attempt: s.attempt + 1 }));
    this.props.onRetry?.();
  };

  render() {
    if (this.state.error) {
      const P = this.props.P || "#f97316";
      const err = this.state.error;
      const detail = err?.message ? String(err.message) : "";
      return (
        <div style={{
          margin: 20, padding: 20, borderRadius: 14,
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
          color: "var(--fkh-text, #e2e8f0)", fontSize: 13, lineHeight: 1.5,
        }}>
          <div style={{ fontWeight: 800, marginBottom: 8, color: "#f87171" }}>
            {this.props.title || "Something went wrong"}
          </div>
          <p style={{ margin: "0 0 12px", color: "#94a3b8" }}>
            {this.props.message || "This section hit a bug. Tap try again — your training data is still saved."}
          </p>
          {detail && (
            <p style={{ margin: "0 0 12px", fontSize: 11, color: "#64748b", fontFamily: "'DM Mono',monospace", wordBreak: "break-word" }}>
              {detail}
            </p>
          )}
          <button
            type="button"
            onClick={this.retry}
            style={{
              padding: "10px 14px", borderRadius: 10, border: "none",
              background: P, color: "#000", fontWeight: 800, cursor: "pointer", fontSize: 12,
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return <div key={this.state.attempt}>{this.props.children}</div>;
  }
}
