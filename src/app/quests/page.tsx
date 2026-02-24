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

const STAT_ICONS: Record<string, string> = {
  INT: '🧠', DISC: '⚡', STR: '💪', SOC: '🤝', CRE: '✨',
};

function QuestDetail({ quest, onBack }: { quest: any; onBack: () => void }) {
  const meta = STAT_META[quest.stat] ?? STAT_META["INT"];
  return (
    <div className="flex flex-col h-full">
      {/* Detail header — mobile back button */}
      <div
        className="flex items-center gap-3 px-4 py-3 md:hidden flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(200,160,50,0.15)', background: '#160f04' }}
      >
        <button onClick={onBack} style={{ color: 'rgba(200,160,50,0.7)', fontFamily: "'Noto Serif SC', serif", fontSize: '14px' }}>
          ← 返回
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5" style={{ background: 'linear-gradient(135deg, #1a1206, #140f04)' }}>

        {/* ── Title ── */}
        <h2 className="text-xl font-bold leading-snug mb-2"
          style={{ fontFamily: "'Noto Serif SC', serif", color: '#f0e0b0', textShadow: '0 2px 6px rgba(0,0,0,0.8)' }}>
          {quest.name}
        </h2>

        {/* ── Objective — paragraph right under title (WoW style) ── */}
        {quest.description && (
          <p className="text-sm mb-3 leading-relaxed"
            style={{ fontFamily: "'Noto Serif SC', serif", color: '#c8b87a', lineHeight: '1.75' }}>
            {quest.description}
          </p>
        )}

        {/* Date / type */}
        <div className="text-[11px] mb-4" style={{ color: 'rgba(200,160,50,0.4)', fontFamily: "'Noto Serif SC', serif" }}>
          {quest.is_boss ? '⚠️ 首领战' : quest.is_penalty ? '💀 惩罚任务' : `📅 ${quest.date}`}
          {quest.deadline && ` · 截止 ${quest.deadline.slice(0, 10)}`}
        </div>

        <div className="wow-divider" />

        {/* ── Description / Lore (WoW's "Description" section) ── */}
        {quest.lore && (
          <>
            <div className="mt-4 mb-4">
              <div className="text-[11px] tracking-[3px] mb-3 font-bold uppercase"
                style={{ fontFamily: "'Noto Serif SC', serif", color: '#c8a040' }}>描述</div>
              <p className="text-sm leading-relaxed"
                style={{ fontFamily: "'Noto Serif SC', serif", color: 'rgba(200,180,120,0.7)', lineHeight: '1.9', fontStyle: 'italic' }}>
                {quest.lore}
              </p>
            </div>
            <div className="wow-divider" />
          </>
        )}

        {/* ── Rewards ── */}
        <div className="mt-4">
          <div className="text-[10px] tracking-[3px] mb-3 uppercase"
            style={{ fontFamily: "'Noto Serif SC', serif", color: '#c8a040' }}>奖励</div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-sm"
            style={{
              display: 'inline-flex',
              background: quest.is_penalty ? 'rgba(255,60,60,0.06)' : 'rgba(200,160,50,0.08)',
              border: `1px solid ${quest.is_penalty ? 'rgba(255,60,60,0.2)' : 'rgba(200,160,50,0.25)'}`,
            }}>
            <div className="w-10 h-10 rounded-sm flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: meta.bg, border: `1px solid ${meta.color}40` }}>
              {STAT_ICONS[quest.stat] ?? '⭐'}
            </div>
            <div>
              <div className="text-[11px]" style={{ color: 'rgba(200,160,50,0.5)', fontFamily: "'Noto Serif SC', serif" }}>经验值</div>
              <div className="text-lg font-bold"
                style={{ color: quest.is_penalty ? '#ff6060' : meta.color, fontFamily: "'Cinzel', serif" }}>
                {quest.is_penalty ? `-${quest.xp_reward}` : `+${quest.xp_reward}`} {meta.zh}
              </div>
            </div>
          </div>
        </div>

        {/* ── Status ── */}
        {quest.completed && (
          <div className="mt-5 flex items-center gap-2">
            <span style={{ color: quest.is_penalty ? '#ff6060' : '#40c060', fontSize: '18px' }}>
              {quest.is_penalty ? '✗' : '✓'}
            </span>
            <span style={{ fontFamily: "'Noto Serif SC', serif", color: quest.is_penalty ? '#ff6060' : '#40c060', fontSize: '13px' }}>
              {quest.is_penalty ? '已触发惩罚' : '已完成'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function QuestLog() {
  const quests = useQuery(api.character.getAllQuests);
  const [selected, setSelected] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false); // mobile: toggle between list/detail

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

  const handleSelect = (q: any) => {
    setSelected(q);
    setShowDetail(true);
  };

  const handleBack = () => setShowDetail(false);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0805' }}>

      {/* ── Title Bar ── */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{
          background: 'linear-gradient(90deg, #1e1508, #2a1e08, #1e1508)',
          borderBottom: '2px solid rgba(200,160,50,0.4)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.6)',
        }}>
        {/* Back to dashboard — hidden on mobile when detail is shown */}
        <Link href="/"
          className={`text-sm transition-opacity hover:opacity-70 ${showDetail ? 'hidden md:block' : ''}`}
          style={{ color: 'rgba(200,160,50,0.6)', fontFamily: "'Noto Serif SC', serif", minWidth: '60px' }}>
          ← 返回
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-lg">📖</span>
          <span style={{ fontFamily: "'Cinzel', serif", color: '#f0c060', fontSize: '14px', letterSpacing: '3px' }}>
            QUEST LOG
          </span>
          <span className="px-2 py-[2px] rounded-sm text-[11px]"
            style={{ background: 'rgba(200,160,50,0.12)', border: '1px solid rgba(200,160,50,0.35)', color: '#c8a040', fontFamily: "'Cinzel', serif" }}>
            {completed}/{total}
          </span>
        </div>
        <div style={{ minWidth: '60px' }} />
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>

        {/* Left — Quest List: full screen on mobile (hidden when detail shown), sidebar on desktop */}
        <div
          className={`overflow-y-auto flex-shrink-0
            ${showDetail ? 'hidden md:block' : 'w-full md:w-72'}
          `}
          style={{
            background: 'linear-gradient(180deg, #160f04, #120d03)',
            borderRight: '1px solid rgba(200,160,50,0.2)',
          }}
        >
          {groups.map(([groupName, groupQuests]) => (
            <div key={groupName}>
              <div className="px-3 py-[7px] text-[10px] tracking-widest sticky top-0"
                style={{
                  fontFamily: "'Noto Serif SC', serif", color: '#c8a040',
                  background: 'rgba(22,12,3,0.98)',
                  borderBottom: '1px solid rgba(200,160,50,0.12)',
                  borderTop: '1px solid rgba(200,160,50,0.08)',
                }}>
                {groupName}
              </div>
              {groupQuests.map((q: any) => {
                const meta = STAT_META[q.stat] ?? STAT_META["INT"];
                const isSelected = selected?._id === q._id;
                return (
                  <div key={q._id} onClick={() => handleSelect(q)}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-all"
                    style={{
                      background: isSelected ? 'rgba(200,160,50,0.12)' : 'transparent',
                      borderLeft: isSelected ? '3px solid #c8a040' : '3px solid transparent',
                      borderBottom: '1px solid rgba(0,0,0,0.25)',
                    }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: meta.color, opacity: q.completed ? 0.4 : 1 }} />
                    <span className="flex-1 text-[14px] leading-snug"
                      style={{
                        fontFamily: "'Noto Serif SC', serif",
                        color: q.completed ? 'rgba(200,170,100,0.35)' : q.is_penalty ? 'rgba(255,120,100,0.9)' : '#d4b87a',
                        textDecoration: q.completed ? 'line-through' : 'none',
                      }}>
                      {q.is_penalty ? '💀 ' : ''}{q.name}
                    </span>
                    {q.completed && <span style={{ color: q.is_penalty ? '#ff6060' : '#40c060', fontSize: '13px' }}>{q.is_penalty ? '✗' : '✓'}</span>}
                    {/* Arrow hint on mobile */}
                    {!q.completed && <span className="md:hidden" style={{ color: 'rgba(200,160,50,0.3)', fontSize: '12px' }}>›</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Right — Detail: full screen on mobile (shown when quest selected), sidebar on desktop */}
        <div className={`flex-1 overflow-hidden
          ${showDetail ? 'block' : 'hidden md:block'}
        `}>
          {selected
            ? <QuestDetail quest={selected} onBack={handleBack} />
            : (
              <div className="hidden md:flex flex-col items-center justify-center h-full gap-3 opacity-30">
                <div className="text-4xl">📜</div>
                <div style={{ fontFamily: "'Noto Serif SC', serif", color: '#c8a040', fontSize: '13px' }}>
                  选择一个任务查看详情
                </div>
              </div>
            )
          }
        </div>
      </div>

      {/* ── Footer Bar ── */}
      <div className="flex items-center justify-center gap-3 px-4 py-2 flex-shrink-0"
        style={{
          background: 'linear-gradient(90deg, #1e1508, #2a1e08, #1e1508)',
          borderTop: '2px solid rgba(200,160,50,0.3)',
        }}>
        {["全部", "进行中", "已完成"].map((label) => (
          <button key={label} className="px-4 py-1 text-xs rounded-sm transition-all"
            style={{
              fontFamily: "'Noto Serif SC', serif", color: '#c8a040',
              background: 'rgba(200,160,50,0.08)', border: '1px solid rgba(200,160,50,0.3)',
            }}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
