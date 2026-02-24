"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useCallback, useEffect } from "react";

const STAT_META: Record<string, { label: string; bar: string; text: string; bg: string; icon: string }> = {
  INT:  { label: "INT",  bar: "bar-int",  text: "text-int",  bg: "bg-int",  icon: "🧠" },
  DISC: { label: "DISC", bar: "bar-disc", text: "text-disc", bg: "bg-disc", icon: "⚡" },
  STR:  { label: "STR",  bar: "bar-str",  text: "text-str",  bg: "bg-str",  icon: "💪" },
  SOC:  { label: "SOC",  bar: "bar-soc",  text: "text-soc",  bg: "bg-soc",  icon: "🤝" },
  CRE:  { label: "CRE",  bar: "bar-cre",  text: "text-cre",  bg: "bg-cre",  icon: "✨" },
};

const STREAK_META: Record<string, { icon: string }> = {
  daily:     { icon: "📅" },
  gym:       { icon: "🏋️" },
  deep_work: { icon: "🧠" },
  reading:   { icon: "📚" },
};

function XpBar({ stat, xp, level }: { stat: string; xp: number; level: number }) {
  const meta = STAT_META[stat];
  const max = level * 100;
  const pct = Math.min((xp / max) * 100, 100);
  return (
    <div className="flex items-center gap-2 mb-3 last:mb-0">
      <span className={`font-cinzel text-xs font-bold tracking-wider w-9 flex-shrink-0 ${meta.text}`}>
        {meta.label}
      </span>
      <span className="text-[11px] text-gray-500 w-7 flex-shrink-0 font-semibold">L{level}</span>
      <div className="flex-1 h-[5px] bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${meta.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] text-gray-600 w-12 text-right flex-shrink-0 tabular-nums">
        {xp}/{max}
      </span>
    </div>
  );
}

function QuestRow({ quest, onComplete }: { quest: any; onComplete: (id: string) => void }) {
  const meta = STAT_META[quest.stat] ?? STAT_META["INT"];
  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
      <button
        onClick={() => !quest.completed && onComplete(quest._id)}
        className={`w-[18px] h-[18px] rounded flex-shrink-0 border flex items-center justify-center text-[10px] transition-all
          ${quest.completed
            ? "bg-green-900/30 border-green-500/50 text-green-400"
            : "border-yellow-900/40 hover:border-yellow-600/60 cursor-pointer"
          }`}
      >
        {quest.completed && "✓"}
      </button>
      <span className={`flex-1 text-sm ${quest.completed ? "text-gray-600 line-through" : "text-gray-300"}`}>
        {quest.name}
      </span>
      <span className={`text-[11px] font-bold px-2 py-[2px] rounded flex-shrink-0 ${meta.bg}`}>
        +{quest.xp_reward} {quest.stat}
      </span>
    </div>
  );
}

function AchievementBadge({ achievement }: { achievement: any }) {
  return (
    <div
      className={`rounded-lg p-3 text-center border transition-all
        ${achievement.unlocked
          ? "border-yellow-700/40 bg-yellow-900/10 opacity-100"
          : "border-white/5 bg-white/[0.02] opacity-30"
        }`}
      title={achievement.unlocked ? `Unlocked: ${achievement.unlocked_at?.slice(0,10)}` : "Locked"}
    >
      <div className="text-xl mb-1">{achievement.icon}</div>
      <div className={`text-[10px] tracking-wide ${achievement.unlocked ? "text-yellow-600" : "text-gray-600"}`}>
        {achievement.name}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const data = useQuery(api.character.getDashboard);
  const initCharacter = useMutation(api.character.initCharacter);
  const completeQuest = useMutation(api.character.completeQuest);
  const generateDailyQuests = useMutation(api.character.generateDailyQuests);
  const [seeding, setSeeding] = useState(false);
  const [levelUpMsg, setLevelUpMsg] = useState<string | null>(null);

  // Auto-generate daily quests if none exist for today
  useEffect(() => {
    if (data?.character && data.questsToday?.length === 0) {
      generateDailyQuests();
    }
  }, [data?.character, data?.questsToday?.length, generateDailyQuests]);

  const handleComplete = useCallback(async (questId: string) => {
    const result = await completeQuest({ questId });
    if (result && result.xpResult) {
      const { xpResult } = result;
      if (xpResult.level > (data?.stats?.find((s: any) => s.stat_id === xpResult.statId)?.level ?? 1)) {
        setLevelUpMsg(`⬆️ LEVEL UP — ${xpResult.statId} → ${xpResult.level}`);
        setTimeout(() => setLevelUpMsg(null), 3000);
      }
    }
  }, [completeQuest, data]);

  const handleSeed = async () => {
    setSeeding(true);
    await initCharacter();
    setSeeding(false);
  };

  if (data === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="font-cinzel text-yellow-700 tracking-widest text-sm animate-pulse">LOADING CHARACTER...</div>
      </div>
    );
  }

  if (!data.character) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6">
        <div className="text-5xl">⚔️</div>
        <div className="font-cinzel text-2xl text-yellow-600 tracking-wider">NO CHARACTER FOUND</div>
        <p className="text-gray-500 text-sm">Initialize your character to begin the journey.</p>
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="px-8 py-3 font-cinzel text-sm tracking-widest text-yellow-400 border border-yellow-700/50 rounded hover:bg-yellow-900/20 transition-all disabled:opacity-50"
        >
          {seeding ? "INITIALIZING..." : "BEGIN GAME"}
        </button>
      </div>
    );
  }

  const { character, stats, streaks, questsToday, activeBoss, achievements, overallLevel, today } = data;
  const streakMap = Object.fromEntries((streaks ?? []).map((s: any) => [s.type, s.count]));

  const todayFormatted = new Date(today + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric"
  });

  const bossDeadline = activeBoss?.deadline
    ? Math.max(0, Math.ceil((new Date(activeBoss.deadline).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div className="max-w-[920px] mx-auto px-4 py-5 relative">

      {/* Level Up Toast */}
      {levelUpMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 levelup-toast bg-yellow-900/80 border border-yellow-600/50 rounded-lg px-6 py-3 font-cinzel text-yellow-300 tracking-widest text-sm shadow-xl backdrop-blur-sm">
          {levelUpMsg}
        </div>
      )}

      {/* ─── Header ─── */}
      <div className="flex items-center gap-4 mb-5 pb-5 border-b border-yellow-900/25">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-950 to-slate-900 border border-yellow-800/40 flex items-center justify-center text-2xl shadow-lg shadow-purple-950/40 flex-shrink-0">
          ⚔️
        </div>
        <div className="min-w-0">
          <h1 className="font-cinzel text-lg tracking-[2px] text-yellow-300 truncate">{character.name.toUpperCase()}</h1>
          <span className="inline-block mt-1 px-2 py-[2px] bg-purple-950/40 border border-purple-700/30 rounded text-[10px] tracking-[2px] text-purple-400 font-semibold whitespace-nowrap">
            ⚡ {character.class.toUpperCase()}
          </span>
        </div>
        <div className="ml-auto text-right flex-shrink-0">
          <div className="font-cinzel text-[10px] text-gray-600 tracking-widest uppercase leading-tight">Overall</div>
          <div className="font-cinzel text-[10px] text-gray-600 tracking-widest uppercase leading-tight">Level</div>
          <div className="font-cinzel text-3xl text-yellow-400 leading-tight">{overallLevel}</div>
        </div>
      </div>

      {/* ─── Main Grid ─── */}
      {/* Mobile: single column stack | Desktop: 2-col grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Stats */}
        <div className="panel">
          <div className="panel-title">📊 Character Stats</div>
          {(stats ?? []).map((s: any) => (
            <XpBar key={s.stat_id} stat={s.stat_id} xp={s.xp} level={s.level} />
          ))}
        </div>

        {/* Streaks */}
        <div className="panel">
          <div className="panel-title">🔥 Streaks</div>
          <div className="grid grid-cols-4 gap-2">
            {["daily", "gym", "deep_work", "reading"].map((type) => (
              <div key={type} className="bg-white/[0.02] border border-white/[0.05] rounded-lg py-3 text-center">
                <div className="text-xl">{STREAK_META[type].icon}</div>
                <div className="font-cinzel text-2xl text-yellow-400 leading-tight mt-1">{streakMap[type] ?? 0}</div>
                <div className="text-[10px] text-gray-600 mt-1 tracking-wider uppercase">
                  {type.replace("_", " ")}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Boss Fight — full width on mobile */}
        <div className="md:col-span-2">
          {activeBoss ? (
            <div className="p-4 rounded-lg border border-red-900/40 bg-red-950/10">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">⚠️</span>
                <span className="font-cinzel text-xs text-red-400 tracking-wider uppercase">Boss Fight</span>
                {bossDeadline !== null && (
                  <span className="ml-auto text-xs text-red-500 bg-red-950/30 px-2 py-[2px] rounded">
                    {bossDeadline}d left
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-300 mb-2">{activeBoss.name}</div>
              <div className="h-[5px] bg-white/5 rounded-full overflow-hidden">
                <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-red-900 to-red-500" />
              </div>
              <div className="text-[11px] text-gray-600 mt-2">
                Reward: <span className="text-yellow-600 font-semibold">+{activeBoss.xp_reward} {activeBoss.stat} XP</span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg border border-red-900/20 bg-red-950/5">
              <div className="flex items-center gap-2 mb-1">
                <span>⚠️</span>
                <span className="font-cinzel text-xs text-red-900 tracking-wider uppercase">Boss Fight</span>
              </div>
              <div className="text-xs text-gray-700">No active boss. Set a big goal to trigger one.</div>
            </div>
          )}
        </div>

        {/* Daily Quests */}
        <div className="panel">
          <div className="flex items-center gap-3 mb-4">
            <span className="font-cinzel text-[10px] tracking-[3px] text-yellow-600 uppercase whitespace-nowrap">📋 Daily Quests</span>
            <div className="flex-1 h-px bg-yellow-900/20" />
            <span className="text-gray-700 text-[10px] font-sans whitespace-nowrap">{todayFormatted}</span>
          </div>
          {questsToday.length === 0 ? (
            <p className="text-xs text-gray-700">No quests generated for today yet.</p>
          ) : (
            questsToday.map((q: any) => (
              <QuestRow key={q._id} quest={q} onComplete={handleComplete} />
            ))
          )}
        </div>

        {/* Achievements */}
        <div className="panel">
          <div className="panel-title">🏆 Achievements</div>
          <div className="grid grid-cols-4 gap-2">
            {(achievements ?? []).map((a: any) => (
              <AchievementBadge key={a._id} achievement={a} />
            ))}
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="mt-6 text-center text-gray-800 text-xs tracking-widest font-cinzel">
        RPG LIFE SYSTEM · FOUNDER EDITION
      </div>
    </div>
  );
}
