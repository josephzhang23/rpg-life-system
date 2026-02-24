"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useCallback, useEffect } from "react";

/* ── Stat metadata with Chinese names ── */
const STAT_META: Record<string, {
  label: string;
  zh: string;
  bar: string;
  text: string;
  bg: string;
  icon: string;
}> = {
  INT:  { label: "INT",  zh: "智力", bar: "bar-int",  text: "text-int",  bg: "bg-int",  icon: "🧠" },
  DISC: { label: "DISC", zh: "意志", bar: "bar-disc", text: "text-disc", bg: "bg-disc", icon: "⚡" },
  STR:  { label: "STR",  zh: "力量", bar: "bar-str",  text: "text-str",  bg: "bg-str",  icon: "💪" },
  SOC:  { label: "SOC",  zh: "魅力", bar: "bar-soc",  text: "text-soc",  bg: "bg-soc",  icon: "🤝" },
  CRE:  { label: "CRE",  zh: "创造", bar: "bar-cre",  text: "text-cre",  bg: "bg-cre",  icon: "✨" },
};

const STREAK_META: Record<string, { icon: string; zh: string }> = {
  daily:     { icon: "📅", zh: "每日" },
  gym:       { icon: "🏋️", zh: "健身" },
  deep_work: { icon: "🧠", zh: "专注" },
  reading:   { icon: "📚", zh: "阅读" },
};

/* ── WoW-style XP bar ── */
function XpBar({ stat, xp, level }: { stat: string; xp: number; level: number }) {
  const meta = STAT_META[stat];
  const max = level * 100;
  const pct = Math.min((xp / max) * 100, 100);

  return (
    <div className="flex items-center gap-3 mb-4 last:mb-0">
      {/* Icon */}
      <span className="text-base w-6 text-center flex-shrink-0">{meta.icon}</span>

      {/* Chinese name */}
      <span className={`font-zh text-sm font-bold w-8 flex-shrink-0 ${meta.text}`} style={{ fontFamily: "'Noto Serif SC', serif" }}>
        {meta.zh}
      </span>

      {/* Level badge */}
      <span className="level-badge flex-shrink-0">Lv.{level}</span>

      {/* Bar */}
      <div className="flex-1 h-[8px] bg-white/[0.06] rounded-sm overflow-hidden border border-white/[0.04]">
        <div
          className={`h-full rounded-sm transition-all duration-700 ${meta.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* XP numbers */}
      <span className="text-[11px] tabular-nums flex-shrink-0" style={{ color: 'rgba(232,213,163,0.5)', minWidth: '52px', textAlign: 'right' }}>
        {xp}/{max}
      </span>
    </div>
  );
}

/* ── Quest row ── */
function QuestRow({ quest, onComplete }: { quest: any; onComplete: (id: string) => void }) {
  const meta = STAT_META[quest.stat] ?? STAT_META["INT"];
  return (
    <div
      className="flex items-center gap-3 py-[10px] border-b last:border-0"
      style={{ borderColor: 'rgba(200,160,50,0.08)' }}
    >
      <button
        onClick={() => !quest.completed && onComplete(quest._id)}
        className={`w-[18px] h-[18px] rounded-sm flex-shrink-0 border flex items-center justify-center text-[10px] transition-all
          ${quest.completed
            ? "bg-green-900/30 border-green-600/50 text-green-400"
            : "border-yellow-800/50 hover:border-yellow-500/70 cursor-pointer hover:bg-yellow-900/10"
          }`}
      >
        {quest.completed && "✓"}
      </button>

      <span
        className="flex-1 text-sm"
        style={{
          fontFamily: "'Noto Serif SC', serif",
          color: quest.completed ? 'rgba(232,213,163,0.3)' : 'rgba(232,213,163,0.85)',
          textDecoration: quest.completed ? 'line-through' : 'none'
        }}
      >
        {quest.name}
      </span>

      <span className={`text-[11px] font-bold px-2 py-[2px] rounded-sm flex-shrink-0 ${meta.bg}`}
        style={{ fontFamily: "'Cinzel', serif" }}>
        +{quest.xp_reward} {meta.zh}
      </span>
    </div>
  );
}

/* ── Achievement badge ── */
function AchievementRow({ achievement }: { achievement: any }) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-[10px] rounded-sm transition-all
        ${achievement.unlocked
          ? "bg-yellow-900/10 border border-yellow-700/25"
          : "bg-white/[0.015] border border-white/[0.04]"
        }`}
    >
      {/* Icon frame — WoW style */}
      <div
        className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-sm text-xl"
        style={{
          background: achievement.unlocked
            ? 'linear-gradient(135deg, #2a1f00, #1a1200)'
            : 'rgba(20,20,20,0.6)',
          border: achievement.unlocked
            ? '1px solid rgba(200,160,50,0.5)'
            : '1px solid rgba(255,255,255,0.06)',
          boxShadow: achievement.unlocked
            ? 'inset 0 0 6px rgba(200,120,0,0.2)'
            : 'none',
          filter: achievement.unlocked ? 'none' : 'grayscale(1) brightness(0.4)',
        }}
      >
        {achievement.icon}
      </div>

      {/* Name + condition */}
      <div className="flex-1 min-w-0">
        <div
          className="text-sm font-semibold leading-tight truncate"
          style={{
            fontFamily: "'Noto Serif SC', serif",
            color: achievement.unlocked ? '#f0c060' : 'rgba(232,213,163,0.3)',
          }}
        >
          {achievement.name}
        </div>
        {achievement.condition && (
          <div
            className="text-[11px] mt-[2px] truncate"
            style={{
              fontFamily: "'Noto Serif SC', serif",
              color: achievement.unlocked
                ? 'rgba(232,213,163,0.5)'
                : 'rgba(232,213,163,0.2)',
            }}
          >
            {achievement.unlocked
              ? `解锁于 ${achievement.unlocked_at?.slice(0, 10)}`
              : `解锁条件：${achievement.condition}`}
          </div>
        )}
      </div>

      {/* Shield badge */}
      <div
        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-sm text-[10px] font-bold"
        style={{
          background: achievement.unlocked
            ? 'linear-gradient(135deg, #5a3a00, #3a2000)'
            : 'rgba(30,30,30,0.5)',
          border: achievement.unlocked
            ? '1px solid rgba(200,160,50,0.6)'
            : '1px solid rgba(255,255,255,0.05)',
          color: achievement.unlocked ? '#f0c060' : 'rgba(255,255,255,0.15)',
          fontFamily: "'Cinzel', serif",
        }}
      >
        {achievement.unlocked ? '✓' : '🔒'}
      </div>
    </div>
  );
}

/* ── Main Dashboard ── */
export default function Dashboard() {
  const data = useQuery(api.character.getDashboard);
  const initCharacter    = useMutation(api.character.initCharacter);
  const completeQuest    = useMutation(api.character.completeQuest);
  const generateDailyQuests = useMutation(api.character.generateDailyQuests);

  const [seeding, setSeeding]       = useState(false);
  const [levelUpMsg, setLevelUpMsg] = useState<string | null>(null);

  useEffect(() => {
    if (data?.character && data.questsToday?.length === 0) {
      generateDailyQuests();
    }
  }, [data?.character, data?.questsToday?.length, generateDailyQuests]);

  const handleComplete = useCallback(async (questId: string) => {
    const result = await completeQuest({ questId });
    if (result && result.xpResult) {
      const { xpResult } = result;
      const oldLevel = data?.stats?.find((s: any) => s.stat_id === xpResult.statId)?.level ?? 1;
      if (xpResult.level > oldLevel) {
        const meta = STAT_META[xpResult.statId];
        setLevelUpMsg(`⬆️ 等级提升 — ${meta?.zh ?? xpResult.statId} → Lv.${xpResult.level}`);
        setTimeout(() => setLevelUpMsg(null), 3500);
      }
    }
  }, [completeQuest, data]);

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

  const { character, stats, streaks, questsToday, activeBoss, achievements, overallLevel, today } = data;
  const streakMap = Object.fromEntries((streaks ?? []).map((s: any) => [s.type, s.count]));

  const todayFormatted = new Date(today + "T00:00:00").toLocaleDateString("zh-CN", {
    weekday: "short", month: "long", day: "numeric"
  });

  const bossDeadline = activeBoss?.deadline
    ? Math.max(0, Math.ceil((new Date(activeBoss.deadline).getTime() - Date.now()) / 86400000))
    : null;

  const completedCount = (questsToday ?? []).filter((q: any) => q.completed).length;
  const totalCount     = (questsToday ?? []).length;

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

      {/* ── Header ── */}
      <div
        className="flex items-center gap-5 mb-6 pb-5"
        style={{ borderBottom: '1px solid rgba(200,160,50,0.25)' }}
      >
        {/* Avatar */}
        <div
          className="w-16 h-16 rounded-sm flex items-center justify-center text-3xl flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #1a0f00, #0a0805)',
            border: '1px solid rgba(200,160,50,0.5)',
            boxShadow: '0 0 16px rgba(200,120,0,0.2), inset 0 0 8px rgba(0,0,0,0.4)',
          }}
        >
          ⚔️
        </div>

        {/* Name + class */}
        <div className="min-w-0">
          <h1
            className="text-xl tracking-[3px] truncate"
            style={{ fontFamily: "'Cinzel', serif", color: '#f0c060' }}
          >
            {character.name.toUpperCase()}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="px-2 py-[2px] text-[11px] tracking-[2px] rounded-sm"
              style={{
                background: 'rgba(120,60,200,0.2)',
                border: '1px solid rgba(120,60,200,0.4)',
                color: '#c090ff',
                fontFamily: "'Noto Serif SC', serif",
              }}
            >
              ⚡ 创始人
            </span>
          </div>
        </div>

        {/* Overall level */}
        <div className="ml-auto text-right flex-shrink-0">
          <div className="text-[10px] tracking-widest uppercase mb-1" style={{ color: 'rgba(200,160,50,0.5)', fontFamily: "'Noto Serif SC', serif" }}>
            总等级
          </div>
          <div className="font-cinzel text-4xl leading-none" style={{ color: '#f0c060' }}>
            {overallLevel}
          </div>
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* 角色属性 */}
        <div className="panel">
          <div className="panel-title">📊 角色属性</div>
          {(stats ?? []).map((s: any) => (
            <XpBar key={s.stat_id} stat={s.stat_id} xp={s.xp} level={s.level} />
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

        {/* 首领战 — full width */}
        <div className="md:col-span-2">
          {activeBoss ? (
            <div
              className="p-4 rounded-sm boss-active"
              style={{ border: '1px solid rgba(200,40,40,0.5)', background: 'rgba(80,10,10,0.3)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">⚠️</span>
                <span
                  className="text-xs tracking-widest uppercase"
                  style={{ color: '#ff6060', fontFamily: "'Noto Serif SC', serif" }}
                >
                  首领战
                </span>
                {bossDeadline !== null && (
                  <span
                    className="ml-auto text-xs px-2 py-[2px] rounded-sm"
                    style={{ color: '#ff8080', background: 'rgba(150,20,20,0.3)', fontFamily: "'Noto Serif SC', serif" }}
                  >
                    {bossDeadline} 天剩余
                  </span>
                )}
              </div>
              <div className="text-sm mb-3" style={{ color: '#e8d5a3', fontFamily: "'Noto Serif SC', serif" }}>
                {activeBoss.name}
              </div>
              <div
                className="h-[6px] rounded-sm overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                <div
                  className="h-full rounded-sm"
                  style={{
                    width: '33%',
                    background: 'linear-gradient(90deg, #800000, #ff3030)',
                    boxShadow: '0 0 8px rgba(255,50,50,0.5)',
                  }}
                />
              </div>
              <div className="text-[11px] mt-2" style={{ color: 'rgba(232,213,163,0.45)', fontFamily: "'Noto Serif SC', serif" }}>
                奖励：<span style={{ color: '#f0c060', fontWeight: 700 }}>+{activeBoss.xp_reward} {STAT_META[activeBoss.stat]?.zh ?? activeBoss.stat} 经验</span>
              </div>
            </div>
          ) : (
            <div
              className="p-4 rounded-sm"
              style={{ border: '1px solid rgba(200,40,40,0.15)', background: 'rgba(40,5,5,0.2)' }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span>⚠️</span>
                <span
                  className="text-xs tracking-widest uppercase"
                  style={{ color: 'rgba(180,60,60,0.5)', fontFamily: "'Noto Serif SC', serif" }}
                >
                  首领战
                </span>
              </div>
              <div className="text-xs" style={{ color: 'rgba(232,213,163,0.3)', fontFamily: "'Noto Serif SC', serif" }}>
                暂无首领战。设定大目标来触发。
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
          {questsToday.length === 0 ? (
            <p className="text-xs" style={{ color: 'rgba(232,213,163,0.3)', fontFamily: "'Noto Serif SC', serif" }}>
              今日任务尚未生成。
            </p>
          ) : (
            questsToday.map((q: any) => (
              <QuestRow key={q._id} quest={q} onComplete={handleComplete} />
            ))
          )}
        </div>

        {/* 成就 — full width */}
        <div className="panel md:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <span className="panel-title mb-0">🏆 成就</span>
            <span
              className="ml-auto text-[11px]"
              style={{ color: 'rgba(200,160,50,0.45)', fontFamily: "'Noto Serif SC', serif" }}
            >
              {(achievements ?? []).filter((a: any) => a.unlocked).length} / {(achievements ?? []).length} 已解锁
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {(achievements ?? []).map((a: any) => (
              <AchievementRow key={a._id} achievement={a} />
            ))}
          </div>
        </div>

      </div>

      {/* Footer */}
      <div
        className="mt-8 text-center text-xs tracking-[3px]"
        style={{ color: 'rgba(200,160,50,0.25)', fontFamily: "'Noto Serif SC', serif" }}
      >
        人生 RPG 系统 · 创始人版
      </div>

    </div>
  );
}
