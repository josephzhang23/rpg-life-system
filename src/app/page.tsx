"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useCallback, useEffect, useRef } from "react";
import { useXp } from "../lib/xpContext";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  STA:  { label: "STA",  zh: "耐力", bar: "bar-sta",  text: "text-sta",  bg: "bg-sta",  icon: "🏃", color: "#20c0a0" },
  CRE:  { label: "CRE",  zh: "创造", bar: "bar-cre",  text: "text-cre",  bg: "bg-cre",  icon: "✨", color: "#c060ff" },
};


const DAILY_QUEST_TEMPLATES = [
  { name: "Plan your top priorities", stat: "DISC", xp_reward: 20,
    objective: "写下今天最重要的事（1-3 件），专注执行。",
    description: "真正的高手从不靠灵感，只靠系统。清单越短，执行力越强。今天只有一件事？那才是真正想清楚了。",
    steps: ["打开备忘录、纸或任意工具","写下今天必须完成的事（1-3 件，质量优先）","按影响力从高到低排序","把第一项安排进今天的时间块"],
    proof_requirement: "写出今天最重要的 1-3 件事" },
  { name: "60 minutes deep work sprint", stat: "INT", xp_reward: 35,
    objective: "不间断专注工作 60 分钟，关闭一切干扰。",
    description: "心流不是等来的，是逼出来的。前十分钟最难，撑过去之后大脑会进入另一个频道。深度工作是稀缺资源，保护它就是在保护你的核心竞争力。",
    steps: ["选定一个明确的单一任务","关闭手机通知，关掉无关标签页","启动计时器：60 分钟","专注执行，中途不查手机、不切换任务","计时结束后记录完成了什么"],
    proof_requirement: "描述这 60 分钟完成了什么具体内容" },
  { name: "Workout / movement session", stat: "STR", xp_reward: 30,
    objective: "完成任意形式的体能训练。",
    description: "身体是你唯一不能外包的资产。再忙的日程也挤得出 30 分钟。形式不重要，动起来才算数。每一次训练都是对身体账户的存款。",
    steps: ["换上运动装备（换衣服就是开始）","热身 5 分钟","完成主训练（至少 25 分钟）","拉伸 5 分钟收尾"],
    proof_requirement: "发一张健身/运动的照片，或记录训练内容" },
  { name: "Meaningful outreach or connection", stat: "SOC", xp_reward: 25,
    objective: "主动联系一个有价值的人。",
    description: "网络效应不只属于产品，也属于人。每一次主动出击都是在构建你的社交护城河。不要等到需要帮助才联系，平时的积累才是真正的资产。",
    steps: ["想一个值得联系的人（用户、创始人、潜在合作者）","准备一句有价值的开场白（给予而非索取）","发送消息、邮件或拨打电话","记录对话的关键收获"],
    proof_requirement: "描述联系了谁、说了什么、对方的反应" },
  { name: "Create something publishable", stat: "CRE", xp_reward: 40,
    objective: "创造并发布一件有价值的作品。",
    description: "发布的那一刻，作品才真正存在。完美是发布的敌人，先发布，再迭代。",
    steps: ["确定发布形式：功能、推文、视频、文章……","设定最小可发布版本（不要追求完美）","完成创作","发布到公开平台","记录发布链接"],
    proof_requirement: "提供发布链接或截图" },
  { name: "Push a commit", stat: "CRE", xp_reward: 30,
    objective: "向代码仓库提交至少一个 commit。",
    description: "代码库里的每一个 commit 都是你存在的证明。不提交，就等于不战斗。哪怕是修复一个 typo，只要推上去，今天的你就留下了痕迹。",
    steps: ["确定今天要改进或修复的内容","编写代码并本地测试","git add . && git commit -m '有意义的 commit message'","git push origin master"],
    proof_requirement: "提供 commit 链接或 SHA" },
];

/* ── WoW-style stat row (no progress bar, like WoW character sheet) ── */
function StatValue({ stat, value, bonus = 0, onClick }: { stat: string; value: number; bonus?: number; onClick?: () => void }) {
  const meta = STAT_META[stat];
  const base = Math.floor(Math.sqrt(value) * 3);
  const total = base + bonus;

  return (
    <div
      className="flex items-center justify-between py-[6px] border-b last:border-0"
      style={{ borderColor: 'rgba(200,160,50,0.08)', cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLElement).style.background = 'rgba(200,160,50,0.06)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
    >
      <div className="flex items-center gap-2">
        <span className="text-base w-6 text-center flex-shrink-0">{meta.icon}</span>
        <span className="text-sm font-bold"
          style={{ fontFamily: "'Noto Serif SC', serif", color: '#d4b87a' }}>
          {meta.zh}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
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
        {onClick && <span style={{ fontSize: '10px', color: 'rgba(200,160,50,0.3)', marginLeft: '4px' }}>›</span>}
      </div>
    </div>
  );
}

/* ── Quest row (template-based) ── */
function QuestRow({ quest, completed, onComplete, indent }: {
  quest: any;
  completed: boolean;
  onComplete: (quest: any) => void;
  indent?: boolean;
}) {
  const meta = STAT_META[quest.stat] ?? STAT_META["INT"];
  const isPenalty = quest.is_penalty ?? false;
  return (
    <div
      className="flex items-center gap-3 py-[9px] border-b last:border-0"
      style={{
        borderColor: isPenalty ? 'rgba(255,60,60,0.08)' : 'rgba(200,160,50,0.06)',
        paddingLeft: indent ? '24px' : '14px',
        paddingRight: '14px',
      }}
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

      <Link
        href={`/quests?q=${encodeURIComponent(quest.name)}`}
        className="flex-1 text-sm"
        style={{
          fontFamily: "'Noto Serif SC', serif",
          color: completed ? 'rgba(232,213,163,0.3)' : isPenalty ? 'rgba(255,120,100,0.9)' : 'rgba(232,213,163,0.85)',
          textDecoration: 'none',
        }}
      >
        {quest.name}
      </Link>

      {quest.image_url && (
        <img src={quest.image_url} alt="" style={{ width: '36px', height: 'auto', objectFit: 'contain', borderRadius: '4px', flexShrink: 0, border: '1px solid rgba(200,160,50,0.2)' }} />
      )}

      <span
        className="text-[11px] font-bold px-2 py-[2px] rounded-sm flex-shrink-0"
        style={{
          fontFamily: "'Cinzel', serif",
          background: isPenalty ? 'rgba(255,60,60,0.15)' : meta.bg,
          color: isPenalty ? '#ff6060' : meta.color,
        }}
      >
        {(isPenalty || quest.xp_reward < 0) ? `-${Math.abs(quest.xp_reward)}` : `+${quest.xp_reward}`} {meta.zh}
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
  const markQuestCompleted = useMutation(api.character.markQuestCompleted);

  const { setXp } = useXp();
  const router = useRouter();
  const [seeding, setSeeding]       = useState(false);
  const [levelUpMsg, setLevelUpMsg] = useState<string | null>(null);

  // ── Floating Combat Text ──
  interface FloatItem { id: number; xp: number; zh: string; color: string; x: number; y: number }
  const [floats, setFloats] = useState<FloatItem[]>([]);
  const floatIdRef = useRef(0);
  const prevXpRef  = useRef<Record<string, number> | null>(null);

  useEffect(() => {
    const statArr: any[] = data?.stats ?? [];
    if (statArr.length === 0) return;

    const current: Record<string, number> = {};
    for (const s of statArr) current[s.stat_id] = s.total_xp ?? 0;

    if (prevXpRef.current === null) {
      prevXpRef.current = current; // first render — snapshot only
      return;
    }

    const spawned: FloatItem[] = [];
    for (const key of Object.keys(current)) {
      const prev = prevXpRef.current[key] ?? 0;
      const curr = current[key];
      if (curr > prev) {
        const meta = STAT_META[key];
        if (!meta) continue;
        spawned.push({
          id: ++floatIdRef.current,
          xp: curr - prev,
          zh: meta.zh,
          color: meta.color,
          // position: stats panel is roughly top-left on mobile
          x: 15 + Math.random() * 45,   // 15–60 vw%
          y: 18 + Math.random() * 22,   // 18–40 vh% (where stat bars live)
        });
      }
    }

    if (spawned.length > 0) {
      setFloats(f => [...f, ...spawned]);
      for (const item of spawned) {
        setTimeout(() => setFloats(f => f.filter(fi => fi.id !== item.id)), 2700);
      }
    }
    prevXpRef.current = current;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.stats]);

  // Sync XP to context so BottomBar can render it
  useEffect(() => {
    if (data?.overallLevel != null) {
      setXp({
        level: data.overallLevel,
        xpInLevel: data.overallXpInLevel ?? 0,
        xpNeeded: data.overallXpNeeded ?? 500,
      });
    }
  }, [data?.overallLevel, data?.overallXpInLevel, data?.overallXpNeeded, setXp]);

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

  const handleCompleteAdHoc = useCallback(async (quest: any) => {
    const result = await markQuestCompleted({ questId: quest._id });
    if (result && result.xpResult) {
      const { xpResult } = result;
      const oldOverallLevel = data?.overallLevel ?? 1;
      if ((xpResult.overall_level ?? 0) > oldOverallLevel) {
        setLevelUpMsg(`🎉 人物升级 — Lv.${xpResult.overall_level}`);
        setTimeout(() => setLevelUpMsg(null), 4000);
      }
    }
  }, [markQuestCompleted, data]);

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

  const { character, stats, questsToday, pendingGoals, activeBoss, achievements, overallLevel, overallTotalXp, overallXpInLevel, overallXpNeeded, equipmentBonuses, today } = data;

  const todayFormatted = new Date(today + "T00:00:00").toLocaleDateString("zh-CN", { timeZone: 'Asia/Shanghai',
    weekday: "short", month: "long", day: "numeric"
  });

  const bossDeadline = activeBoss?.deadline
    ? Math.max(0, Math.ceil((new Date(activeBoss.deadline).getTime() - Date.now()) / 86400000))
    : null;

  const dailyTemplates = DAILY_QUEST_TEMPLATES;
  const templateNames  = new Set(DAILY_QUEST_TEMPLATES.map(t => t.name));
  const adHocCompleted = (questsToday ?? []).filter((q: any) => !templateNames.has(q.name));
  const pendingGoalsList = pendingGoals ?? [];
  const completedCount = dailyTemplates.filter((q: any) => completedNames.has(q.name)).length + adHocCompleted.length;
  const totalCount     = dailyTemplates.length + adHocCompleted.length + pendingGoalsList.length;

  return (
    <div className="max-w-[960px] mx-auto px-4 py-6 relative">

      {/* ── WoW Floating Combat Text overlay ── */}
      {floats.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-[300]" aria-hidden>
          {floats.map(f => (
            <div
              key={f.id}
              className="wow-fct"
              style={{
                position: 'absolute',
                left:  `${f.x}%`,
                top:   `${f.y}%`,
                color: f.color,
                textShadow: `0 0 10px ${f.color}cc, 0 0 24px ${f.color}55, 0 2px 6px rgba(0,0,0,0.95)`,
              }}
            >
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: '26px', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.5px' }}>
                +{f.xp}
              </div>
              <div style={{ fontFamily: "'Noto Serif SC', serif", fontSize: '12px', fontWeight: 700, opacity: 0.9, textAlign: 'center', marginTop: '3px', letterSpacing: '2px' }}>
                {f.zh}
              </div>
            </div>
          ))}
        </div>
      )}

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

      {/* ── WoW Classic Character Frame ── */}
      {(() => {
        const strStat = (stats ?? []).find((s: any) => s.stat_id === 'STR');
        const intStat = (stats ?? []).find((s: any) => s.stat_id === 'INT');
        const maxHp   = 100 + Math.floor(Math.sqrt(strStat?.total_xp ?? 0) * 3) * 10;
        const maxMana = 100 + Math.floor(Math.sqrt(intStat?.total_xp ?? 0) * 3) * 10;
        return (
          <div className="mb-4" style={{
            display: 'inline-flex', gap: '6px', alignItems: 'center',
            background: 'rgba(0,0,0,0.55)',
            border: '1px solid rgba(80,55,15,0.9)',
            borderRadius: '3px',
            padding: '5px 8px 5px 5px',
            boxShadow: 'inset 0 0 8px rgba(0,0,0,0.6), 0 0 0 1px rgba(200,160,50,0.12)',
          }}>
            {/* Portrait */}
            <div style={{
              width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0,
              background: 'radial-gradient(circle at 35% 30%, #2a1a05, #0a0805)',
              border: '2px solid #8a6a20',
              boxShadow: 'inset 0 0 8px rgba(0,0,0,0.8)',
              overflow: 'hidden',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/avatar.jpg" alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>

            {/* Name + bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: '140px' }}>
              {/* Name */}
              <div style={{
                fontFamily: "'Cinzel', serif", fontSize: '12px',
                color: '#f0d060', fontWeight: 700, letterSpacing: '1px', lineHeight: 1,
                textAlign: 'center',
              }}>{character.name}</div>

              {/* HP bar (green) — number centered inside bar */}
              <div style={{
                position: 'relative', height: '12px',
                background: 'rgba(0,0,0,0.7)',
                border: '1px solid rgba(0,80,0,0.8)',
                borderRadius: '1px', overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', width: '100%',
                  background: 'linear-gradient(180deg, #00c040 0%, #008030 60%, #006020 100%)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
                }} />
                <span style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '8px', fontFamily: "'Cinzel', serif",
                  color: 'rgba(255,255,255,0.85)',
                  textShadow: '0 0 2px #000, 0 1px 2px #000',
                  letterSpacing: '0.3px', lineHeight: 1,
                }}>
                  {maxHp}
                </span>
              </div>

              {/* Mana bar (blue) — number centered inside bar */}
              <div style={{
                position: 'relative', height: '12px',
                background: 'rgba(0,0,0,0.7)',
                border: '1px solid rgba(0,40,120,0.8)',
                borderRadius: '1px', overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', width: '100%',
                  background: 'linear-gradient(180deg, #2080ff 0%, #1050c0 60%, #0030a0 100%)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
                }} />
                <span style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '8px', fontFamily: "'Cinzel', serif",
                  color: 'rgba(255,255,255,0.85)',
                  textShadow: '0 0 2px #000, 0 1px 2px #000',
                  letterSpacing: '0.3px', lineHeight: 1,
                }}>
                  {maxMana}
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* 角色属性 */}
        <div className="panel">
          <div className="panel-title">📊 角色属性</div>
          {(stats ?? []).map((s: any) => (
            <StatValue key={s.stat_id} stat={s.stat_id} value={s.total_xp ?? 0} bonus={equipmentBonuses?.[s.stat_id] ?? 0} onClick={() => router.push(`/quests?stat=${s.stat_id}`)} />
          ))}
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
              backgroundImage: `url(${activeBoss.dungeon === '哀嚎洞穴' ? '/wailing-caverns.jpg' : activeBoss.dungeon === '死亡矿井' ? '/deadmines.jpg' : '/ragefire-chasm.jpg'})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}>
              {/* Dark overlay for readability */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(180deg, rgba(5,2,10,0.82) 0%, rgba(15,6,3,0.78) 100%)',
                pointerEvents: 'none', zIndex: 0,
              }} />
              {/* Stone texture scanlines */}
              <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 4px)',
                pointerEvents: 'none', zIndex: 0,
              }} />

              {/* Dungeon Header Bar */}
              <div style={{
                background: 'linear-gradient(90deg, rgba(20,6,2,0.97), rgba(10,3,1,0.95), rgba(20,6,2,0.97))',
                borderBottom: '1px solid rgba(180,80,20,0.6)',
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
                  fontFamily: "'Cinzel', serif", fontSize: '12px',
                  letterSpacing: '3px', color: '#ffaa80',
                  textTransform: 'uppercase', fontWeight: 700,
                  textShadow: '0 0 8px rgba(255,100,40,0.6)',
                }}>{activeBoss.dungeon ?? '副本进行中'}</span>
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
              <div style={{ padding: '14px 16px', position: 'relative', zIndex: 1 }}>
                {activeBoss.current_value != null && activeBoss.target_value != null ? (() => {
                  const progressPct = Math.min(100, Math.round((activeBoss.current_value / activeBoss.target_value) * 100));
                  const bossHpPct = Math.max(0, 100 - progressPct);
                  const hpColor = bossHpPct > 50 ? '#20c050' : bossHpPct > 20 ? '#c8a020' : '#e03020';
                  return (
                    <>
                      {/* MRR Numbers — primary focus */}
                      <div style={{ marginBottom: '10px' }}>
                        <div style={{
                          fontSize: '10px', color: 'rgba(200,160,80,0.5)',
                          fontFamily: "'Cinzel', serif", letterSpacing: '2px',
                          marginBottom: '3px',
                        }}>MRR</div>
                        <span style={{
                          fontFamily: "'Cinzel', serif", fontSize: '26px', fontWeight: 700,
                          color: '#f0d060', lineHeight: 1,
                          textShadow: '0 0 12px rgba(240,180,40,0.4)',
                        }}>${activeBoss.current_value.toLocaleString()}</span>
                        <span style={{
                          fontFamily: "'Cinzel', serif", fontSize: '14px',
                          color: 'rgba(200,160,80,0.6)', marginLeft: '6px',
                        }}>/ ${activeBoss.target_value.toLocaleString()}</span>
                      </div>

                      {/* HP bar */}
                      <div style={{
                        height: '10px', background: 'rgba(0,0,0,0.55)',
                        borderRadius: '1px', border: '1px solid rgba(80,40,10,0.5)',
                        overflow: 'hidden', position: 'relative', marginBottom: '10px',
                      }}>
                        <div style={{
                          position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
                          backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 23px, rgba(0,0,0,0.35) 23px, rgba(0,0,0,0.35) 24px)',
                        }} />
                        <div style={{
                          height: '100%', width: `${bossHpPct}%`,
                          background: `linear-gradient(90deg, ${hpColor}90, ${hpColor})`,
                          boxShadow: `0 0 8px ${hpColor}70`,
                          transition: 'width 0.8s ease',
                        }} />
                      </div>

                      {/* Bottom row: boss name + HP% + reward */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{
                          fontFamily: "'Cinzel', serif", fontSize: '11px',
                          color: 'rgba(232,213,163,0.5)', letterSpacing: '0.5px',
                        }}>💀 {activeBoss.boss_character ?? activeBoss.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{
                            fontSize: '11px', fontFamily: "'Cinzel', serif", fontWeight: 700,
                            color: bossHpPct <= 5 ? '#ff3030' : bossHpPct <= 20 ? '#e08020' : 'rgba(200,160,80,0.7)',
                          }}>{bossHpPct === 0 ? '⚡ DEFEATED' : `${bossHpPct}% HP`}</span>
                          <span style={{ fontSize: '11px', color: '#f0c060', fontFamily: "'Cinzel', serif" }}>
                            🏆 +{activeBoss.xp_reward} XP
                          </span>
                        </div>
                      </div>
                    </>
                  );
                })() : null}
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

        {/* 任务日志 — full width, internal 2-col on desktop */}
        <div className="md:col-span-2 panel" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Panel title bar */}
          <div style={{
            background: 'linear-gradient(90deg, rgba(40,28,8,0.95), rgba(25,16,4,0.9), rgba(40,28,8,0.95))',
            borderBottom: '1px solid rgba(200,160,50,0.2)',
            padding: '8px 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '12px', color: '#c8a040', letterSpacing: '2px', textTransform: 'uppercase' }}>
              任务日志
            </span>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '11px', color: 'rgba(200,160,50,0.5)' }}>
              {todayFormatted} · {completedCount}/{totalCount}
            </span>
          </div>

          {/* Desktop: 2-col split | Mobile: single col */}
          <div className="md:grid md:grid-cols-2" style={{ borderTop: 'none' }}>

          {/* ── LEFT: 每日任务 ── */}
          <div style={{ borderRight: '1px solid rgba(200,160,50,0.12)' }}>
          <div style={{ padding: '8px 0' }}>
            {/* ── Section: 每日任务 ── */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '4px 14px 4px 10px',



              marginBottom: '2px',
            }}>
              <span style={{ fontSize: '10px', color: '#c87830', fontWeight: 700, lineHeight: 1 }}>⊟</span>
              <span style={{
                fontFamily: "'Cinzel', serif", fontSize: '12px',
                color: '#d4922a', fontWeight: 700, letterSpacing: '0.5px', flex: 1,
              }}>每日任务</span>
              <span style={{
                fontFamily: "'Cinzel', serif", fontSize: '10px',
                color: 'rgba(200,160,50,0.45)',
                background: 'rgba(200,140,30,0.1)',
                padding: '1px 6px', borderRadius: '1px',
              }}>
                {dailyTemplates.filter((q: any) => completedNames.has(q.name)).length}/{dailyTemplates.length}
              </span>
            </div>
            <div style={{ padding: '0 0 6px 0' }}>
              {dailyTemplates.map((q: any) => (
                <QuestRow
                  key={q.name}
                  quest={q}
                  completed={completedNames.has(q.name)}
                  onComplete={handleComplete}
                  indent
                />
              ))}
            </div>

            {/* ── Section: 主线任务 ── */}
            {(() => {
              const main = (pendingGoals ?? []).filter((q: any) => q.quest_type === 'main');
              const mainDone = (questsToday ?? []).filter((q: any) => !templateNames.has(q.name) && q.quest_type === 'main');
              const allMain = [...mainDone, ...main];
              if (allMain.length === 0) return null;
              return (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 14px 4px 10px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '10px', color: '#c87830', fontWeight: 700, lineHeight: 1 }}>⊟</span>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '12px', color: '#d4922a', fontWeight: 700, letterSpacing: '0.5px', flex: 1 }}>主线任务</span>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', color: 'rgba(200,160,50,0.45)', background: 'rgba(200,140,30,0.1)', padding: '1px 6px', borderRadius: '1px' }}>
                      {mainDone.length}/{allMain.length}
                    </span>
                  </div>
                  <div style={{ padding: '0 0 6px 0' }}>
                    {mainDone.map((q: any) => <QuestRow key={q._id} quest={q} completed={true} onComplete={() => {}} indent />)}
                    {main.map((q: any) => <QuestRow key={q._id} quest={q} completed={false} onComplete={handleCompleteAdHoc} indent />)}
                  </div>
                </>
              );
            })()}

          </div>{/* end LEFT padding */}
          </div>{/* end LEFT col */}

          {/* ── RIGHT: 支线任务 ── */}
          <div>
          <div style={{ padding: '8px 0' }}>
            {/* ── Section: 支线任务 ── */}
            {(() => {
              const adHoc = (questsToday ?? []).filter((q: any) => !templateNames.has(q.name) && q.quest_type !== 'main');
              const side = (pendingGoals ?? []).filter((q: any) => q.quest_type !== 'main');
              if (adHoc.length === 0 && side.length === 0) return null;
              return (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 14px 4px 10px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '10px', color: '#c87830', fontWeight: 700, lineHeight: 1 }}>⊟</span>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '12px', color: '#d4922a', fontWeight: 700, letterSpacing: '0.5px', flex: 1 }}>支线任务</span>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', color: 'rgba(200,160,50,0.45)', background: 'rgba(200,140,30,0.1)', padding: '1px 6px', borderRadius: '1px' }}>
                      {adHoc.length}/{adHoc.length + side.length}
                    </span>
                  </div>
                  <div style={{ padding: '0 0 6px 0' }}>
                    {adHoc.map((q: any) => <QuestRow key={q._id} quest={q} completed={true} onComplete={() => {}} indent />)}
                    {side.map((q: any) => <QuestRow key={q._id} quest={q} completed={false} onComplete={handleCompleteAdHoc} indent />)}
                  </div>
                </>
              );
            })()}
          </div>{/* end right padding */}
          </div>{/* end RIGHT col */}
          </div>{/* end 2-col grid */}
        </div>{/* end 任务日志 panel */}

        {/* 成就 — full width */}
        <div className="md:col-span-2 rounded-sm overflow-hidden"
          style={{ border: '1px solid rgba(200,160,50,0.3)', background: '#0e0a05' }}
        >
          <div className="flex items-center justify-between px-4 py-3"
            style={{
              background: 'linear-gradient(90deg, rgba(60,40,5,0.9), rgba(40,28,4,0.9))',
              borderBottom: '1px solid rgba(200,160,50,0.25)',
            }}
          >
            <span style={{ fontFamily: "'Noto Serif SC', serif", color: '#f0c060', fontSize: '11px', letterSpacing: '3px', fontWeight: 700 }}>🏆 成就</span>
            <span style={{ fontFamily: "'Noto Serif SC', serif", color: 'rgba(200,160,50,0.5)', fontSize: '11px' }}>
              {(achievements ?? []).filter((a: any) => a.unlocked).length} / {(achievements ?? []).length} 已解锁
            </span>
          </div>
          <div className="flex flex-col">
            {(achievements ?? []).map((a: any) => <AchievementRow key={a._id} achievement={a} />)}
          </div>
        </div>

      </div>{/* end Main Grid */}



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
