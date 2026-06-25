/** Personal weekly challenges — local progress tracked from completed drills + shots. */

import { readShotLog } from "./shotLog.js";
import { parseStoredObject } from "./storageParse.js";

export const CHALLENGES_DEF = [
  { id:"streak-3",   emoji:"🔥", name:"3-Day Streak",    type:"streak",    target:3,  desc:"Train 3 days in a row",              reward:"On Fire 🔥" },
  { id:"streak-7",   emoji:"💪", name:"Week Warrior",    type:"streak",    target:7,  desc:"Train all 7 days this week",         reward:"Week Warrior 💪" },
  { id:"jump-5",     emoji:"💥", name:"Jump Week",       type:"cat_week",  target:5,  cat:"explosion", desc:"5 explosion drills this week",   reward:"Sky High 💥" },
  { id:"shots-50",   emoji:"🏀", name:"50 Shots Made",   type:"shots_week",target:50, desc:"Make 50 shots this week",            reward:"Buckets 🏀" },
  { id:"cs-25",      emoji:"🤲", name:"Catch & Shoot",   type:"shot_style_week", style:"catch_shoot", target:25, desc:"Log 25 catch & shoot makes this week", reward:"Quick Trigger 🤲" },
  { id:"pull-20",    emoji:"🏃", name:"Pull-Up Week",    type:"shot_style_week", style:"pull_up", target:20, desc:"Log 20 dribble pull-up makes this week", reward:"Rising Fire 🏃" },
  { id:"step-15",    emoji:"↩️", name:"Step Back Week",  type:"shot_style_week", style:"step_back", target:15, desc:"Log 15 step-back makes this week",   reward:"Space Creator ↩️" },
  { id:"handles-5",  emoji:"🤲", name:"Handle Master",   type:"cat_week",  target:5,  cat:"handles",   desc:"5 handle drills this week",      reward:"Handle King 🤲" },
  { id:"speed-5",    emoji:"⚡", name:"Speed Week",      type:"cat_week",  target:5,  cat:"speed",     desc:"5 speed drills this week",       reward:"Jet Feet ⚡" },
  { id:"today-3",    emoji:"🎯", name:"Full Send",       type:"day_count", target:3,  desc:"Complete 3+ drills today",           reward:"Full Send 🎯" },
  { id:"coord-5",    emoji:"🎶", name:"Coordination",   type:"cat_week",  target:5,  cat:"coordination", desc:"5 coordination drills this week", reward:"Body Control 🎶" },
];

export function challengeWeekStart() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toLocaleDateString("en-CA");
}

/** @param {Record<string, Array<{ id: string }>>} [workouts] category → drill list */
export function getChallengeProgress(def, completed, workouts = {}) {
  const done = parseStoredObject(completed, {});
  const today = new Date().toLocaleDateString("en-CA");
  const ws = challengeWeekStart();
  if (def.type === "streak") {
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 14; i++) {
      const k = d.toLocaleDateString("en-CA");
      if (Object.keys(done).some(c => c.startsWith(k) && done[c])) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else break;
    }
    return { cur: streak, target: def.target };
  }
  if (def.type === "cat_week") {
    const ids = new Set((workouts[def.cat] || []).map(e => e.id));
    const cur = Object.keys(done).filter(k => {
      const dateStr = k.split("-").slice(0, 3).join("-");
      if (dateStr < ws) return false;
      return done[k] && ids.has(k.split("-").slice(3).join("-"));
    }).length;
    return { cur, target: def.target };
  }
  if (def.type === "shots_week") {
    const sl = readShotLog();
    const cur = Object.keys(sl).filter(k => k >= ws).flatMap(k => sl[k] || []).filter(s => s.made !== false).length;
    return { cur, target: def.target };
  }
  if (def.type === "shot_style_week") {
    const sl = readShotLog();
    const cur = Object.keys(sl).filter(k => k >= ws).flatMap(k => sl[k] || [])
      .filter(s => s.made !== false && s.style === def.style).length;
    return { cur, target: def.target };
  }
  if (def.type === "day_count") {
    const cur = Object.keys(done).filter(k => k.startsWith(today) && done[k]).length;
    return { cur, target: def.target };
  }
  return { cur: 0, target: def.target };
}

export function buildPersonalChallenges(completed, workouts = {}) {
  return CHALLENGES_DEF.map(def => {
    const { cur, target } = getChallengeProgress(def, completed, workouts);
    const pct = target > 0 ? Math.min(100, Math.round((cur / target) * 100)) : 0;
    return { def, cur, target, pct, done: cur >= target };
  });
}
