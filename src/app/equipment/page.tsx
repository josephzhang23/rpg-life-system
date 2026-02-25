"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState } from "react";

/* ── Quality ─────────────────────────────────── */
const Q: Record<string, { color: string; label: string; glow: string }> = {
  grey:   { color: "#9d9d9d", label: "普通", glow: "rgba(157,157,157,0.5)" },
  white:  { color: "#e8d5a3", label: "标准", glow: "rgba(232,213,163,0.5)" },
  green:  { color: "#1eff00", label: "优秀", glow: "rgba(30,255,0,0.5)"    },
  blue:   { color: "#0070dd", label: "精良", glow: "rgba(0,112,221,0.6)"   },
  purple: { color: "#a335ee", label: "史诗", glow: "rgba(163,53,238,0.6)"  },
  orange: { color: "#ff8000", label: "传说", glow: "rgba(255,128,0,0.7)"   },
};

const STAT: Record<string, { zh: string; color: string }> = {
  INT:  { zh: "智力", color: "#60a0ff" },
  DISC: { zh: "意志", color: "#ff8040" },
  STR:  { zh: "力量", color: "#ff4060" },
  SOC:  { zh: "魅力", color: "#40d890" },
  CRE:  { zh: "创造", color: "#c060ff" },
};

/* ── Slot definitions ────────────────────────── */
const LEFT  = [
  { id: "head",     zh: "头", icon: "🪖" },
  { id: "neck",     zh: "颈", icon: "📿" },
  { id: "shoulder", zh: "肩", icon: "🎒" },
  { id: "back",     zh: "背", icon: "🗺️" },
  { id: "chest",    zh: "胸", icon: "🪑" },
  { id: "wrist",    zh: "腕", icon: "⌚" },
];
const RIGHT = [
  { id: "hands",    zh: "手",  icon: "⌨️" },
  { id: "waist",    zh: "腰",  icon: "👖" },
  { id: "legs",     zh: "腿",  icon: "🦵" },
  { id: "feet",     zh: "脚",  icon: "👟" },
  { id: "ring1",    zh: "戒",  icon: "💍" },
  { id: "ring2",    zh: "戒",  icon: "💍" },
  { id: "trinket1", zh: "饰品", icon: "🏺" },
  { id: "trinket2", zh: "饰品", icon: "🏺" },
];
const BOTTOM = [
  { id: "main_hand", zh: "主手", icon: "⚔️" },
  { id: "off_hand",  zh: "副手", icon: "🛡️" },
];

const ALL_SLOTS = [...LEFT, ...RIGHT, ...BOTTOM];

/* ── Slot icon ───────────────────────────────── */
function Slot({
  def, item, selected, onClick,
}: { def: any; item?: any; selected: boolean; onClick: () => void }) {
  const q = item ? Q[item.quality] ?? Q.white : null;
  return (
    <div className="flex flex-col items-center" style={{ gap: "3px" }}>
      <button
        onClick={onClick}
        style={{
          width: 48, height: 48, flexShrink: 0,
          background: item
            ? `radial-gradient(ellipse at 50% 30%, ${q!.glow.replace(/[\d.]+\)$/, "0.12)")}, #0c0806)`
            : "#0c0806",
          border: `1.5px solid ${item ? q!.color : "#4a3218"}`,
          borderRadius: "2px",
          boxShadow: selected
            ? `0 0 0 2px #ffd700, 0 0 12px ${q?.glow ?? "rgba(255,215,0,0.4)"}`
            : item ? `0 0 8px ${q!.glow}` : "none",
          position: "relative",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "22px",
          transition: "box-shadow 0.15s",
        }}
      >
        <span style={{ opacity: item ? 1 : 0.18 }}>{item?.icon ?? def.icon}</span>
        {item && (
          <span style={{
            position: "absolute", bottom: 2, right: 2,
            width: 7, height: 7, borderRadius: "50%",
            background: q!.color,
            boxShadow: `0 0 4px ${q!.glow}`,
          }} />
        )}
      </button>
      <span style={{
        fontSize: "9px", color: "rgba(200,160,50,0.4)",
        fontFamily: "'Noto Serif SC', serif", letterSpacing: "1px",
      }}>{def.zh}</span>
    </div>
  );
}

/* ── WoW Tooltip ─────────────────────────────── */
function Tooltip({ item, def }: { item: any; def: any }) {
  const q = Q[item.quality] ?? Q.white;
  return (
    <div style={{
      background: "linear-gradient(135deg, #0f0a04, #120d06)",
      border: `1.5px solid ${q.color}`,
      borderRadius: "3px",
      padding: "14px",
      boxShadow: `0 4px 24px rgba(0,0,0,0.95), 0 0 16px ${q.glow}`,
      maxWidth: "320px",
      width: "100%",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "10px" }}>
        <div style={{
          width: 44, height: 44, flexShrink: 0,
          background: `radial-gradient(ellipse, ${q.glow.replace(/[\d.]+\)$/, "0.2)")}, transparent)`,
          border: `1.5px solid ${q.color}`,
          borderRadius: "2px",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "24px",
        }}>{item.icon}</div>
        <div>
          <div style={{
            fontFamily: "'Cinzel', serif", fontWeight: "bold", fontSize: "14px",
            color: q.color, textShadow: `0 0 8px ${q.glow}`, lineHeight: 1.3,
          }}>{item.name}</div>
          <div style={{
            fontFamily: "'Cinzel', serif", fontSize: "10px", letterSpacing: "2px",
            color: q.color, opacity: 0.65, marginTop: "2px",
          }}>{q.label} · {def?.zh}</div>
        </div>
      </div>

      {/* Stat bonuses */}
      {(item.stat_bonuses ?? []).length > 0 && (
        <div style={{ marginBottom: "10px" }}>
          {item.stat_bonuses.map((b: any, i: number) => (
            <div key={i} style={{
              fontFamily: "'Cinzel', serif", fontSize: "13px",
              color: STAT[b.stat]?.color ?? "#c8a040",
            }}>+{b.value} {STAT[b.stat]?.zh ?? b.stat}</div>
          ))}
        </div>
      )}

      {/* Description */}
      {item.description && (
        <p style={{
          fontFamily: "'Noto Serif SC', serif", fontSize: "12px",
          color: "rgba(200,180,120,0.85)", lineHeight: 1.75, marginBottom: "8px",
        }}>{item.description}</p>
      )}

      {/* Lore */}
      {item.lore && (
        <>
          <div style={{
            height: "1px", margin: "8px 0",
            background: "linear-gradient(90deg, transparent, rgba(200,160,50,0.3), transparent)",
          }} />
          <p style={{
            fontFamily: "'Noto Serif SC', serif", fontSize: "11px",
            color: "rgba(200,180,100,0.5)", lineHeight: 1.8, fontStyle: "italic",
            whiteSpace: "pre-line",
          }}>{item.lore}</p>
        </>
      )}
    </div>
  );
}

/* ── Main page ───────────────────────────────── */
export default function EquipmentPage() {
  const equipment  = useQuery(api.character.getEquipment);
  const dashboard  = useQuery(api.character.getDashboard);
  const [sel, setSel] = useState<string>("main_hand");

  if (!equipment || !dashboard) {
    return (
      <div style={{
        minHeight: "100vh", background: "#0a0805",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontFamily: "'Noto Serif SC', serif", color: "#c8a040", letterSpacing: "3px" }}
          className="animate-pulse">装备加载中…</span>
      </div>
    );
  }

  const equipMap: Record<string, any> = {};
  for (const e of equipment) equipMap[e.slot] = e;

  const statsMap: Record<string, number> = {};
  for (const s of (dashboard.stats ?? [])) {
    const base = Math.floor(Math.sqrt(s.total_xp ?? 0) * 3);
    const bonus = (dashboard.equipmentBonuses as any)?.[s.stat_id] ?? 0;
    statsMap[s.stat_id] = base + bonus;
  }

  const selItem = sel ? equipMap[sel] : null;
  const selDef  = ALL_SLOTS.find(s => s.id === sel);
  const equipped = equipment.length;

  /* ── Corner rivet ── */
  const rivet = (pos: React.CSSProperties) => (
    <div style={{
      position: "absolute", width: 10, height: 10, zIndex: 10,
      background: "linear-gradient(135deg, #7a5e2a, #4a3218)",
      border: "1px solid #8a6e3a", borderRadius: "1px", ...pos,
    }} />
  );

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0805",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "24px 12px",
    }}>
      {/* ── WoW Panel ── */}
      <div style={{
        width: "100%", maxWidth: "520px",
        background: "#1a1208",
        border: "2px solid #6b4e2a",
        boxShadow: "inset 0 0 0 1px #2a1c0a, 0 0 60px rgba(0,0,0,0.95), 0 0 120px rgba(0,0,0,0.7)",
        borderRadius: "2px",
        position: "relative",
      }}>
        {/* Corner rivets */}
        {rivet({ top: -1, left: -1 })}
        {rivet({ top: -1, right: -1 })}
        {rivet({ bottom: -1, left: -1 })}
        {rivet({ bottom: -1, right: -1 })}

        {/* ── Title bar ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "8px 12px",
          background: "linear-gradient(180deg, #3d2a12, #2a1c0a)",
          borderBottom: "1px solid #5a3e1a",
        }}>
          {/* Portrait */}
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "radial-gradient(circle, #3d2a12, #1a1208)",
            border: "1.5px solid #6b4e2a",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "16px", flexShrink: 0,
          }}>⚔️</div>
          {/* Name — truly centered */}
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{
              fontFamily: "'Cinzel', serif", fontSize: "13px",
              color: "#ffd700", letterSpacing: "2px", lineHeight: 1.2,
            }}>{dashboard.character?.name?.toUpperCase() ?? "PLAYER"}</div>
          </div>
          {/* Spacer — mirrors portrait width for true centering */}
          <div style={{ width: 32, flexShrink: 0 }} />


        </div>

        {/* ── Class / level bar ── */}
        <div style={{
          textAlign: "center", padding: "6px 12px 4px",
        }}>
          <span style={{
            fontFamily: "'Noto Serif SC', serif", fontSize: "11px",
            color: "rgba(200,160,50,0.6)", letterSpacing: "2px",
          }}>创始人 · 等级 {dashboard.overallLevel}</span>
        </div>

        {/* ── 3-column main area ── */}
        <div style={{ display: "flex", padding: "14px 10px 10px" }}>

          {/* Left slots */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "56px", flexShrink: 0 }}>
            {LEFT.map(d => (
              <Slot key={d.id} def={d} item={equipMap[d.id]}
                selected={sel === d.id}
                onClick={() => setSel(sel === d.id ? "" : d.id)} />
            ))}
          </div>

          {/* Center */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 10px" }}>
            {/* Character portrait — SVG silhouette */}
            <div style={{
              flex: 1,
              background: "linear-gradient(180deg, #0e0b05 0%, #12100a 60%, #1a1508 100%)",
              border: "1px solid #3d2a10",
              borderRadius: "2px",
              marginBottom: "10px",
              position: "relative",
              overflow: "hidden",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              padding: "0 4px",
            }}>
              {/* Stone texture overlay */}
              <div style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px)",
              }} />

              {/* Corner brackets */}
              {([
                { top: 6, left: 6,   borderTop: "1px solid rgba(200,160,50,0.4)", borderLeft:  "1px solid rgba(200,160,50,0.4)" },
                { top: 6, right: 6,  borderTop: "1px solid rgba(200,160,50,0.4)", borderRight: "1px solid rgba(200,160,50,0.4)" },
                { bottom: 6, left: 6,  borderBottom: "1px solid rgba(200,160,50,0.4)", borderLeft:  "1px solid rgba(200,160,50,0.4)" },
                { bottom: 6, right: 6, borderBottom: "1px solid rgba(200,160,50,0.4)", borderRight: "1px solid rgba(200,160,50,0.4)" },
              ] as React.CSSProperties[]).map((s, i) => (
                <div key={i} style={{ position: "absolute", width: 12, height: 12, ...s }} />
              ))}

              {/* SVG warrior holding MacBook Pro */}
              <svg viewBox="0 0 100 190" style={{ width: "100%", display: "block", flexShrink: 0 }}
                xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <radialGradient id="heroGlow" cx="50%" cy="38%" r="52%">
                    <stop offset="0%"   stopColor="#d4a020" stopOpacity="0.6"  />
                    <stop offset="45%"  stopColor="#c88c10" stopOpacity="0.2"  />
                    <stop offset="100%" stopColor="#a06008" stopOpacity="0"    />
                  </radialGradient>
                  <radialGradient id="groundMist" cx="50%" cy="50%" r="50%">
                    <stop offset="0%"   stopColor="#c8a030" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#c8a030" stopOpacity="0"    />
                  </radialGradient>
                  <radialGradient id="screenGlow" cx="50%" cy="50%" r="55%">
                    <stop offset="0%"   stopColor="#90c0ff" stopOpacity="0.6"  />
                    <stop offset="60%"  stopColor="#4080e0" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#2050b0" stopOpacity="0"    />
                  </radialGradient>
                  <filter id="heroShadow">
                    <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#000" floodOpacity="0.9"/>
                  </filter>
                </defs>

                {/* Backlight glow */}
                <ellipse cx="50" cy="70" rx="46" ry="65" fill="url(#heroGlow)" />
                {/* Ground mist */}
                <ellipse cx="50" cy="183" rx="42" ry="10" fill="url(#groundMist)" />

                {/* Cape */}
                <path d="M37 48 C20 88 22 152 30 172 L46 163 L43 96 Z" fill="#0a0702" filter="url(#heroShadow)" />

                {/* Head */}
                <ellipse cx="50" cy="21" rx="13" ry="15" fill="#0d0904" />
                {/* Neck */}
                <rect x="46" y="34" width="8" height="7" fill="#0d0904" />

                {/* Left pauldron */}
                <path d="M38 40 Q22 38 20 50 Q22 60 38 56 Z" fill="#0d0904" />
                {/* Right pauldron */}
                <path d="M62 40 Q78 38 80 50 Q78 60 62 56 Z" fill="#0d0904" />

                {/* Torso */}
                <path d="M36 39 Q50 35 64 39 L66 93 Q50 98 34 93 Z" fill="#0d0904" />
                {/* Belt */}
                <rect x="34" y="91" width="32" height="7" rx="1" fill="#0d0904" />

                {/* Left arm — hanging naturally */}
                <path d="M36,44 L26,46 L20,102 L30,100 Z" fill="#0d0904" />
                <ellipse cx="25" cy="104" rx="7" ry="5" fill="#0d0904" />

                {/* Right arm — extending horizontally to the right */}
                <path d="M63,52 L72,48 L90,64 L82,70 Z" fill="#0d0904" />

                {/* Legs */}
                <rect x="33" y="96" width="14" height="65" rx="3" fill="#0d0904" />
                <rect x="53" y="96" width="14" height="65" rx="3" fill="#0d0904" />
                {/* Boots */}
                <path d="M31 157 L47 157 L50 172 L27 172 Z" fill="#0d0904" />
                <path d="M53 157 L69 157 L73 172 L50 172 Z" fill="#0d0904" />

                {/* ── MacBook Pro — landscape, held horizontally like a sword ── */}
                <g transform="rotate(-18, 80, 68)">
                  {/* Screen bezel (landscape) */}
                  <rect x="62" y="42" width="36" height="22" rx="1" fill="#0d0904" />
                  {/* Screen display */}
                  <rect x="64" y="44" width="32" height="18" rx="0.5" fill="url(#screenGlow)" />
                  {/* UI content lines */}
                  <rect x="67" y="48" width="18" height="1.5" rx="0.5" fill="rgba(255,255,255,0.12)" />
                  <rect x="67" y="52" width="13" height="1.5" rx="0.5" fill="rgba(255,255,255,0.08)" />
                  <rect x="67" y="56" width="16" height="1.5" rx="0.5" fill="rgba(255,255,255,0.08)" />
                  {/* Notch (top center) */}
                  <rect x="79" y="42" width="4" height="2" rx="1" fill="#0a0702" />
                  {/* Hinge line */}
                  <line x1="63" y1="64" x2="97" y2="64" stroke="rgba(200,160,50,0.2)" strokeWidth="0.8" />
                  {/* Base / keyboard */}
                  <rect x="61" y="64" width="38" height="6" rx="1" fill="#0c0805" />
                  {/* Trackpad */}
                  <rect x="74" y="65" width="12" height="4" rx="1" fill="#0a0702" opacity="0.7" />
                  {/* Hand gripping base */}
                  <ellipse cx="80" cy="72" rx="9" ry="5" fill="#0d0904" />
                </g>

                {/* Screen glow on torso */}
                <ellipse cx="62" cy="62" rx="16" ry="12" fill="rgba(50,90,220,0.07)" />
              </svg>


            </div>

            {/* Stats panel */}
            <div style={{
              background: "#120d06",
              border: "1px solid #3d2a10",
              borderRadius: "2px",
              padding: "8px 10px",
            }}>
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px",
              }}>
                {["INT","DISC","STR","SOC","CRE"].map(id => (
                  <div key={id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{
                      fontFamily: "'Noto Serif SC', serif", fontSize: "10px",
                      color: "rgba(200,160,50,0.6)",
                    }}>{STAT[id].zh}:</span>
                    <span style={{
                      fontFamily: "'Cinzel', serif", fontSize: "11px",
                      color: STAT[id].color, fontWeight: "bold",
                    }}>{statsMap[id] ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right slots */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "56px", flexShrink: 0 }}>
            {RIGHT.map(d => (
              <Slot key={d.id} def={d} item={equipMap[d.id]}
                selected={sel === d.id}
                onClick={() => setSel(sel === d.id ? "" : d.id)} />
            ))}
          </div>
        </div>

        {/* ── Divider ── */}
        <div style={{
          height: "1px", margin: "0 10px",
          background: "linear-gradient(90deg, transparent, #5a3e1a, transparent)",
        }} />

        {/* ── Weapon / trinket row ── */}
        <div style={{
          display: "flex", justifyContent: "center", gap: "12px",
          padding: "10px",
        }}>
          {BOTTOM.map(d => (
            <Slot key={d.id} def={d} item={equipMap[d.id]}
              selected={sel === d.id}
              onClick={() => setSel(sel === d.id ? "" : d.id)} />
          ))}
        </div>


      </div>

      {/* ── Tooltip (below panel) ── */}
      {selItem && selDef && (
        <div style={{ width: "100%", maxWidth: "520px", marginTop: "8px" }}>
          <Tooltip item={selItem} def={selDef} />
        </div>
      )}
    </div>
  );
}
