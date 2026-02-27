import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const STAT_NAMES: Record<string, string> = {
  INT: "Intelligence",
  DISC: "Discipline",
  STR: "Strength",
  SOC: "Social",
  CRE: "Creativity",
};

const DEFAULT_STATS = ["INT", "DISC", "STR", "SOC", "CRE"] as const;

function todayISO() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
}

function nowISO() {
  return new Date().toISOString();
}

// Overall level is derived from total XP across all stats.
// XP needed for level n → n+1: n * 500
// Cumulative to reach level n: 500 * n * (n-1) / 2
function levelFromTotalXp(totalXp: number): { level: number; xpInLevel: number; xpNeeded: number } {
  let level = 1;
  let remaining = totalXp;
  while (remaining >= level * 500) {
    remaining -= level * 500;
    level++;
  }
  return { level, xpInLevel: remaining, xpNeeded: level * 500 };
}

async function recalcCharacterLevel(ctx: any) {
  const stats = await ctx.db.query("stats").collect();
  const totalXp = stats.reduce((sum: number, s: any) => sum + (s.total_xp ?? 0), 0);
  const { level } = levelFromTotalXp(totalXp);

  const existing = (await ctx.db.query("character").collect())[0];
  if (!existing) return level;

  await ctx.db.patch(existing._id, {
    overall_level: level,
    overall_total_xp: totalXp,
    last_updated: nowISO(),
  });

  return level;
}

async function applyXpToStat(ctx: any, statId: string, amount: number) {
  const stat = (await ctx.db.query("stats").collect()).find((s: any) => s.stat_id === statId);
  if (!stat) throw new Error(`Stat ${statId} not found`);

  let level = stat.level;
  let xp = stat.xp + amount;
  const total_xp = stat.total_xp + Math.max(amount, 0); // only count positive toward total

  // Handle XP deduction — don't go below 0 xp at level 1
  if (xp < 0) {
    if (level > 1) {
      level = Math.max(1, level - 1);
      xp = Math.max(0, (level * 100) + xp);
    } else {
      xp = 0;
    }
  }

  // Handle level up
  while (xp >= level * 100) {
    xp -= level * 100;
    level += 1;
  }

  await ctx.db.patch(stat._id, { level, xp, total_xp });

  const overall_level = await recalcCharacterLevel(ctx);

  return { statId, amount, level, xp, total_xp, nextLevelXp: level * 100, overall_level };
}

export const awardXP = mutation({
  args: {
    stat: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    return applyXpToStat(ctx, args.stat, args.amount);
  },
});

export const completeQuest = mutation({
  args: {
    questId: v.string(),
  },
  handler: async (ctx, args) => {
    const quest = await ctx.db.get(args.questId as any) as any;
    if (!quest) {
      throw new Error("Quest not found");
    }
    if (quest.completed) {
      return { ok: true, alreadyCompleted: true };
    }

    await ctx.db.patch(quest._id, {
      completed: true,
    });

    const xpAmount = quest.is_penalty ? -Math.abs(quest.xp_reward) : quest.xp_reward;
    const xpResult = await applyXpToStat(ctx, quest.stat, xpAmount);

    const streaks = await ctx.db.query("streaks").collect();
    const daily = streaks.find((s: any) => s.type === "daily");
    if (daily) {
      await ctx.db.patch(daily._id, {
        count: daily.count + 1,
        last_updated: todayISO(),
      });
    }

    // Auto-update specific streaks based on quest name
    const qname = (quest.name ?? "").toLowerCase();
    const streakMap: Record<string, string> = {
      reading: "reading",
      "read ": "reading",
      gym: "gym",
      workout: "gym",
      "deep work": "deep_work",
    };
    for (const [keyword, streakType] of Object.entries(streakMap)) {
      if (qname.includes(keyword)) {
        const s = streaks.find((x: any) => x.type === streakType);
        if (s) {
          await ctx.db.patch(s._id, { count: s.count + 1, last_updated: todayISO() });
        }
        break;
      }
    }

    const achievement = (await ctx.db.query("achievements").collect()).find(
      (a: any) => a.key === "first_quest",
    );
    if (achievement && !achievement.unlocked) {
      await ctx.db.patch(achievement._id, {
        unlocked: true,
        unlocked_at: nowISO(),
      });
    }

    return { ok: true, questId: quest._id, xpResult };
  },
});

export const getDashboard = query({
  args: {},
  handler: async (ctx) => {
    const [character, stats, streaks, achievements, quests, equipment] = await Promise.all([
      ctx.db.query("character").collect(),
      ctx.db.query("stats").collect(),
      ctx.db.query("streaks").collect(),
      ctx.db.query("achievements").collect(),
      ctx.db.query("quests").collect(),
      ctx.db.query("equipment").collect(),
    ]);

    const today = todayISO();
    // Only return completed quests — DB is a ledger of victories, not a to-do list
    const questsToday = quests.filter((q: any) => q.date === today && !q.is_boss && q.completed);
    // Manually added goal quests (not daily templates, not boss, not yet completed)
    const TEMPLATE_NAMES = ["Plan your top 3 priorities","60 minutes deep work sprint","Workout / movement session","Meaningful outreach or connection","Create something publishable","Push a commit"];
    const pendingGoals = quests.filter((q: any) => !q.is_boss && !q.completed && !TEMPLATE_NAMES.includes(q.name));
    const activeBoss = quests.find((q: any) => q.is_boss && !q.completed) ?? null;
    const totalXp = stats.reduce((sum: number, s: any) => sum + (s.total_xp ?? 0), 0);
    const { level: overallLevel, xpInLevel: overallXpInLevel, xpNeeded: overallXpNeeded } = levelFromTotalXp(totalXp);

    // Sum all equipment stat bonuses
    const equipmentBonuses: Record<string, number> = {};
    for (const item of equipment) {
      for (const b of (item.stat_bonuses ?? [])) {
        equipmentBonuses[b.stat] = (equipmentBonuses[b.stat] ?? 0) + b.value;
      }
    }

    return {
      character: character[0] ?? null,
      stats: stats.sort((a: any, b: any) => DEFAULT_STATS.indexOf(a.stat_id as any) - DEFAULT_STATS.indexOf(b.stat_id as any)),
      streaks,
      questsToday,
      pendingGoals,
      activeBoss,
      achievements,
      overallLevel,
      overallTotalXp: totalXp,
      overallXpInLevel,
      overallXpNeeded,
      equipmentBonuses,
      today,
    };
  },
});

export const initCharacter = mutation({
  args: {},
  handler: async (ctx) => {
    const existingCharacter = (await ctx.db.query("character").collect())[0];
    if (existingCharacter) {
      return { ok: true, seeded: false, reason: "already_initialized" };
    }

    const now = nowISO();
    const today = todayISO();

    await ctx.db.insert("character", {
      name: "Player",
      class: "Founder",
      overall_level: 1,
      last_updated: now,
    });

    for (const statId of DEFAULT_STATS) {
      await ctx.db.insert("stats", {
        stat_id: statId,
        name: STAT_NAMES[statId],
        level: 1,
        xp: 0,
        total_xp: 0,
      });
    }

    const streakSeeds = [
      { type: "daily", label: "Daily", count: 0 },
      { type: "gym", label: "Gym", count: 0 },
      { type: "deep_work", label: "Deep Work", count: 0 },
      { type: "reading", label: "Reading", count: 0 },
    ];

    for (const streak of streakSeeds) {
      await ctx.db.insert("streaks", { ...streak, last_updated: undefined });
    }

    const questSeeds = [
      { name: "Plan your top 3 priorities", stat: "DISC", xp_reward: 20, completed: false, date: today },
      { name: "60 minutes deep work sprint", stat: "INT", xp_reward: 35, completed: false, date: today },
      { name: "Workout / movement session", stat: "STR", xp_reward: 30, completed: false, date: today },
      { name: "Meaningful outreach", stat: "SOC", xp_reward: 25, completed: false, date: today },
      { name: "Create something publishable", stat: "CRE", xp_reward: 40, completed: false, date: today },
      {
        name: "Boss Fight: Ship Weekly Milestone",
        stat: "DISC",
        xp_reward: 150,
        completed: false,
        date: today,
        is_boss: true,
        deadline: `${today}T23:59:59Z`,
      },
    ];

    for (const quest of questSeeds) {
      await ctx.db.insert("quests", quest as any);
    }

    const achievementSeeds = [
      ["first_quest", "First Blood", "🗡️"],
      ["discipline_10", "Iron Routine", "⛓️"],
      ["strength_5", "Body Forged", "🏋️"],
      ["social_5", "Networked", "🤝"],
      ["creator_5", "Spark Ignited", "✨"],
      ["int_5", "Mind Palace", "🧠"],
      ["boss_clear", "Boss Slayer", "👑"],
      ["week_streak", "Seven-Day Chain", "🔥"],
      ["unicornslayer", "Unicorn", "🦄"],
    ] as const;

    for (const [key, name, icon] of achievementSeeds) {
      await ctx.db.insert("achievements", {
        key,
        name,
        icon,
        unlocked: false,
        unlocked_at: undefined,
      });
    }

    return { ok: true, seeded: true };
  },
});

// Admin: directly set a stat's XP (for migration/correction)
export const setStatXP = mutation({
  args: {
    stat: v.string(),
    xp: v.number(),
    total_xp: v.number(),
    level: v.number(),
  },
  handler: async (ctx, args) => {
    const stat = (await ctx.db.query("stats").collect()).find((s: any) => s.stat_id === args.stat);
    if (!stat) throw new Error(`Stat ${args.stat} not found`);
    await ctx.db.patch(stat._id, { xp: args.xp, total_xp: args.total_xp, level: args.level });
    await recalcCharacterLevel(ctx);
    return { ok: true, stat: args.stat, xp: args.xp, level: args.level };
  },
});

export const updateAchievement = mutation({
  args: {
    key: v.string(),
    name: v.optional(v.string()),
    icon: v.optional(v.string()),
    condition: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const achievement = (await ctx.db.query("achievements").collect()).find(
      (a: any) => a.key === args.key
    );
    if (!achievement) throw new Error(`Achievement ${args.key} not found`);
    const patch: any = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.icon !== undefined) patch.icon = args.icon;
    if (args.condition !== undefined) patch.condition = args.condition;
    await ctx.db.patch(achievement._id, patch);
    return { ok: true };
  },
});

export const addAchievement = mutation({
  args: {
    key: v.string(),
    name: v.string(),
    icon: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = (await ctx.db.query("achievements").collect()).find(
      (a: any) => a.key === args.key
    );
    if (existing) return { ok: true, reason: "already_exists" };
    await ctx.db.insert("achievements", {
      key: args.key,
      name: args.name,
      icon: args.icon,
      unlocked: false,
      unlocked_at: undefined,
    });
    return { ok: true, created: true };
  },
});

// Default quest templates — regenerated each day
const DAILY_QUEST_TEMPLATES = [
  {
    name: "Plan your top 3 priorities", stat: "DISC", xp_reward: 20,
    objective: "写下今天最重要的三件事，专注执行。",
    description: "真正的高手从不靠灵感，只靠系统。清单越短，执行力越强。今天写下的三件事，是你对自己最基本的承诺——也是你最小的、不可推卸的战场。",
    steps: [
      "打开备忘录、纸或任意工具",
      "写下今天必须完成的三件事（只允许三件）",
      "按影响力从高到低排序",
      "把第一项安排进今天的时间块",
    ],
    proof_requirement: "写出今天最重要的三件事",
  },
  {
    name: "60 minutes deep work sprint", stat: "INT", xp_reward: 35,
    objective: "不间断专注工作 60 分钟，关闭一切干扰。",
    description: "心流不是等来的，是逼出来的。前十分钟最难，撑过去之后大脑会进入另一个频道。一天一次，智力就在悄悄复利。深度工作是稀缺资源，保护它就是在保护你的核心竞争力。",
    steps: [
      "选定一个明确的单一任务",
      "关闭手机通知，关掉无关标签页",
      "启动计时器：60 分钟",
      "专注执行，中途不查手机、不切换任务",
      "计时结束后记录完成了什么",
    ],
    proof_requirement: "描述这 60 分钟完成了什么具体内容",
  },
  {
    name: "Workout / movement session", stat: "STR", xp_reward: 30,
    objective: "完成任意形式的体能训练。",
    description: "身体是你唯一不能外包的资产。再忙的日程也挤得出 30 分钟。健身房、跑步、游泳——形式不重要，动起来才算数。每一次训练都是对身体账户的存款。",
    steps: [
      "换上运动装备（换衣服就是开始）",
      "热身 5 分钟",
      "完成主训练（至少 25 分钟）",
      "拉伸 5 分钟收尾",
    ],
    proof_requirement: "发一张健身/运动的照片，或记录训练内容",
  },
  {
    name: "Meaningful outreach or connection", stat: "SOC", xp_reward: 25,
    objective: "主动联系一个有价值的人。",
    description: "网络效应不只属于产品，也属于人。每一次主动出击都是在构建你的社交护城河。不要等到需要帮助才联系，平时的积累才是真正的资产。",
    steps: [
      "想一个值得联系的人（用户、创始人、潜在合作者）",
      "准备一句有价值的开场白（给予而非索取）",
      "发送消息、邮件或拨打电话",
      "记录对话的关键收获",
    ],
    proof_requirement: "描述联系了谁、说了什么、对方的反应",
  },
  {
    name: "Create something publishable", stat: "CRE", xp_reward: 40,
    objective: "创造并发布一件有价值的作品。",
    description: "发布的那一刻，作品才真正存在。再好的想法，没有发布都是幻觉。代码、内容、功能——上线才算完成。完美是发布的敌人，先发布，再迭代。",
    steps: [
      "确定发布形式：功能、推文、视频、文章……",
      "设定最小可发布版本（不要追求完美）",
      "完成创作",
      "发布到公开平台",
      "记录发布链接",
    ],
    proof_requirement: "提供发布链接或截图",
  },
  {
    name: "Push a commit", stat: "CRE", xp_reward: 30,
    objective: "向代码仓库提交至少一个 commit。",
    description: "代码库里的每一个 commit 都是你存在的证明。不提交，就等于不战斗。哪怕是修复一个 typo，只要推上去，今天的你就留下了痕迹。",
    steps: [
      "确定今天要改进或修复的内容",
      "编写代码并本地测试",
      "git add . && git commit -m '有意义的 commit message'",
      "git push origin master",
    ],
    proof_requirement: "提供 commit 链接或 SHA",
  },
];

export const getDailyTemplates = query({
  args: {},
  handler: async (_ctx: any, _args: any) => DAILY_QUEST_TEMPLATES,
});

// Insert a completed quest record (the only way quests enter the DB now).
// Does NOT double-insert if already logged today.
export const logCompletedQuest = mutation({
  args: {
    name: v.string(),
    stat: v.string(),
    xp_reward: v.number(),
    objective: v.optional(v.string()),
    description: v.optional(v.string()),
    steps: v.optional(v.array(v.string())),
    proof_requirement: v.optional(v.string()),
    note: v.optional(v.string()),
    is_penalty: v.optional(v.boolean()),
    date: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const today = args.date ?? todayISO();
    const existing = (await ctx.db.query("quests").collect()).find(
      (q: any) => q.name === args.name && q.date === today && !q.is_boss
    );
    if (existing) {
      if (existing.completed) return { ok: true, duplicate: true };
      // Was pre-inserted uncompleted — patch it
      await ctx.db.patch(existing._id, { completed: true, note: args.note });
    } else {
      await ctx.db.insert("quests", {
        name: args.name,
        stat: args.stat,
        xp_reward: args.xp_reward,
        objective: args.objective ?? "",
        description: args.description ?? "",
        steps: args.steps ?? [],
        proof_requirement: args.proof_requirement ?? "",
        note: args.note ?? "",
        completed: true,
        date: today,
        is_boss: false,
        is_penalty: args.is_penalty ?? false,
      } as any);
    }

    const xpAmount = (args.is_penalty ?? false) ? -Math.abs(args.xp_reward) : args.xp_reward;
    const xpResult = await applyXpToStat(ctx, args.stat, xpAmount);

    // Auto-update specific streaks based on quest name
    const qname = args.name.toLowerCase();
    const streakMap: Record<string, string> = {
      reading: "reading",
      "read ": "reading",
      gym: "gym",
      workout: "gym",
      "deep work": "deep_work",
    };
    const streaks = await ctx.db.query("streaks").collect();
    for (const [keyword, streakType] of Object.entries(streakMap)) {
      if (qname.includes(keyword)) {
        const s = streaks.find((x: any) => x.type === streakType);
        if (s) await ctx.db.patch(s._id, { count: s.count + 1, last_updated: todayISO() });
        break;
      }
    }

    return { ok: true, xpResult };
  },
});

// ── Quest Catalog ──────────────────────────────────────────

export const getCatalog = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("quest_catalog").collect();
    return items.sort((a: any, b: any) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  },
});

export const upsertCatalogEntry = mutation({
  args: {
    name: v.string(),
    stat: v.string(),
    xp: v.number(),
    is_penalty: v.boolean(),
    category: v.string(),
    objective: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = (await ctx.db.query("quest_catalog").collect()).find(
      (e: any) => e.name === args.name
    );
    if (existing) {
      await ctx.db.patch(existing._id, args);
      return { ok: true, action: "updated" };
    }
    await ctx.db.insert("quest_catalog", args);
    return { ok: true, action: "created" };
  },
});

export const deleteCatalogEntry = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const entry = (await ctx.db.query("quest_catalog").collect()).find(
      (e: any) => e.name === args.name
    );
    if (!entry) throw new Error("Entry not found");
    await ctx.db.delete(entry._id);
    return { ok: true };
  },
});

// ── Quest Description / Lore ───────────────────────────────


export const patchQuestXp = mutation({
  args: { questId: v.string(), xp_reward: v.number() },
  handler: async (ctx, args) => {
    const quest = await ctx.db.get(args.questId as any);
    if (!quest) throw new Error("Quest not found");
    await ctx.db.patch(quest._id, { xp_reward: args.xp_reward });
    return { ok: true };
  },
});

export const updateQuestDescription = mutation({
  args: { questId: v.string(), objective: v.optional(v.string()), description: v.optional(v.string()), lore: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const quest = await ctx.db.get(args.questId as any);
    if (!quest) throw new Error("Quest not found");
    const patch: any = {};
    if (args.objective !== undefined) patch.objective = args.objective;
    if (args.description !== undefined) patch.description = args.description;
    // lore is legacy alias for description
    if (args.lore !== undefined) patch.description = args.lore;
    await ctx.db.patch(quest._id, patch);
    return { ok: true };
  },
});

export const setQuestNote = mutation({
  args: { questId: v.string(), note: v.string() },
  handler: async (ctx, args) => {
    const quest = await ctx.db.get(args.questId as any);
    if (!quest) throw new Error("Quest not found");
    await ctx.db.patch(quest._id, { note: args.note });
    return { ok: true };
  },
});

export const patchQuestName = mutation({
  args: { questId: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const quest = await ctx.db.get(args.questId as any);
    if (!quest) throw new Error("Quest not found");
    await ctx.db.patch(quest._id, { name: args.name });
    return { ok: true };
  },
});

export const markQuestCompleted = mutation({
  args: { questId: v.string() },
  handler: async (ctx, args) => {
    const quest = await ctx.db.get(args.questId as any);
    if (!quest) throw new Error("Quest not found");
    await ctx.db.patch(quest._id, { completed: true });
    return { ok: true };
  },
});

export const getAllQuests = query({
  args: {},
  handler: async (ctx) => {
    const quests = await ctx.db.query("quests").collect();
    quests.sort((a: any, b: any) => b.date.localeCompare(a.date));
    return quests;
  },
});

export const addQuestToday = mutation({
  args: {
    name: v.string(),
    stat: v.string(),
    xp_reward: v.number(),
    objective: v.optional(v.string()),
    description: v.optional(v.string()),
    steps: v.optional(v.array(v.string())),
    proof_requirement: v.optional(v.string()),
    is_penalty: v.optional(v.boolean()),
    date: v.optional(v.string()),
    quest_type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const date = args.date ?? todayISO();
    const existing = (await ctx.db.query("quests").collect()).find(
      (q: any) => q.name === args.name && !q.is_boss
    );
    if (existing) return { ok: true, reason: "already_exists" };
    await ctx.db.insert("quests", {
      name: args.name,
      stat: args.stat,
      xp_reward: args.xp_reward,
      objective: args.objective,
      description: args.description,
      steps: args.steps ?? [],
      proof_requirement: args.proof_requirement ?? "",
      completed: false,
      date,
      is_boss: false,
      is_penalty: args.is_penalty ?? false,
      quest_type: args.quest_type ?? "side",
    } as any);
    return { ok: true, created: true };
  },
});

export const generateDailyQuests = mutation({
  args: {},
  handler: async (ctx) => {
    const character = (await ctx.db.query("character").collect())[0];
    if (!character) {
      return { ok: false, reason: "no_character" };
    }

    const today = todayISO();

    // Check if quests already exist for today
    const existing = (await ctx.db.query("quests").collect()).filter(
      (q: any) => q.date === today && !q.is_boss
    );
    if (existing.length > 0) {
      return { ok: true, generated: false, reason: "already_exists", count: existing.length };
    }

    // Insert today's quests
    for (const template of DAILY_QUEST_TEMPLATES) {
      await ctx.db.insert("quests", {
        name: template.name,
        stat: template.stat,
        xp_reward: template.xp_reward,
        objective: template.objective,
        description: (template as any).description,
        completed: false,
        date: today,
        is_boss: false,
      } as any);
    }

    return { ok: true, generated: true, count: DAILY_QUEST_TEMPLATES.length, date: today };
  },
});

// ── Equipment ──────────────────────────────────────────────────────────────

export const getEquipment = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("equipment").collect();
  },
});

export const upsertEquipmentSlot = mutation({
  args: {
    slot: v.string(),
    slot_zh: v.string(),
    name: v.string(),
    quality: v.string(),
    icon: v.optional(v.string()),
    stat_bonuses: v.optional(v.array(v.object({ stat: v.string(), value: v.number() }))),
    description: v.optional(v.string()),
    lore: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = (await ctx.db.query("equipment").collect()).find((e: any) => e.slot === args.slot);
    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("equipment", args as any);
    }
    return { ok: true };
  },
});

export const clearEquipmentSlot = mutation({
  args: { slot: v.string() },
  handler: async (ctx, args) => {
    const existing = (await ctx.db.query("equipment").collect()).find((e: any) => e.slot === args.slot);
    if (existing) await ctx.db.delete(existing._id);
    return { ok: true };
  },
});

// ── Abilities ──────────────────────────────────────────────────────────────

export const getAbilities = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("abilities").collect();
  },
});

export const upsertAbility = mutation({
  args: {
    name: v.string(),
    icon: v.string(),
    type: v.string(),
    category: v.string(),
    description: v.string(),
    lore: v.optional(v.string()),
    stat_bonuses: v.optional(v.array(v.object({ stat: v.string(), value: v.number() }))),
    cooldown: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = (await ctx.db.query("abilities").collect()).find((a: any) => a.name === args.name);
    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("abilities", args as any);
    }
    return { ok: true };
  },
});

export const deleteAbility = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const existing = (await ctx.db.query("abilities").collect()).find((a: any) => a.name === args.name);
    if (existing) await ctx.db.delete(existing._id);
    return { ok: true };
  },
});

export const upsertBossFight = mutation({
  args: {
    name: v.string(),
    stat: v.string(),
    xp_reward: v.number(),
    deadline: v.string(),
    objective: v.optional(v.string()),
    description: v.optional(v.string()),
    current_value: v.optional(v.number()),
    target_value: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const bosses = (await ctx.db.query("quests").collect()).filter(
      (q: any) => q.is_boss && !q.completed
    );
    for (const b of bosses) {
      await ctx.db.patch(b._id, { completed: true });
    }
    await ctx.db.insert("quests", {
      name: args.name,
      stat: args.stat,
      xp_reward: args.xp_reward,
      deadline: args.deadline,
      objective: args.objective,
      description: args.description,
      current_value: args.current_value,
      target_value: args.target_value,
      is_boss: true,
      completed: false,
      date: todayISO(),
    } as any);
    return { ok: true };
  },
});

export const updateBossProgress = mutation({
  args: { current_value: v.number() },
  handler: async (ctx, args) => {
    const boss = (await ctx.db.query("quests").collect()).find(
      (q: any) => q.is_boss && !q.completed
    );
    if (!boss) throw new Error("No active boss fight");
    await ctx.db.patch(boss._id, { current_value: args.current_value });
    return { ok: true };
  },
});

export const patchBoss = mutation({
  args: {
    name: v.optional(v.string()),
    dungeon: v.optional(v.string()),
    objective: v.optional(v.string()),
    description: v.optional(v.string()),
    target_value: v.optional(v.number()),
    deadline: v.optional(v.string()),
    xp_reward: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const boss = (await ctx.db.query("quests").collect()).find(
      (q: any) => q.is_boss && !q.completed
    );
    if (!boss) throw new Error("No active boss fight");
    const patch: any = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.dungeon !== undefined) patch.dungeon = args.dungeon;
    if (args.objective !== undefined) patch.objective = args.objective;
    if (args.description !== undefined) patch.description = args.description;
    if (args.target_value !== undefined) patch.target_value = args.target_value;
    if (args.deadline !== undefined) patch.deadline = args.deadline;
    if (args.xp_reward !== undefined) patch.xp_reward = args.xp_reward;
    await ctx.db.patch(boss._id, patch);
    return { ok: true };
  },
});

export const setQuestType = mutation({
  args: { questId: v.string(), quest_type: v.string() },
  handler: async (ctx, args) => {
    const quest = await ctx.db.get(args.questId as any);
    if (!quest) throw new Error("Quest not found");
    await ctx.db.patch(quest._id, { quest_type: args.quest_type });
    return { ok: true };
  },
});

export const patchStreak = mutation({
  args: { type: v.string(), count: v.number() },
  handler: async (ctx, args) => {
    const streak = (await ctx.db.query("streaks").collect()).find((s: any) => s.type === args.type);
    if (!streak) throw new Error("Streak not found: " + args.type);
    await ctx.db.patch(streak._id, { count: args.count, last_updated: todayISO() });
    return { ok: true };
  },
});

export const deleteQuest = mutation({
  args: { questId: v.string() },
  handler: async (ctx, args) => {
    const quest = await ctx.db.get(args.questId as any);
    if (!quest) throw new Error("Quest not found");
    await ctx.db.delete(quest._id);
    return { ok: true };
  },
});
