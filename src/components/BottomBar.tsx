"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useXp } from "../lib/xpContext";

const NAV = [
  { href: "/",           icon: "👤", label: "角色" },
  { href: "/equipment",  icon: "⚔️", label: "装备" },
  { href: "/abilities",  icon: "✨", label: "技能" },
  { href: "/quests",     icon: "📖", label: "任务" },
  { href: "/catalog",    icon: "📚", label: "目录" },
  { href: "/journal",    icon: "📓", label: "日志" },
];

export default function BottomBar() {
  const path = usePathname();
  const { xp } = useXp();
  const xpPct = Math.min(100, Math.round((xp.xpInLevel / xp.xpNeeded) * 100));

  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      background: "transparent",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      paddingBottom: "10px",
    }}>

      {/* ── Single stone frame wrapping XP bar + action slots ── */}
      <div className="wow-action-frame" style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        background: "linear-gradient(180deg, #28211a 0%, #1c1710 45%, #131008 100%)",
        border: "2px solid #4a3e2e",
        boxShadow: [
          "0 -1px 0 #1e1a12",
          "0 3px 0 #0a0806",
          "inset 0 1px 0 rgba(255,255,255,0.06)",   /* stone top highlight */
          "inset 0 -1px 0 rgba(0,0,0,0.7)",
          "inset 1px 0 0 rgba(255,255,255,0.03)",
          "0 4px 20px rgba(0,0,0,0.85)",
        ].join(", "),
        overflow: "hidden",
      }}>

        {/* Top stone edge highlight */}
        <div style={{
          height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.09) 30%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.09) 70%, transparent)",
          flexShrink: 0,
        }} />

        {/* ── XP bar — inside the frame, top section ── */}
        <div style={{
          height: "14px",
          position: "relative",
          background: "#060400",
          borderBottom: "1px solid #3a2408",
          flexShrink: 0,
          overflow: "hidden",
        }}>
          {/* XP fill */}
          <div style={{
            height: "100%",
            width: `${xpPct}%`,
            background: "linear-gradient(180deg, #9060d8 0%, #6030b0 45%, #3e188a 100%)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22), 0 0 8px rgba(120,60,220,0.4)",
            transition: "width 0.75s ease",
            position: "relative",
          }}>
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(0,0,0,0.28) 19px, rgba(0,0,0,0.28) 20px)",
              pointerEvents: "none",
            }} />
          </div>
          {/* Tick marks on empty area */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(255,255,255,0.03) 19px, rgba(255,255,255,0.03) 20px)",
            pointerEvents: "none",
          }} />
          {/* Label */}
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "9px", color: "rgba(220,200,255,0.92)",
            fontFamily: "'Cinzel', serif", letterSpacing: "1.2px",
            textShadow: "0 0 4px #000, 0 1px 3px #000",
            pointerEvents: "none",
          }}>
            Lv.{xp.level} · {xp.xpInLevel} / {xp.xpNeeded} XP
          </div>
        </div>

        {/* ── Action slots ── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "5px",
          padding: "7px 14px 8px",
        }}>
          {NAV.map(n => {
            const active = path === n.href;
            return (
              <Link key={n.href} href={n.href} style={{ textDecoration: "none" }}>
                <div style={{
                  width: 54,
                  height: 54,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "3px",
                  position: "relative",
                  background: active
                    ? "linear-gradient(135deg, #3e2c10 0%, #2a1c08 55%, #1c1204 100%)"
                    : "linear-gradient(180deg, #1c1206 0%, #110c03 60%, #0a0802 100%)",
                  border: "2px solid",
                  borderColor: active ? "#7a6a50" : "#332b20",
                  boxShadow: active
                    ? [
                        "inset 0 0 8px rgba(255,255,255,0.07)",
                        "inset 0 2px 3px rgba(255,255,255,0.05)",
                        "0 0 6px rgba(255,255,255,0.06)",
                      ].join(", ")
                    : [
                        "inset 0 2px 4px rgba(0,0,0,0.85)",
                        "inset 0 -1px 0 rgba(255,255,255,0.03)",
                      ].join(", "),
                  cursor: "pointer",
                  transition: "border-color 0.1s, box-shadow 0.1s",
                }}>
                  {/* Inner bevel */}
                  <div style={{
                    position: "absolute",
                    top: 1, left: 1, right: 1, bottom: 1,
                    border: "1px solid",
                    borderColor: active ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)",
                    pointerEvents: "none",
                  }} />
                  {active && (
                    <div style={{
                      position: "absolute", inset: 0,
                      background: "radial-gradient(ellipse at 50% 80%, rgba(255,255,255,0.07) 0%, transparent 65%)",
                      pointerEvents: "none",
                    }} />
                  )}
                  <span style={{ fontSize: "22px", lineHeight: 1 }}>{n.icon}</span>
                  <span style={{
                    fontSize: "9px",
                    fontFamily: "'Noto Serif SC', serif",
                    color: active ? "rgba(255,255,255,0.85)" : "rgba(180,160,130,0.35)",
                    letterSpacing: "0.5px",
                    lineHeight: 1,
                    textShadow: active ? "0 1px 3px rgba(0,0,0,0.9)" : "none",
                  }}>{n.label}</span>
                </div>
              </Link>
            );
          })}
        </div>

      </div>
    </div>
  );
}
