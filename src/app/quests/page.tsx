"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState, useEffect } from "react";
import Link from "next/link";

const STAT_META: Record<string, { zh: string; color: string; bg: string }> = {
  INT:  { zh: "智力", color: "#60a0ff", bg: "rgba(96,160,255,0.15)" },
  DISC: { zh: "意志", color: "#ff8040", bg: "rgba(255,128,64,0.15)" },
  STR:  { zh: "力量", color: "#ff4060", bg: "rgba(255,64,96,0.15)" },
  SOC:  { zh: "魅力", color: "#40d890", bg: "rgba(64,216,144,0.15)" },
  CRE:  { zh: "创造", color: "#c060ff", bg: "rgba(192,96,255,0.15)" },
};

const DAILY_QUEST_TEMPLATES: any[] = [
  { name: "Plan your top 3 priorities", stat: "DISC", xp_reward: 20,
    objective: "写下今天最重要的三件事，专注执行。",
    description: "真正的高手从不靠灵感，只靠系统。清单越短，执行力越强。今天写下的三件事，是你对自己最基本的承诺——也是你最小的、不可推卸的战场。",
    steps: ["打开备忘录、纸或任意工具","写下今天必须完成的三件事（只允许三件）","按影响力从高到低排序","把第一项安排进今天的时间块"],
    proof_requirement: "写出今天的三件事（可直接发给 GM）" },
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

function groupQuests(quests: any[]) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
  const groups: Record<string, any[]> = {};

  for (const q of quests) {
    const key = q.is_boss ? "⚔️ 副本" : q.date === today ? "📋 今日任务" : `📅 ${q.date}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(q);
  }

  // Sort group keys: boss first, today second, then dates descending
  const sorted = Object.entries(groups).sort(([a], [b]) => {
    if (a.includes("副本")) return -1;
    if (b.includes("副本")) return 1;
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

        {/* ── Objective ── */}
        {quest.objective && (
          <p className="text-sm mb-4 leading-relaxed"
            style={{ fontFamily: "'Noto Serif SC', serif", color: '#c8b87a', lineHeight: '1.8' }}>
            {quest.objective}
          </p>
        )}

        {/* ── Why it matters (description) ── */}
        {quest.description && (
          <>
            <div className="mb-4">
              <div className="text-[11px] tracking-[3px] mb-2 font-bold uppercase"
                style={{ fontFamily: "'Noto Serif SC', serif", color: '#c8a040' }}>为何重要</div>
              <p className="text-sm leading-relaxed"
                style={{ fontFamily: "'Noto Serif SC', serif", color: 'rgba(200,180,120,0.7)', lineHeight: '1.9', fontStyle: 'italic' }}>
                {quest.description}
              </p>
            </div>
            <div className="wow-divider" />
          </>
        )}

        {/* ── Action Steps ── */}
        {quest.steps && quest.steps.length > 0 && (
          <>
            <div className="mt-4 mb-4">
              <div className="text-[11px] tracking-[3px] mb-3 font-bold uppercase"
                style={{ fontFamily: "'Noto Serif SC', serif", color: '#c8a040' }}>行动步骤</div>
              <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {quest.steps.map((step: string, i: number) => (
                  <li key={i} className="flex gap-3 mb-2">
                    <span style={{
                      fontFamily: "'Cinzel', serif", fontSize: '11px', fontWeight: 700,
                      color: '#c8a040', minWidth: '18px', paddingTop: '2px',
                    }}>{i + 1}.</span>
                    <span className="text-sm" style={{ fontFamily: "'Noto Serif SC', serif", color: 'rgba(232,213,163,0.8)', lineHeight: '1.75' }}>
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="wow-divider" />
          </>
        )}

        {/* ── Proof Requirement ── */}
        {quest.proof_requirement && (
          <>
            <div className="mt-4 mb-4">
              <div className="text-[11px] tracking-[3px] mb-2 font-bold uppercase"
                style={{ fontFamily: "'Noto Serif SC', serif", color: '#c8a040' }}>完成证明</div>
              <div className="flex gap-2 items-start px-3 py-2 rounded-sm"
                style={{ background: 'rgba(200,160,50,0.06)', border: '1px solid rgba(200,160,50,0.15)' }}>
                <span style={{ fontSize: '14px', flexShrink: 0 }}>📜</span>
                <p className="text-sm" style={{ fontFamily: "'Noto Serif SC', serif", color: 'rgba(200,180,120,0.8)', lineHeight: '1.75' }}>
                  {quest.proof_requirement}
                </p>
              </div>
            </div>
          </>
        )}

        {/* ── Submitted Proof (note) ── */}
        {quest.note && (
          <>
            <div className="mb-4">
              <div className="text-[11px] tracking-[3px] mb-2 font-bold uppercase"
                style={{ fontFamily: "'Noto Serif SC', serif", color: '#40c060' }}>已提交的证明</div>
              <div className="flex gap-2 items-start px-3 py-2 rounded-sm"
                style={{ background: 'rgba(64,192,96,0.06)', border: '1px solid rgba(64,192,96,0.2)' }}>
                <span style={{ fontSize: '14px', flexShrink: 0 }}>✓</span>
                <p className="text-sm" style={{ fontFamily: "'Noto Serif SC', serif", color: 'rgba(180,230,180,0.8)', lineHeight: '1.75' }}>
                  {quest.note}
                </p>
              </div>
            </div>
            <div className="wow-divider" />
          </>
        )}

        {/* Date / type */}
        <div className="text-[11px] mt-4 mb-4" style={{ color: 'rgba(200,160,50,0.4)', fontFamily: "'Noto Serif SC', serif" }}>
          {quest.is_boss ? '⚔️ 副本' : quest.is_penalty ? '💀 惩罚任务' : `📅 ${quest.date ?? '今日'}`}
          {quest.deadline && ` · 截止 ${quest.deadline.slice(0, 10)}`}
        </div>

        <div className="wow-divider" />

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
  const [autoSelected, setAutoSelected] = useState(false);

  // Auto-select quest from ?q= param
  useEffect(() => {
    if (autoSelected || !quests) return;
    const params = new URLSearchParams(window.location.search);
    const qName = params.get('q');
    if (!qName) return;
    const decoded = decodeURIComponent(qName);
    // Try DB first
    const found = quests.find((q: any) => q.name === decoded);
    if (found) {
      setSelected(found);
      setShowDetail(true);
      setAutoSelected(true);
      return;
    }
    // Fall back to daily template (not yet in DB)
    const tmpl = DAILY_QUEST_TEMPLATES.find(t => t.name === decoded);
    if (tmpl) {
      setSelected({ ...tmpl, completed: false, date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' }) });
      setShowDetail(true);
      setAutoSelected(true);
    }
  }, [quests, autoSelected]);

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
