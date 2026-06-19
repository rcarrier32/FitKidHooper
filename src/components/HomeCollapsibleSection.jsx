export default function HomeCollapsibleSection({ title, hint, open, onToggle, children, labelStyle, accentColor }) {
  const caretColor = accentColor || labelStyle?.color || "#94a3b8";
  return (
    <div style={{ marginBottom: 2 }}>
      <button type="button" onClick={onToggle}
        style={{ width:"calc(100% - 40px)", margin:"0 20px", padding:"12px 0 10px", border:"none", background:"transparent",
          cursor:"pointer", display:"flex", alignItems:"center", gap:10, textAlign:"left" }}>
        <div style={{ ...labelStyle, marginBottom:0, flex:1 }}>{title}</div>
        {hint && <span style={{ fontSize:12, color:caretColor, fontWeight:700, opacity:0.85 }}>{hint}</span>}
        <span style={{ fontSize:18, color:caretColor, fontWeight:800, flexShrink:0, transform:open ? "rotate(0deg)" : "rotate(-90deg)", transition:"transform 0.2s" }}>▼</span>
      </button>
      {open && children}
    </div>
  );
}
