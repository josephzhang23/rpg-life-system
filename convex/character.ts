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
  return new Date().toISOString().slice(0, 10);
}

function nowISO() {
  return new Date().toISOString();
}

async function recalcCharacterLevel(ctx: any) {
  const stats = await ctx.db.query("stats").collect();
  const avg = stats.length
    ? Math.round(stats.reduce((sum: number, s: any) => sum + s.level, 0) / stats.length)
    : 1;

  const existing = (await ctx.db.query("character").collect())[0];
  if (!existing) return avg;

  await ctx.db.patch(existing._id, {
    overall_level: avg,
    last_updated: nowISO(),
  });

  return avg;
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
    const [character, stats, streaks, achievements, quests] = await Promise.all([
      ctx.db.query("character").collect(),
      ctx.db.query("stats").collect(),
      ctx.db.query("streaks").collect(),
      ctx.db.query("achievements").collect(),
      ctx.db.query("quests").collect(),
    ]);

    const today = todayISO();
    const questsToday = quests.filter((q: any) => q.date === today && !q.is_boss);
    const activeBoss = quests.find((q: any) => q.is_boss && !q.completed) ?? null;
    const overallLevel = stats.length
      ? Math.round(stats.reduce((sum: number, s: any) => sum + s.level, 0) / stats.length)
      : 1;

    return {
      character: character[0] ?? null,
      stats: stats.sort((a: any, b: any) => DEFAULT_STATS.indexOf(a.stat_id as any) - DEFAULT_STATS.indexOf(b.stat_id as any)),
      streaks,
      questsToday,
      activeBoss,
      achievements,
      overallLevel,
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
  { name: "Plan your top 3 priorities", stat: "DISC", xp_reward: 20, description: "写下今天最重要的三件事，专注执行。清单越短，执行力越强。" },
  { name: "60 minutes deep work sprint", stat: "INT", xp_reward: 35, description: "不间断专注工作 60 分钟。关闭通知，进入心流状态。" },
  { name: "Workout / movement session", stat: "STR", xp_reward: 30, description: "任何形式的体能训练：健身房、跑步、游泳均可。动起来。" },
  { name: "Meaningful outreach or connection", stat: "SOC", xp_reward: 25, description: "主动联系一个有价值的人：合作、请教或分享。" },
  { name: "Create something publishable", stat: "CRE", xp_reward: 40, description: "创造一件可以对外发布的作品：代码、功能、内容等。" },
  { name: "Push a commit", stat: "CRE", xp_reward: 30, description: "向代码仓库提交至少一个 commit。代码即进度。" },
];

export const updateQuestDescription = mutation({
  args: { questId: v.string(), description: v.string() },
  handler: async (ctx, args) => {
    const quest = await ctx.db.get(args.questId as any);
    if (!quest) throw new Error("Quest not found");
    await ctx.db.patch(quest._id, { description: args.description });
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
    description: v.optional(v.string()),
    is_penalty: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const today = todayISO();
    const existing = (await ctx.db.query("quests").collect()).find(
      (q: any) => q.date === today && q.name === args.name
    );
    if (existing) return { ok: true, reason: "already_exists" };
    await ctx.db.insert("quests", {
      name: args.name,
      stat: args.stat,
      xp_reward: args.xp_reward,
      description: args.description,
      completed: false,
      date: today,
      is_boss: false,
      is_penalty: args.is_penalty ?? false,
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
        description: template.description,
        completed: false,
        date: today,
        is_boss: false,
      } as any);
    }

    return { ok: true, generated: true, count: DAILY_QUEST_TEMPLATES.length, date: today };
  },
});
