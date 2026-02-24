"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";

const STAT_META: Record<string, { zh: string; color: string }> = {
  INT:  { zh: "智力", color: "#60a0ff" },
  DISC: { zh: "意志", color: "#ff8040" },
  STR:  { zh: "力量", color: "#ff4060" },
  SOC:  { zh: "魅力", color: "#40d890" },
  CRE:  { zh: "创造", color: "#c060ff" },
};

const CATEGORY_LABELS: Record<string, { zh: string; icon: string }> = {
  fitness:    { zh: "体能",   icon: "💪" },
  deep_work:  { zh: "深度工作", icon: "🧠" },
  coding:     { zh: "编程发布", icon: "⚔️" },
  social:     { zh: "社交",   icon: "🤝" },
  discipline: { zh: "纪律",   icon: "⚡" },
  penalty:    { zh: "惩罚",   icon: "💀" },
};

export default function CatalogPage() {
  const catalog = useQuery(api.character.getCatalog);

  if (catalog === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse" style={{ fontFamily: "'Noto Serif SC', serif", color: '#c8a040', letterSpacing: '3px' }}>
          加载目录...
        </div>
      </div>
    );
  }

  // Group by category
  const groups: Record<string, any[]> = {};
  for (const entry of catalog) {
    if (!groups[entry.category]) groups[entry.category] = [];
    groups[entry.category].push(entry);
  }

  const rewards  = catalog.filter((e: any) => !e.is_penalty);
  const penalties = catalog.filter((e: any) => e.is_penalty);

  return (
    <div className="min-h-screen" style={{ background: '#0a0805' }}>

      {/* Title Bar */}
      <div className="flex items-center justify-between px-4 py-3"
        style={{
          background: 'linear-gradient(90deg, #1e1508, #2a1e08, #1e1508)',
          borderBottom: '2px solid rgba(200,160,50,0.4)',
        }}>
        <Link href="/" className="text-sm hover:opacity-70"
          style={{ color: 'rgba(200,160,50,0.6)', fontFamily: "'Noto Serif SC', serif" }}>
          ← 返回
        </Link>
        <div className="flex items-center gap-2">
          <span>📚</span>
          <span style={{ fontFamily: "'Cinzel', serif", color: '#f0c060', fontSize: '14px', letterSpacing: '3px' }}>
            QUEST CATALOG
          </span>
          <span className="px-2 py-[2px] rounded-sm text-[11px]"
            style={{ background: 'rgba(200,160,50,0.12)', border: '1px solid rgba(200,160,50,0.35)', color: '#c8a040', fontFamily: "'Cinzel', serif" }}>
            {rewards.length} 奖励 · {penalties.length} 惩罚
          </span>
        </div>
        <div style={{ width: '60px' }} />
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">

        {Object.entries(groups).map(([category, entries]) => {
          const cat = CATEGORY_LABELS[category] ?? { zh: category, icon: '📋' };
          const isPenaltyGroup = category === 'penalty';
          return (
            <div key={category} className="mb-6">
              {/* Category header */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">{cat.icon}</span>
                <span style={{
                  fontFamily: "'Noto Serif SC', serif",
                  color: isPenaltyGroup ? '#ff6060' : '#c8a040',
                  fontSize: '12px', fontWeight: 700, letterSpacing: '2px'
                }}>
                  {cat.zh.toUpperCase()}
                </span>
                <div className="flex-1 h-px ml-1" style={{ background: isPenaltyGroup ? 'rgba(255,60,60,0.2)' : 'rgba(200,160,50,0.2)' }} />
                <span style={{ color: 'rgba(200,160,50,0.4)', fontSize: '11px', fontFamily: "'Noto Serif SC', serif" }}>
                  {entries.length} 条
                </span>
              </div>

              {/* Entries table */}
              <div className="rounded-sm overflow-hidden" style={{ border: `1px solid ${isPenaltyGroup ? 'rgba(255,60,60,0.2)' : 'rgba(200,160,50,0.2)'}` }}>
                {/* Header row */}
                <div className="grid grid-cols-12 px-3 py-2 text-[10px] tracking-widest"
                  style={{
                    background: isPenaltyGroup ? 'rgba(80,10,10,0.6)' : 'rgba(40,28,6,0.8)',
                    color: 'rgba(200,160,50,0.5)',
                    fontFamily: "'Noto Serif SC', serif",
                    borderBottom: `1px solid ${isPenaltyGroup ? 'rgba(255,60,60,0.15)' : 'rgba(200,160,50,0.15)'}`,
                  }}>
                  <span className="col-span-5">任务名称</span>
                  <span className="col-span-3">属性</span>
                  <span className="col-span-2 text-right">经验值</span>
                  <span className="col-span-2 text-right">说明</span>
                </div>

                {entries.map((entry: any, i: number) => {
                  const meta = STAT_META[entry.stat];
                  return (
                    <div key={entry._id}
                      className="grid grid-cols-12 items-center px-3 py-3"
                      style={{
                        background: i % 2 === 0 ? 'rgba(20,14,4,0.6)' : 'rgba(26,18,6,0.6)',
                        borderBottom: i < entries.length - 1 ? '1px solid rgba(0,0,0,0.25)' : 'none',
                      }}>
                      {/* Name */}
                      <div className="col-span-5 flex items-center gap-2">
                        {isPenaltyGroup && <span className="text-xs">💀</span>}
                        <span className="text-sm" style={{ fontFamily: "'Noto Serif SC', serif", color: isPenaltyGroup ? '#d07070' : '#d4b87a' }}>
                          {entry.name}
                        </span>
                      </div>

                      {/* Stat */}
                      <div className="col-span-3">
                        <span className="text-[11px] px-2 py-[2px] rounded-sm font-bold"
                          style={{
                            color: meta?.color ?? '#c8a040',
                            background: `${meta?.color ?? '#c8a040'}18`,
                            fontFamily: "'Cinzel', serif",
                          }}>
                          {meta?.zh ?? entry.stat}
                        </span>
                      </div>

                      {/* XP */}
                      <div className="col-span-2 text-right">
                        <span className="text-sm font-bold tabular-nums"
                          style={{
                            fontFamily: "'Cinzel', serif",
                            color: isPenaltyGroup ? '#ff6060' : '#f0c060',
                          }}>
                          {isPenaltyGroup ? `-${entry.xp}` : `+${entry.xp}`}
                        </span>
                      </div>

                      {/* Description tooltip */}
                      <div className="col-span-2 text-right">
                        {entry.description && (
                          <span title={entry.description} className="text-[11px] cursor-help"
                            style={{ color: 'rgba(200,160,50,0.35)' }}>
                            ℹ️
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <p className="text-center text-xs mt-4" style={{ color: 'rgba(200,160,50,0.25)', fontFamily: "'Noto Serif SC', serif" }}>
          告诉 Game Master 添加新条目 · 标准 XP 值永久固定
        </p>
      </div>
    </div>
  );
}
