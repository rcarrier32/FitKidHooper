/**
 * Build a YouTube embed URL, optionally clipped to a [start, end] segment.
 *
 * "Clipping" here is NOT downloading or re-hosting — it uses YouTube's native
 * ?start= / ?end= params so the player just plays the chosen seconds of the
 * original video, still streamed from (and attributed to) YouTube. Legal, and
 * needs no video editing — only the in/out timestamps.
 *
 * start / end are whole seconds from the beginning of the video. Either may be
 * omitted; a missing/zero/invalid value is dropped so the clip falls back to the
 * whole video. `end` without `start` is valid (plays 0 → end).
 *
 *   youtubeEmbedUrl("abc123", { start: 12, end: 30 })
 *   // https://www.youtube.com/embed/abc123?autoplay=1&playsinline=1&rel=0&modestbranding=1&start=12&end=30
 */
export function youtubeEmbedUrl(videoId, { start, end, autoplay = true } = {}) {
  if (!videoId) return "";
  const params = new URLSearchParams();
  if (autoplay) params.set("autoplay", "1");
  params.set("playsinline", "1");
  params.set("rel", "0");
  params.set("modestbranding", "1");

  const s = Math.floor(Number(start));
  const e = Math.floor(Number(end));
  if (Number.isFinite(s) && s > 0) params.set("start", String(s));
  // Only honor a positive end that is after start (or standalone).
  if (Number.isFinite(e) && e > 0 && (!Number.isFinite(s) || e > s)) params.set("end", String(e));

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}
