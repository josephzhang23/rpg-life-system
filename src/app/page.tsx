"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useCallback, useEffect } from "react";
import Link from "next/link";

/* ── Stat metadata with Chinese names ── */
const STAT_META: Record<string, {
  label: string;
  zh: string;
  bar: string;
  text: string;
  bg: string;
  icon: string;
  color: string;
}> = {
  INT:  { label: "INT",  zh: "智力", bar: "bar-int",  text: "text-int",  bg: "bg-int",  icon: "🧠", color: "#60a0ff" },
  DISC: { label: "DISC", zh: "意志", bar: "bar-disc", text: "text-disc", bg: "bg-disc", icon: "⚡", color: "#ff8040" },
  STR:  { label: "STR",  zh: "力量", bar: "bar-str",  text: "text-str",  bg: "bg-str",  icon: "💪", color: "#ff4060" },
  SOC:  { label: "SOC",  zh: "魅力", bar: "bar-soc",  text: "text-soc",  bg: "bg-soc",  icon: "🤝", color: "#40d890" },
  CRE:  { label: "CRE",  zh: "创造", bar: "bar-cre",  text: "text-cre",  bg: "bg-cre",  icon: "✨", color: "#c060ff" },
};

const STREAK_META: Record<string, { icon: string; zh: string }> = {
  daily:     { icon: "📅", zh: "每日" },
  gym:       { icon: "🏋️", zh: "健身" },
  deep_work: { icon: "🧠", zh: "专注" },
  reading:   { icon: "📚", zh: "阅读" },
};

const DAILY_QUEST_TEMPLATES = [
  { name: "Plan your top 3 priorities", stat: "DISC", xp_reward: 20, objective: "写下今天最重要的三件事，专注执行。", description: "真正的高手从不靠灵感，只靠系统。清单越短，执行力越强。" },
  { name: "60 minutes deep work sprint", stat: "INT", xp_reward: 35, objective: "不间断专注工作 60 分钟，关闭一切干扰。", description: "心流不是等来的，是逼出来的。前十分钟最难，撑过去之后大脑会进入另一个频道。" },
  { name: "Workout / movement session", stat: "STR", xp_reward: 30, objective: "完成任意形式的体能训练。", description: "身体是你唯一不能外包的资产。健身房、跑步、游泳——形式不重要，动起来才算数。" },
  { name: "Meaningful outreach or connection", stat: "SOC", xp_reward: 25, objective: "主动联系一个有价值的人。", description: "网络效应不只属于产品，也属于人。每一次主动出击都是在构建你的社交护城河。" },
  { name: "Create something publishable", stat: "CRE", xp_reward: 40, objective: "创造并发布一件有价值的作品。", description: "发布的那一刻，作品才真正存在。再好的想法，没有发布都是幻觉。" },
  { name: "Push a commit", stat: "CRE", xp_reward: 30, objective: "向代码仓库提交至少一个 commit。", description: "代码库里的每一个 commit 都是你存在的证明。不提交，就等于不战斗。" },
];

/* ── WoW-style XP bar ── */
function StatValue({ stat, value, bonus = 0 }: { stat: string; value: number; bonus?: number }) {
  const meta = STAT_META[stat];
  // Base: floor(sqrt(total_xp) * 3)
  const raw = Math.sqrt(value) * 3;
  const base = Math.floor(raw);
  const total = base + bonus;
  // Progress bar: fractional progress to next integer point
  const pct = value === 0 ? 0 : (raw - base) * 100;

  return (
    <div className="flex items-center gap-3 mb-4 last:mb-0">
      {/* Icon */}
      <span className="text-base w-6 text-center flex-shrink-0">{meta.icon}</span>

      {/* Chinese name */}
      <span className="text-sm font-bold w-8 flex-shrink-0"
        style={{ fontFamily: "'Noto Serif SC', serif", color: '#d4b87a' }}>
        {meta.zh}
      </span>

      {/* Bar */}
      <div className="flex-1 h-[6px] rounded-sm overflow-hidden border border-white/[0.04]"
        style={{ background: 'rgba(255,255,255,0.04)' }}>
        <div
          className={`h-full rounded-sm transition-all duration-700 ${meta.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Total value + gear bonus indicator */}
      <div className="flex items-baseline gap-1 flex-shrink-0" style={{ minWidth: '64px', justifyContent: 'flex-end' }}>
        <span className="text-base font-bold tabular-nums"
          style={{ color: bonus > 0 ? '#ffd700' : meta.color, fontFamily: "'Cinzel', serif" }}>
          {total}
        </span>
        {bonus > 0 && (
          <span className="text-[10px] tabular-nums"
            style={{ color: meta.color, fontFamily: "'Cinzel', serif", opacity: 0.7 }}>
            ({base}+{bonus})
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Quest row (template-based) ── */
function QuestRow({ quest, completed, onComplete }: {
  quest: any;
  completed: boolean;
  onComplete: (quest: any) => void;
}) {
  const meta = STAT_META[quest.stat] ?? STAT_META["INT"];
  const isPenalty = quest.is_penalty ?? false;
  return (
    <div
      className="flex items-center gap-3 py-[10px] border-b last:border-0"
      style={{ borderColor: isPenalty ? 'rgba(255,60,60,0.08)' : 'rgba(200,160,50,0.08)' }}
    >
      <button
        onClick={() => !completed && onComplete(quest)}
        className={`w-[18px] h-[18px] rounded-sm flex-shrink-0 border flex items-center justify-center text-[10px] transition-all
          ${completed
            ? isPenalty ? "bg-red-900/30 border-red-600/50 text-red-400" : "bg-green-900/30 border-green-600/50 text-green-400"
            : isPenalty ? "border-red-800/50 hover:border-red-500/70 cursor-pointer hover:bg-red-900/10" : "border-yellow-800/50 hover:border-yellow-500/70 cursor-pointer hover:bg-yellow-900/10"
          }`}
      >
        {completed && (isPenalty ? "✗" : "✓")}
      </button>

      <span className="flex-shrink-0 text-xs">{isPenalty ? "💀" : ""}</span>

      <span
        className="flex-1 text-sm"
        style={{
          fontFamily: "'Noto Serif SC', serif",
          color: completed ? 'rgba(232,213,163,0.3)' : isPenalty ? 'rgba(255,120,100,0.9)' : 'rgba(232,213,163,0.85)',
          textDecoration: completed ? 'line-through' : 'none'
        }}
      >
        {quest.name}
      </span>

      <span
        className="text-[11px] font-bold px-2 py-[2px] rounded-sm flex-shrink-0"
        style={{
          fontFamily: "'Cinzel', serif",
          background: isPenalty ? 'rgba(255,60,60,0.15)' : meta.bg,
          color: isPenalty ? '#ff6060' : meta.color,
        }}
      >
        {isPenalty ? `-${quest.xp_reward}` : `+${quest.xp_reward}`} {meta.zh}
      </span>
    </div>
  );
}

/* ── Achievement badge ── */
function AchievementRow({ achievement }: { achievement: any }) {
  const locked = !achievement.unlocked;
  return (
    <div
      className="flex items-center gap-3 px-3 py-3"
      style={{
        background: locked
          ? 'linear-gradient(90deg, #221908, #1e1606)'   /* WoW: warm dark brown for locked */
          : 'linear-gradient(90deg, #3a2a06, #2e2004)',  /* slightly brighter for unlocked */
        borderTop: '1px solid rgba(0,0,0,0.35)',
        borderBottom: '1px solid rgba(255,200,80,0.06)',
      }}
    >
      {/* Icon — WoW square frame */}
      <div
        className="flex-shrink-0 w-12 h-12 flex items-center justify-center text-2xl rounded-sm"
        style={{
          background: 'linear-gradient(135deg, #1c1408, #100e05)',
          border: '2px solid',
          borderColor: locked ? '#4a3810' : '#8a6a18',
          boxShadow: locked
            ? 'inset 0 0 6px rgba(0,0,0,0.7)'
            : 'inset 0 0 8px rgba(180,120,0,0.25), 0 0 5px rgba(160,120,30,0.3)',
          filter: locked ? 'brightness(0.7) saturate(0.5)' : 'none',
        }}
      >
        {achievement.icon}
      </div>

      {/* Name + description — centered */}
      <div className="flex-1 min-w-0 text-center px-2">
        <div
          className="text-[15px] font-semibold leading-snug"
          style={{
            fontFamily: "'Noto Serif SC', serif",
            /* locked: warm readable tan (exactly WoW's unearned text) */
            color: locked ? '#b8924a' : '#f0e0b0',
            textShadow: '0 1px 3px rgba(0,0,0,0.9)',
          }}
        >
          {achievement.name}
        </div>
        <div
          className="text-[11px] mt-[3px] leading-snug"
          style={{
            fontFamily: "'Noto Serif SC', serif",
            /* locked: dimmer tan, still readable */
            color: locked ? '#7a5e28' : 'rgba(210,185,130,0.65)',
          }}
        >
          {achievement.unlocked
            ? `解锁于 ${achievement.unlocked_at?.slice(0, 10)}`
            : achievement.condition
              ? achievement.condition
              : '完成特定目标解锁'}
        </div>
      </div>

      {/* Circular badge — silver when locked, gold when unlocked */}
      <div
        className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center font-bold"
        style={{
          background: locked
            ? 'radial-gradient(circle at 35% 35%, #4a3e2a, #1e1a10)'
            : 'radial-gradient(circle at 35% 35%, #6a4800, #3a2600)',
          border: '2px solid',
          borderColor: locked ? '#5a4a20' : '#c89030',
          boxShadow: locked
            ? 'inset 0 1px 4px rgba(0,0,0,0.7), inset 0 -1px 2px rgba(255,220,100,0.05)'
            : 'inset 0 1px 4px rgba(255,200,50,0.15), 0 0 8px rgba(180,130,0,0.35)',
          color: locked ? '#7a6830' : '#f5d060',
          fontFamily: "'Cinzel', serif",
          fontSize: '13px',
        }}
      >
        {locked ? '?' : '✦'}
      </div>
    </div>
  );
}

/* ── Main Dashboard ── */
export default function Dashboard() {
  const data = useQuery(api.character.getDashboard);
  const initCharacter     = useMutation(api.character.initCharacter);
  const logCompletedQuest = useMutation(api.character.logCompletedQuest);

  const [seeding, setSeeding]       = useState(false);
  const [levelUpMsg, setLevelUpMsg] = useState<string | null>(null);

  // Set of quest names completed today (for template status overlay)
  const completedNames = new Set((data?.questsToday ?? []).map((q: any) => q.name));

  const handleComplete = useCallback(async (quest: any) => {
    const result = await logCompletedQuest({
      name: quest.name,
      stat: quest.stat,
      xp_reward: quest.xp_reward,
      objective: quest.objective,
      description: quest.description,
      is_penalty: quest.is_penalty ?? false,
    });
    if (result && result.xpResult) {
      const { xpResult } = result;
      const oldOverallLevel = data?.overallLevel ?? 1;
      if ((xpResult.overall_level ?? 0) > oldOverallLevel) {
        setLevelUpMsg(`🎉 人物升级 — Lv.${xpResult.overall_level}`);
        setTimeout(() => setLevelUpMsg(null), 4000);
      }
    }
  }, [logCompletedQuest, data]);

  const handleSeed = async () => {
    setSeeding(true);
    await initCharacter();
    setSeeding(false);
  };

  /* Loading */
  if (data === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-yellow-600 tracking-widest text-sm animate-pulse"
          style={{ fontFamily: "'Noto Serif SC', serif" }}>
          加载角色中...
        </div>
      </div>
    );
  }

  /* No character */
  if (!data.character) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6">
        <div className="text-5xl">⚔️</div>
        <div className="text-2xl text-yellow-500 tracking-wider" style={{ fontFamily: "'Noto Serif SC', serif" }}>
          未找到角色
        </div>
        <p className="text-sm" style={{ color: 'rgba(232,213,163,0.4)', fontFamily: "'Noto Serif SC', serif" }}>
          初始化角色以开始旅程。
        </p>
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="px-8 py-3 text-sm tracking-widest border rounded transition-all disabled:opacity-50"
          style={{
            fontFamily: "'Noto Serif SC', serif",
            color: '#c8a040',
            borderColor: 'rgba(200,160,50,0.5)',
            background: 'transparent',
          }}
          onMouseOver={e => (e.currentTarget.style.background = 'rgba(200,160,50,0.1)')}
          onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
        >
          {seeding ? "初始化中..." : "开始游戏"}
        </button>
      </div>
    );
  }

  const { character, stats, streaks, questsToday, activeBoss, achievements, overallLevel, overallTotalXp, overallXpInLevel, overallXpNeeded, equipmentBonuses, today } = data;
  const streakMap = Object.fromEntries((streaks ?? []).map((s: any) => [s.type, s.count]));

  const todayFormatted = new Date(today + "T00:00:00").toLocaleDateString("zh-CN", { timeZone: 'Asia/Shanghai',
    weekday: "short", month: "long", day: "numeric"
  });

  const bossDeadline = activeBoss?.deadline
    ? Math.max(0, Math.ceil((new Date(activeBoss.deadline).getTime() - Date.now()) / 86400000))
    : null;

  const dailyTemplates = DAILY_QUEST_TEMPLATES;
  const templateNames  = new Set(DAILY_QUEST_TEMPLATES.map(t => t.name));
  const adHocCompleted = (questsToday ?? []).filter((q: any) => !templateNames.has(q.name));
  const completedCount = dailyTemplates.filter((q: any) => completedNames.has(q.name)).length + adHocCompleted.length;
  const totalCount     = dailyTemplates.length + adHocCompleted.length;

  return (
    <div className="max-w-[960px] mx-auto px-4 py-6 relative">

      {/* Level Up Toast */}
      {levelUpMsg && (
        <div
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 levelup-toast px-6 py-3 rounded shadow-xl backdrop-blur-sm"
          style={{
            background: 'rgba(30,20,5,0.92)',
            border: '1px solid rgba(200,160,50,0.6)',
            color: '#f0c060',
            fontFamily: "'Noto Serif SC', serif",
            fontSize: '14px',
            letterSpacing: '2px',
          }}
        >
          {levelUpMsg}
        </div>
      )}

      {/* ── Header — WoW name panel style ── */}
      <div className="mb-6 pb-5" style={{ borderBottom: '1px solid rgba(200,160,50,0.25)' }}>
        <div className="flex gap-3" style={{ alignItems: 'stretch' }}>

          {/* Avatar — circular WoW portrait */}
          <div
            className="flex-shrink-0 flex items-center justify-center text-3xl"
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 30%, #2a1a05, #0a0805)',
              border: '2px solid #c8a030',
              boxShadow: '0 0 0 1px rgba(200,160,50,0.25), 0 0 16px rgba(200,120,0,0.3), inset 0 0 12px rgba(0,0,0,0.6)',
              alignSelf: 'center',
            }}
          >
            ⚔️
          </div>

          {/* Right: 3 rows stacked, space-between */}
          <div className="flex-1 min-w-0 flex flex-col justify-between" style={{ gap: '6px' }}>

            {/* Row 1: Name */}
            <h1
              style={{
                fontFamily: "'Cinzel', serif",
                color: '#f0c060',
                fontSize: '18px',
                letterSpacing: '2px',
                lineHeight: 1.2,
                wordBreak: 'break-word',
                margin: 0,
              }}
            >
              {character.name.toUpperCase()}
            </h1>

            {/* Row 2: Class badge + Level */}
            <div className="flex items-center justify-between">
              <span
                className="px-2 py-[2px] text-[11px] tracking-[1px] rounded-sm"
                style={{
                  background: 'rgba(120,60,200,0.2)',
                  border: '1px solid rgba(120,60,200,0.4)',
                  color: '#c090ff',
                  fontFamily: "'Noto Serif SC', serif",
                }}
              >
                ⚡ 创始人
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-[10px] tracking-widest"
                  style={{ color: 'rgba(200,160,50,0.45)', fontFamily: "'Noto Serif SC', serif" }}>
                  总等级
                </span>
                <span className="text-3xl leading-none"
                  style={{ color: '#f0c060', fontFamily: "'Cinzel', serif" }}>
                  {overallLevel}
                </span>
              </div>
            </div>

            {/* Row 3: XP bar */}
            <div>
              <div className="w-full h-[5px] rounded-full overflow-hidden"
                style={{ background: 'rgba(200,160,50,0.12)', border: '1px solid rgba(200,160,50,0.2)' }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(100, Math.round(((overallXpInLevel ?? 0) / (overallXpNeeded ?? 500)) * 100))}%`,
                    background: 'linear-gradient(90deg, #c8a030, #f0d060)',
                    boxShadow: '0 0 6px rgba(240,200,60,0.5)',
                  }} />
              </div>
              <div className="text-[10px] mt-[3px] text-right tabular-nums"
                style={{ color: 'rgba(200,160,50,0.4)', fontFamily: "'Cinzel', serif" }}>
                {overallXpInLevel ?? 0} / {overallXpNeeded ?? 500} XP
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* 角色属性 */}
        <div className="panel">
          <div className="panel-title">📊 角色属性</div>
          {(stats ?? []).map((s: any) => (
            <StatValue key={s.stat_id} stat={s.stat_id} value={s.total_xp ?? 0} bonus={equipmentBonuses?.[s.stat_id] ?? 0} />
          ))}
        </div>

        {/* 连续记录 */}
        <div className="panel">
          <div className="panel-title">🔥 连续记录</div>
          <div className="grid grid-cols-4 gap-2">
            {["daily", "gym", "deep_work", "reading"].map((type) => {
              const sm = STREAK_META[type];
              return (
                <div
                  key={type}
                  className="rounded-sm py-3 text-center"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(200,160,50,0.12)',
                  }}
                >
                  <div className="text-xl">{sm.icon}</div>
                  <div className="font-cinzel text-2xl leading-tight mt-1" style={{ color: '#f0c060' }}>
                    {streakMap[type] ?? 0}
                  </div>
                  <div
                    className="text-[10px] mt-1"
                    style={{ color: 'rgba(200,160,50,0.55)', fontFamily: "'Noto Serif SC', serif" }}
                  >
                    {sm.zh}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 副本 — full width */}
        <div className="md:col-span-2">
          {activeBoss ? (
            <div style={{
              border: '2px solid rgba(100,70,30,0.7)',
              background: 'linear-gradient(180deg, rgba(8,4,18,0.95) 0%, rgba(20,10,5,0.9) 100%)',
              borderRadius: '2px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Stone texture scanlines */}
              <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.008) 3px, rgba(255,255,255,0.008) 4px)',
                pointerEvents: 'none', zIndex: 0,
              }} />

              {/* Dungeon Header Bar */}
              <div style={{
                background: 'linear-gradient(90deg, rgba(60,20,8,0.9), rgba(35,12,4,0.7), rgba(60,20,8,0.9))',
                borderBottom: '1px solid rgba(120,70,20,0.45)',
                padding: '7px 12px',
                display: 'flex', alignItems: 'center', gap: '8px',
                position: 'relative', zIndex: 1,
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: '#ff4040', boxShadow: '0 0 7px #ff4040',
                  display: 'inline-block', flexShrink: 0,
                }} />
                <span style={{
                  fontFamily: "'Noto Serif SC', serif", fontSize: '11px',
                  letterSpacing: '2px', color: '#ff8060',
                  textTransform: 'uppercase', fontWeight: 700,
                }}>副本进行中</span>
                <span style={{
                  fontSize: '10px', color: 'rgba(200,160,100,0.5)',
                  fontFamily: "'Cinzel', serif", letterSpacing: '1px',
                }}>· 普通 · Solo</span>
                {bossDeadline !== null && (
                  <span style={{
                    marginLeft: 'auto', fontSize: '11px',
                    color: bossDeadline <= 7 ? '#ff6060' : 'rgba(200,160,80,0.75)',
                    fontFamily: "'Noto Serif SC', serif",
                    background: 'rgba(0,0,0,0.35)', padding: '2px 8px',
                    borderRadius: '1px',
                    border: `1px solid ${bossDeadline <= 7 ? 'rgba(200,50,50,0.4)' : 'rgba(100,70,20,0.3)'}`,
                  }}>
                    ⏱ {bossDeadline} 天剩余
                  </span>
                )}
              </div>

              {/* Boss Encounter Area */}
              <div style={{ padding: '12px 14px', position: 'relative', zIndex: 1 }}>
                {/* Boss portrait row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '2px', flexShrink: 0,
                    background: 'linear-gradient(135deg, rgba(60,10,10,0.9), rgba(20,5,5,0.95))',
                    border: '1px solid rgba(150,50,20,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '20px',
                  }}>💀</div>
                  <div>
                    <div style={{
                      fontFamily: "'Cinzel', serif", fontSize: '13px',
                      color: '#e8c880', fontWeight: 700, letterSpacing: '0.5px', lineHeight: 1.2,
                    }}>{activeBoss.name}</div>
                    <div style={{
                      fontFamily: "'Noto Serif SC', serif", fontSize: '10px',
                      color: 'rgba(200,130,60,0.5)', marginTop: '2px',
                    }}>精英首领 · 必须击败</div>
                  </div>
                </div>

                {/* Boss HP Bar (inverted — shows remaining HP) */}
                {activeBoss.current_value != null && activeBoss.target_value != null ? (() => {
                  const progressPct = Math.min(100, Math.round((activeBoss.current_value / activeBoss.target_value) * 100));
                  const bossHpPct = Math.max(0, 100 - progressPct);
                  const hpColor = bossHpPct > 50 ? '#20c050' : bossHpPct > 20 ? '#c8a020' : '#e03020';
                  return (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '10px', color: 'rgba(200,160,80,0.5)', fontFamily: "'Noto Serif SC', serif" }}>Boss HP</span>
                        <span style={{
                          fontSize: '11px', fontFamily: "'Cinzel', serif", fontWeight: 700,
                          color: bossHpPct <= 5 ? '#ff3030' : bossHpPct <= 20 ? '#e08020' : 'rgba(232,213,163,0.7)',
                        }}>
                          {bossHpPct === 0 ? '⚡ DEFEATED' : `${bossHpPct}%`}
                        </span>
                      </div>
                      {/* HP track */}
                      <div style={{
                        height: '11px', background: 'rgba(0,0,0,0.55)',
                        borderRadius: '1px', border: '1px solid rgba(80,40,10,0.5)',
                        overflow: 'hidden', position: 'relative',
                      }}>
                        {/* WoW segment dividers */}
                        <div style={{
                          position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
                          backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 23px, rgba(0,0,0,0.35) 23px, rgba(0,0,0,0.35) 24px)',
                        }} />
                        <div style={{
                          height: '100%', width: `${bossHpPct}%`,
                          background: `linear-gradient(90deg, ${hpColor}90, ${hpColor})`,
                          boxShadow: `0 0 8px ${hpColor}70`,
                          transition: 'width 0.8s ease, background 0.5s ease',
                          borderRadius: '1px',
                        }} />
                      </div>
                      {/* Numbers */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                        <span style={{ fontSize: '11px', color: 'rgba(232,213,163,0.5)', fontFamily: "'Cinzel', serif" }}>
                          ${activeBoss.current_value.toLocaleString()}
                          <span style={{ color: 'rgba(200,160,80,0.3)' }}> / ${activeBoss.target_value.toLocaleString()}</span>
                        </span>
                        <span style={{ fontSize: '11px', color: 'rgba(232,213,163,0.4)', fontFamily: "'Noto Serif SC', serif" }}>
                          差 <span style={{ color: '#f0a060', fontWeight: 700 }}>${(activeBoss.target_value - activeBoss.current_value).toLocaleString()}</span> 击杀
                        </span>
                      </div>
                    </div>
                  );
                })() : (
                  <div style={{ height: '11px', background: 'rgba(0,0,0,0.4)', borderRadius: '1px', border: '1px solid rgba(80,40,10,0.3)' }}>
                    <div style={{ height: '100%', width: '0%', background: '#20c050', borderRadius: '1px' }} />
                  </div>
                )}

                {/* Reward strip */}
                <div style={{
                  marginTop: '10px', paddingTop: '8px',
                  borderTop: '1px solid rgba(100,70,20,0.2)',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  <span style={{ fontSize: '13px' }}>🏆</span>
                  <span style={{ fontSize: '11px', color: 'rgba(232,213,163,0.4)', fontFamily: "'Noto Serif SC', serif" }}>通关奖励：</span>
                  <span style={{ fontSize: '11px', color: '#f0c060', fontWeight: 700, fontFamily: "'Cinzel', serif" }}>
                    +{activeBoss.xp_reward} {STAT_META[activeBoss.stat]?.zh ?? activeBoss.stat} XP
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              border: '1px solid rgba(80,50,20,0.25)',
              background: 'rgba(10,5,20,0.3)',
              borderRadius: '2px', padding: '14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '16px', opacity: 0.35 }}>⚔️</span>
                <span style={{
                  fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase',
                  color: 'rgba(150,100,50,0.4)', fontFamily: "'Noto Serif SC', serif",
                }}>副本</span>
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(232,213,163,0.25)', fontFamily: "'Noto Serif SC', serif" }}>
                暂无进行中的副本。设定大目标来触发副本。
              </div>
            </div>
          )}
        </div>

        {/* 每日任务 */}
        <div className="panel">
          <div className="flex items-center gap-3 mb-4">
            <span
              className="text-[11px] tracking-[2px] uppercase whitespace-nowrap"
              style={{ fontFamily: "'Noto Serif SC', serif", color: '#c8a040', fontWeight: 700 }}
            >
              📋 每日任务
            </span>
            <div className="flex-1 h-px" style={{ background: 'rgba(200,160,50,0.2)' }} />
            <span className="text-[10px] whitespace-nowrap" style={{ color: 'rgba(200,160,50,0.5)', fontFamily: "'Noto Serif SC', serif" }}>
              {todayFormatted} · {completedCount}/{totalCount}
            </span>
          </div>
          {dailyTemplates.map((q: any) => (
            <QuestRow
              key={q.name}
              quest={q}
              completed={completedNames.has(q.name)}
              onComplete={handleComplete}
            />
          ))}
          {/* Ad-hoc completed quests (not in daily templates) */}
          {(() => {
            const templateNames = new Set(DAILY_QUEST_TEMPLATES.map(t => t.name));
            const adHoc = (questsToday ?? []).filter((q: any) => !templateNames.has(q.name));
            if (adHoc.length === 0) return null;
            return (
              <>
                <div className="my-2" style={{ borderTop: '1px solid rgba(200,160,50,0.1)' }} />
                {adHoc.map((q: any) => (
                  <QuestRow key={q._id} quest={q} completed={true} onComplete={() => {}} />
                ))}
              </>
            );
          })()}
        </div>

        {/* 成就 — full width */}
        <div className="md:col-span-2 rounded-sm overflow-hidden"
          style={{ border: '1px solid rgba(200,160,50,0.3)', background: '#0e0a05' }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{
              background: 'linear-gradient(90deg, rgba(60,40,5,0.9), rgba(40,28,4,0.9))',
              borderBottom: '1px solid rgba(200,160,50,0.25)',
            }}
          >
            <span style={{ fontFamily: "'Noto Serif SC', serif", color: '#f0c060', fontSize: '11px', letterSpacing: '3px', fontWeight: 700 }}>
              🏆 成就
            </span>
            <span style={{ fontFamily: "'Noto Serif SC', serif", color: 'rgba(200,160,50,0.5)', fontSize: '11px' }}>
              {(achievements ?? []).filter((a: any) => a.unlocked).length} / {(achievements ?? []).length} 已解锁
            </span>
          </div>
          {/* Rows */}
          <div className="flex flex-col">
            {(achievements ?? []).map((a: any) => (
              <AchievementRow key={a._id} achievement={a} />
            ))}
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="mt-8 flex justify-center">
        <div className="text-xs tracking-[3px]"
          style={{ color: 'rgba(200,160,50,0.2)', fontFamily: "'Noto Serif SC', serif" }}>
          RPG Life System
        </div>
      </div>

    </div>
  );
}
