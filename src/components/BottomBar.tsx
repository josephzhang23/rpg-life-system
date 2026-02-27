"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/",           icon: "👤", label: "角色" },
  { href: "/equipment",  icon: "⚔️", label: "装备" },
  { href: "/abilities",  icon: "✨", label: "技能" },
  { href: "/quests",     icon: "📖", label: "任务" },
  { href: "/catalog",    icon: "📚", label: "目录" },
];

export default function BottomBar() {
  const path = usePathname();

  return (
    <div style={{
      background: "linear-gradient(180deg, #1e1508 0%, #110d04 100%)",
      boxShadow: "0 -4px 20px rgba(0,0,0,0.8)",
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 100,
    }}>


      {/* Buttons row */}
      <div style={{
        display: "flex", justifyContent: "center", alignItems: "center",
        gap: "8px", padding: "16px 16px 0px",
      }}>
        {NAV.map(n => {
          const active = path === n.href;
          return (
            <Link key={n.href} href={n.href} style={{ textDecoration: "none" }}>
              <div style={{
                width: 56, height: 50,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: "3px", borderRadius: "3px",
                background: active
                  ? "linear-gradient(135deg, rgba(200,160,50,0.18), rgba(200,160,50,0.08))"
                  : "linear-gradient(135deg, rgba(255,255,255,0.03), rgba(0,0,0,0.2))",
                border: active
                  ? "1.5px solid rgba(200,160,50,0.7)"
                  : "1.5px solid rgba(200,160,50,0.18)",
                boxShadow: active
                  ? "0 0 12px rgba(200,160,50,0.35)"
                  : "inset 0 1px 0 rgba(255,255,255,0.03)",
                cursor: "pointer", transition: "all 0.15s",
              }}>
                <span style={{ fontSize: "22px", lineHeight: 1 }}>{n.icon}</span>
                <span style={{
                  fontSize: "9px", fontFamily: "'Noto Serif SC', serif",
                  color: active ? "#ffd700" : "rgba(200,160,50,0.4)",
                  letterSpacing: "1px", lineHeight: 1,
                }}>{n.label}</span>
              </div>
            </Link>
          );
        })}
      </div>


    </div>
  );
}
