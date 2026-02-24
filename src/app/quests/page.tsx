"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState } from "react";
import Link from "next/link";

const STAT_META: Record<string, { zh: string; color: string; bg: string }> = {
  INT:  { zh: "智力", color: "#60a0ff", bg: "rgba(96,160,255,0.15)" },
  DISC: { zh: "意志", color: "#ff8040", bg: "rgba(255,128,64,0.15)" },
  STR:  { zh: "力量", color: "#ff4060", bg: "rgba(255,64,96,0.15)" },
  SOC:  { zh: "魅力", color: "#40d890", bg: "rgba(64,216,144,0.15)" },
  CRE:  { zh: "创造", color: "#c060ff", bg: "rgba(192,96,255,0.15)" },
};

function groupQuests(quests: any[]) {
  const today = new Date().toISOString().slice(0, 10);
  const groups: Record<string, any[]> = {};

  for (const q of quests) {
    const key = q.is_boss ? "⚠️ 首领战" : q.date === today ? "📋 今日任务" : `📅 ${q.date}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(q);
  }

  // Sort group keys: boss first, today second, then dates descending
  const sorted = Object.entries(groups).sort(([a], [b]) => {
    if (a.includes("首领战")) return -1;
    if (b.includes("首领战")) return 1;
    if (a.includes("今日")) return -1;
    if (b.includes("今日")) return 1;
    return b.localeCompare(a);
  });

  return sorted;
}

export default function QuestLog() {
  const quests = useQuery(api.character.getAllQuests);
  const [selected, setSelected] = useState<any>(null);

  if (quests === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse" style={{ fontFamily: "'Noto Serif SC', serif", color: '#c8a040', letterSpacing: '3px' }}>
          加载任务日志...
        </div>
      </div>
    );
  }

  const groups = groupQuests(quests);
  const total = quests.filter((q: any) => !q.is_boss).length;
  const completed = quests.filter((q: any) => q.completed && !q.is_boss).length;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0805' }}>

      {/* ── Title Bar ── */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{
          background: 'linear-gradient(90deg, #1e1508, #2a1e08, #1e1508)',
          borderBottom: '2px solid rgba(200,160,50,0.4)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.6)',
        }}
      >
        <Link href="/" className="flex items-center gap-2 text-sm transition-opacity hover:opacity-70"
          style={{ color: 'rgba(200,160,50,0.6)', fontFamily: "'Noto Serif SC', serif" }}>
          ← 返回
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xl">📖</span>
          <span style={{ fontFamily: "'Cinzel', serif", color: '#f0c060', fontSize: '15px', letterSpacing: '3px' }}>
            QUEST LOG
          </span>
          <span
            className="px-3 py-[2px] rounded-sm text-xs"
            style={{
              background: 'rgba(200,160,50,0.12)',
              border: '1px solid rgba(200,160,50,0.35)',
              color: '#c8a040',
              fontFamily: "'Cinzel', serif",
            }}
          >
            {completed} / {total}
          </span>
        </div>
        <div style={{ width: '60px' }} />
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden" style={{ maxHeight: 'calc(100vh - 56px)' }}>

        {/* Left — Quest List */}
        <div
          className="w-72 flex-shrink-0 overflow-y-auto"
          style={{
            background: 'linear-gradient(180deg, #160f04, #120d03)',
            borderRight: '1px solid rgba(200,160,50,0.2)',
          }}
        >
          {groups.map(([groupName, groupQuests]) => (
            <div key={groupName}>
              {/* Group header */}
              <div
                className="px-3 py-[6px] text-[10px] tracking-widest sticky top-0"
                style={{
                  fontFamily: "'Noto Serif SC', serif",
                  color: '#c8a040',
                  background: 'rgba(30,18,4,0.97)',
                  borderBottom: '1px solid rgba(200,160,50,0.12)',
                  borderTop: '1px solid rgba(200,160,50,0.08)',
                }}
              >
                {groupName}
              </div>

              {/* Quest items */}
              {groupQuests.map((q: any) => {
                const meta = STAT_META[q.stat] ?? STAT_META["INT"];
                const isSelected = selected?._id === q._id;
                return (
                  <div
                    key={q._id}
                    onClick={() => setSelected(q)}
                    className="flex items-center gap-2 px-3 py-[9px] cursor-pointer transition-all"
                    style={{
                      background: isSelected
                        ? 'rgba(200,160,50,0.15)'
                        : 'transparent',
                      borderLeft: isSelected
                        ? '2px solid #c8a040'
                        : '2px solid transparent',
                      borderBottom: '1px solid rgba(0,0,0,0.2)',
                    }}
                  >
                    {/* Stat color dot */}
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: meta.color, opacity: q.completed ? 0.4 : 1 }}
                    />
                    {/* Name */}
                    <span
                      className="flex-1 text-[13px] leading-snug truncate"
                      style={{
                        fontFamily: "'Noto Serif SC', serif",
                        color: q.completed ? 'rgba(200,170,100,0.35)' : '#d4b87a',
                        textDecoration: q.completed ? 'line-through' : 'none',
                      }}
                    >
                      {q.name}
                    </span>
                    {/* Done indicator */}
                    {q.completed && (
                      <span style={{ color: '#40c060', fontSize: '12px' }}>✓</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Right — Quest Detail */}
        <div
          className="flex-1 overflow-y-auto p-6"
          style={{
            background: 'linear-gradient(135deg, #1a1206, #14100405)',
            backgroundImage: `
              linear-gradient(135deg, #1a1206, #140f04),
              url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E")
            `,
          }}
        >
          {selected ? (
            <div>
              {/* Quest title */}
              <h2
                className="text-2xl font-bold mb-1"
                style={{
                  fontFamily: "'Noto Serif SC', serif",
                  color: '#f0e0b0',
                  textShadow: '0 2px 6px rgba(0,0,0,0.8)',
                }}
              >
                {selected.name}
              </h2>

              {/* Date */}
              <div className="text-[11px] mb-5" style={{ color: 'rgba(200,160,50,0.45)', fontFamily: "'Noto Serif SC', serif" }}>
                {selected.is_boss ? '首领战' : selected.date}
                {selected.deadline && ` · 截止 ${selected.deadline.slice(0,10)}`}
              </div>

              {/* Divider */}
              <div className="wow-divider" />

              {/* Description section */}
              <div className="mt-5 mb-6">
                <div
                  className="text-[11px] tracking-[3px] mb-3 uppercase"
                  style={{ fontFamily: "'Noto Serif SC', serif", color: '#c8a040' }}
                >
                  任务描述
                </div>
                <p
                  className="text-sm leading-relaxed"
                  style={{ fontFamily: "'Noto Serif SC', serif", color: '#c8a060', lineHeight: '1.8' }}
                >
                  {selected.is_boss
                    ? `这是一场首领战。在截止日期前完成以获得奖励。`
                    : selected.completed
                      ? `✅ 任务已完成。`
                      : `完成此任务以获得经验值奖励。`}
                </p>
              </div>

              <div className="wow-divider" />

              {/* Rewards section */}
              <div className="mt-5">
                <div
                  className="text-[11px] tracking-[3px] mb-3 uppercase"
                  style={{ fontFamily: "'Noto Serif SC', serif", color: '#c8a040' }}
                >
                  奖励
                </div>
                <div className="flex items-center gap-3">
                  {/* XP reward box */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 rounded-sm"
                    style={{
                      background: 'rgba(200,160,50,0.08)',
                      border: '1px solid rgba(200,160,50,0.25)',
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-sm flex items-center justify-center text-xl"
                      style={{
                        background: STAT_META[selected.stat]?.bg ?? 'rgba(200,160,50,0.1)',
                        border: `1px solid ${STAT_META[selected.stat]?.color ?? '#c8a040'}40`,
                      }}
                    >
                      {selected.stat === 'INT' ? '🧠' : selected.stat === 'STR' ? '💪' : selected.stat === 'DISC' ? '⚡' : selected.stat === 'SOC' ? '🤝' : '✨'}
                    </div>
                    <div>
                      <div className="text-[11px]" style={{ color: 'rgba(200,160,50,0.5)', fontFamily: "'Noto Serif SC', serif" }}>
                        经验值
                      </div>
                      <div
                        className="text-lg font-bold"
                        style={{ color: STAT_META[selected.stat]?.color ?? '#c8a040', fontFamily: "'Cinzel', serif" }}
                      >
                        +{selected.xp_reward} {STAT_META[selected.stat]?.zh}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status */}
              {selected.completed && (
                <div className="mt-6 flex items-center gap-2">
                  <span style={{ color: '#40c060', fontSize: '18px' }}>✓</span>
                  <span style={{ fontFamily: "'Noto Serif SC', serif", color: '#40c060', fontSize: '13px' }}>
                    已完成
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 opacity-30">
              <div className="text-4xl">📜</div>
              <div style={{ fontFamily: "'Noto Serif SC', serif", color: '#c8a040', fontSize: '13px' }}>
                选择一个任务查看详情
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer Bar ── */}
      <div
        className="flex items-center justify-center gap-4 px-4 py-2"
        style={{
          background: 'linear-gradient(90deg, #1e1508, #2a1e08, #1e1508)',
          borderTop: '2px solid rgba(200,160,50,0.3)',
        }}
      >
        {["全部", "进行中", "已完成"].map((label) => (
          <button
            key={label}
            className="px-5 py-1 text-xs rounded-sm transition-all"
            style={{
              fontFamily: "'Noto Serif SC', serif",
              color: '#c8a040',
              background: 'rgba(200,160,50,0.08)',
              border: '1px solid rgba(200,160,50,0.3)',
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
