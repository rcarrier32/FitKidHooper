import { useState, useEffect, useRef, useCallback } from "react";
import { cropAvatarPreview } from "../lib/avatarCloud.js";

const VIEW = 280;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export default function AvatarCropSheet({
  open,
  imageSrc,
  onConfirm,
  onCancel,
  accent = "#f97316",
  busy = false,
}) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [imgSize, setImgSize] = useState({ w: 1, h: 1 });
  const [minScale, setMinScale] = useState(1);
  const drag = useRef(null);

  useEffect(() => {
    if (!open || !imageSrc) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const cover = Math.max(VIEW / img.width, VIEW / img.height);
      setImgSize({ w: img.width, h: img.height });
      setMinScale(cover);
      setScale(cover * 1.05);
      setOffset({ x: 0, y: 0 });
    };
    img.src = imageSrc;
    return () => { cancelled = true; };
  }, [open, imageSrc]);

  const clampOffset = useCallback((nextScale, nextOffset) => {
    const dw = imgSize.w * nextScale;
    const dh = imgSize.h * nextScale;
    const maxX = Math.max(0, (dw - VIEW) / 2);
    const maxY = Math.max(0, (dh - VIEW) / 2);
    return {
      x: clamp(nextOffset.x, -maxX, maxX),
      y: clamp(nextOffset.y, -maxY, maxY),
    };
  }, [imgSize]);

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };

  const onPointerMove = (e) => {
    if (!drag.current || drag.current.id !== e.pointerId) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    setOffset(clampOffset(scale, { x: drag.current.ox + dx, y: drag.current.oy + dy }));
  };

  const onPointerUp = (e) => {
    if (drag.current?.id === e.pointerId) drag.current = null;
  };

  const onScaleChange = (next) => {
    const s = clamp(next, minScale, minScale * 3);
    setScale(s);
    setOffset(prev => clampOffset(s, prev));
  };

  const handleUsePhoto = async () => {
    const dataUrl = await cropAvatarPreview(imageSrc, { scale, offset, viewport: VIEW });
    onConfirm?.(dataUrl);
  };

  if (!open || !imageSrc) return null;

  const drawW = imgSize.w * scale;
  const drawH = imgSize.h * scale;
  const left = VIEW / 2 + offset.x - drawW / 2;
  const top = VIEW / 2 + offset.y - drawH / 2;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.88)",
      display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(6px)",
    }}>
      <div style={{
        width: "100%", maxWidth: 420, background: "#111827", borderRadius: "22px 22px 0 0",
        padding: "16px 20px 28px",
      }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#f8fafc", marginBottom: 6 }}>Choose your photo area</div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 14, lineHeight: 1.45 }}>
          Drag to move · pinch or slide to zoom · circle shows your profile picture
        </div>

        <div
          style={{
            position: "relative", width: VIEW, height: VIEW, margin: "0 auto 16px",
            borderRadius: 16, overflow: "hidden", background: "#0b1220", touchAction: "none",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <img
            src={imageSrc}
            alt=""
            draggable={false}
            style={{
              position: "absolute", left, top, width: drawW, height: drawH,
              userSelect: "none", pointerEvents: "none",
            }}
          />
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            boxShadow: "inset 0 0 0 9999px rgba(0,0,0,0.45)",
          }} />
          <div style={{
            position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)",
            width: VIEW - 24, height: VIEW - 24, borderRadius: "50%",
            border: `3px solid ${accent}`, boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)", pointerEvents: "none",
          }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: "#64748b", marginBottom: 6, fontWeight: 700, letterSpacing: "0.08em" }}>ZOOM</div>
          <input
            type="range"
            min={minScale}
            max={minScale * 3}
            step={0.01}
            value={scale}
            onChange={e => onScaleChange(Number(e.target.value))}
            style={{ width: "100%", accentColor: accent }}
          />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            style={{
              flex: 1, padding: "14px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)",
              background: "transparent", color: "#94a3b8", fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUsePhoto}
            disabled={busy}
            style={{
              flex: 2, padding: "14px 12px", borderRadius: 12, border: "none",
              background: accent, color: "#000", fontSize: 14, fontWeight: 800, cursor: busy ? "wait" : "pointer",
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? "Saving…" : "Use Photo ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}
