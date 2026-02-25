"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState } from "react";

const STAT: Record<string, { zh: string; color: string }> = {
  INT:  { zh: "智力", color: "#60a0ff" },
  DISC: { zh: "意志", color: "#ff8040" },
  STR:  { zh: "力量", color: "#ff4060" },
  SOC:  { zh: "魅力", color: "#40d890" },
  CRE:  { zh: "创造", color: "#c060ff" },
};

const CAT: Record<string, { zh: string; color: string }> = {
  ai:           { zh: "AI",   color: "#a335ee" },
  dev:          { zh: "开发", color: "#0070dd" },
  infra:        { zh: "基础设施", color: "#1eff00" },
  productivity: { zh: "效率", color: "#ff8000" },
};

const TABS = [
  { id: "all",    zh: "全部" },
  { id: "active", zh: "主动" },
  { id: "passive",zh: "被动" },
];

/* ── Ability icon card ── */
function AbilityCard({ ability, selected, onClick }: { ability: any; selected: boolean; onClick: () => void }) {
  const isPassive = ability.type === "passive";
  const cat = CAT[ability.category] ?? { zh: ability.category, color: "#c8a040" };

  return (
    <button onClick={onClick} style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", gap: "5px",
      cursor: "pointer", background: "none", border: "none", padding: 0,
    }}>
      {/* Icon box */}
      <div style={{
        width: 64, height: 64,
        background: isPassive
          ? `radial-gradient(ellipse at 50% 30%, ${cat.color}18, #0c0806)`
          : "linear-gradient(135deg, #1a1208, #0c0806)",
        border: selected
          ? "2px solid #ffd700"
          : isPassive
          ? `2px solid ${cat.color}80`
          : "2px solid #4a3218",
        borderRadius: "3px",
        boxShadow: selected
          ? "0 0 0 1px #ffd700, 0 0 14px rgba(255,215,0,0.4)"
          : isPassive
          ? `0 0 10px ${cat.color}40, inset 0 0 12px ${cat.color}10`
          : "inset 0 0 8px rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "30px",
        position: "relative",
        transition: "all 0.15s",
      }}>
        {ability.icon}

        {/* Passive shimmer ring */}
        {isPassive && !selected && (
          <div style={{
            position: "absolute", inset: -3,
            borderRadius: "5px",
            border: `1px solid ${cat.color}30`,
            animation: "pulse 2s infinite",
          }} />
        )}

        {/* Type dot */}
        <div style={{
          position: "absolute", top: 3, right: 3,
          width: 7, height: 7, borderRadius: "50%",
          background: isPassive ? cat.color : "#ffd700",
          boxShadow: `0 0 5px ${isPassive ? cat.color : "#ffd70080"}`,
        }} />
      </div>

      {/* Name */}
      <span style={{
        fontFamily: "'Noto Serif SC', serif",
        fontSize: "10px",
        color: selected ? "#ffd700" : "rgba(200,160,50,0.7)",
        maxWidth: "64px",
        textAlign: "center",
        lineHeight: 1.3,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}>{ability.name}</span>
    </button>
  );
}

/* ── Tooltip ── */
function AbilityTooltip({ ability }: { ability: any }) {
  const isPassive = ability.type === "passive";
  const cat = CAT[ability.category] ?? { zh: ability.category, color: "#c8a040" };

  return (
    <div style={{
      background: "linear-gradient(135deg, #0f0a04, #130e06)",
      border: `1.5px solid ${cat.color}80`,
      borderRadius: "3px",
      padding: "14px",
      boxShadow: `0 4px 24px rgba(0,0,0,0.95), 0 0 16px ${cat.color}30`,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
        <div style={{
          width: 48, height: 48, flexShrink: 0,
          background: `radial-gradient(ellipse, ${cat.color}20, transparent)`,
          border: `1.5px solid ${cat.color}80`,
          borderRadius: "3px",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "26px",
          boxShadow: `0 0 10px ${cat.color}40`,
        }}>{ability.icon}</div>
        <div>
          <div style={{
            fontFamily: "'Cinzel', serif", fontWeight: "bold",
            fontSize: "15px", color: "#f0e0b0",
            textShadow: "0 1px 4px rgba(0,0,0,0.8)",
          }}>{ability.name}</div>
          <div style={{ display: "flex", gap: "6px", marginTop: "4px", flexWrap: "wrap" }}>
            <span style={{
              fontFamily: "'Noto Serif SC', serif",
              fontSize: "10px", letterSpacing: "1px",
              color: cat.color,
              background: `${cat.color}18`,
              border: `1px solid ${cat.color}40`,
              padding: "1px 6px", borderRadius: "2px",
            }}>{cat.zh}</span>
            <span style={{
              fontFamily: "'Noto Serif SC', serif",
              fontSize: "10px", letterSpacing: "1px",
              color: isPassive ? "#60d8ff" : "#ffd700",
              background: isPassive ? "rgba(96,216,255,0.1)" : "rgba(255,215,0,0.1)",
              border: `1px solid ${isPassive ? "rgba(96,216,255,0.3)" : "rgba(255,215,0,0.3)"}`,
              padding: "1px 6px", borderRadius: "2px",
            }}>{isPassive ? "被动" : "主动"}</span>
          </div>
        </div>
      </div>

      {/* Cooldown */}
      {ability.cooldown && (
        <div style={{
          fontFamily: "'Noto Serif SC', serif",
          fontSize: "11px", color: "rgba(200,160,50,0.5)",
          marginBottom: "8px",
        }}>冷却：{ability.cooldown}</div>
      )}

      {/* Stat bonuses */}
      {(ability.stat_bonuses ?? []).length > 0 && (
        <div style={{ marginBottom: "10px" }}>
          {ability.stat_bonuses.map((b: any, i: number) => (
            <span key={i} style={{
              display: "inline-block", marginRight: "10px",
              fontFamily: "'Cinzel', serif", fontSize: "13px",
              color: STAT[b.stat]?.color ?? "#c8a040",
            }}>+{b.value} {STAT[b.stat]?.zh ?? b.stat}</span>
          ))}
        </div>
      )}

      {/* Description */}
      <p style={{
        fontFamily: "'Noto Serif SC', serif", fontSize: "12px",
        color: "rgba(200,180,120,0.85)", lineHeight: 1.75, marginBottom: "8px",
      }}>{ability.description}</p>

      {/* Lore */}
      {ability.lore && (
        <>
          <div style={{
            height: "1px", margin: "10px 0",
            background: "linear-gradient(90deg, transparent, rgba(200,160,50,0.25), transparent)",
          }} />
          <p style={{
            fontFamily: "'Noto Serif SC', serif", fontSize: "11px",
            color: "rgba(200,180,100,0.45)", lineHeight: 1.85,
            fontStyle: "italic", whiteSpace: "pre-line",
          }}>{ability.lore}</p>
        </>
      )}
    </div>
  );
}

/* ── Page ── */
export default function AbilitiesPage() {
  const abilities = useQuery(api.character.getAbilities);
  const [tab, setTab]   = useState("all");
  const [sel, setSel]   = useState<string | null>(null);

  if (!abilities) {
    return (
      <div style={{
        minHeight: "100vh", background: "#0a0805",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span className="animate-pulse" style={{
          fontFamily: "'Noto Serif SC', serif",
          color: "#c8a040", letterSpacing: "3px",
        }}>加载技能书…</span>
      </div>
    );
  }

  const filtered = abilities.filter((a: any) =>
    tab === "all" || a.type === tab
  );

  const selAbility = abilities.find((a: any) => a._id === sel) ?? null;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0805" }}>

      {/* ── Title bar ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: "8px", padding: "10px 16px",
        background: "linear-gradient(90deg, #1e1508, #2a1e08, #1e1508)",
        borderBottom: "2px solid rgba(200,160,50,0.4)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.6)",
        position: "relative",
      }}>
        <span style={{ fontSize: "16px" }}>✨</span>
        <span style={{
          fontFamily: "'Cinzel', serif", color: "#f0c060",
          fontSize: "14px", letterSpacing: "3px",
        }}>SPELLBOOK</span>
        <span style={{
          fontFamily: "'Cinzel', serif", fontSize: "11px",
          color: "rgba(200,160,50,0.4)",
          background: "rgba(200,160,50,0.1)",
          border: "1px solid rgba(200,160,50,0.3)",
          padding: "1px 8px", borderRadius: "2px",
        }}>{abilities.length} 技能</span>
      </div>

      {/* ── Filter tabs ── */}
      <div style={{
        display: "flex", gap: "0",
        borderBottom: "1px solid rgba(200,160,50,0.15)",
        background: "#120d06",
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "8px 4px",
            background: tab === t.id ? "rgba(200,160,50,0.1)" : "transparent",
            border: "none",
            borderBottom: tab === t.id ? "2px solid #c8a040" : "2px solid transparent",
            fontFamily: "'Noto Serif SC', serif",
            fontSize: "12px",
            color: tab === t.id ? "#ffd700" : "rgba(200,160,50,0.4)",
            cursor: "pointer",
            transition: "all 0.15s",
          }}>{t.zh}</button>
        ))}
      </div>

      <div style={{ padding: "16px" }}>

        {/* Passive section */}
        {(tab === "all" || tab === "passive") && (
          <div style={{ marginBottom: "20px" }}>
            {tab === "all" && (
              <div style={{
                fontFamily: "'Noto Serif SC', serif",
                fontSize: "10px", letterSpacing: "3px",
                color: "rgba(96,216,255,0.6)",
                marginBottom: "12px",
                display: "flex", alignItems: "center", gap: "8px",
              }}>
                <span>被动技能</span>
                <div style={{ flex: 1, height: "1px", background: "rgba(96,216,255,0.15)" }} />
              </div>
            )}
            <div style={{
              display: "flex", flexWrap: "wrap", gap: "16px",
            }}>
              {filtered
                .filter((a: any) => a.type === "passive")
                .map((a: any) => (
                  <AbilityCard
                    key={a._id} ability={a}
                    selected={sel === a._id}
                    onClick={() => setSel(sel === a._id ? null : a._id)}
                  />
                ))}
            </div>
          </div>
        )}

        {/* Active section */}
        {(tab === "all" || tab === "active") && (
          <div style={{ marginBottom: "20px" }}>
            {tab === "all" && (
              <div style={{
                fontFamily: "'Noto Serif SC', serif",
                fontSize: "10px", letterSpacing: "3px",
                color: "rgba(255,215,0,0.6)",
                marginBottom: "12px",
                display: "flex", alignItems: "center", gap: "8px",
              }}>
                <span>主动技能</span>
                <div style={{ flex: 1, height: "1px", background: "rgba(255,215,0,0.15)" }} />
              </div>
            )}
            <div style={{
              display: "flex", flexWrap: "wrap", gap: "16px",
            }}>
              {filtered
                .filter((a: any) => a.type === "active")
                .map((a: any) => (
                  <AbilityCard
                    key={a._id} ability={a}
                    selected={sel === a._id}
                    onClick={() => setSel(sel === a._id ? null : a._id)}
                  />
                ))}
            </div>
          </div>
        )}

        {/* Tooltip */}
        {selAbility && (
          <div style={{ marginTop: "8px" }}>
            <AbilityTooltip ability={selAbility} />
          </div>
        )}
      </div>
    </div>
  );
}
