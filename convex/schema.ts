import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  character: defineTable({
    name: v.string(),
    class: v.string(),
    overall_level: v.number(),
    overall_total_xp: v.optional(v.number()),
    last_updated: v.string(),
  }),
  stats: defineTable({
    stat_id: v.string(),
    name: v.string(),
    level: v.number(),
    xp: v.number(),
    total_xp: v.number(),
  }),
  streaks: defineTable({
    type: v.string(),
    label: v.string(),
    count: v.number(),
    last_updated: v.optional(v.string()),
  }),
  quests: defineTable({
    name: v.string(),
    stat: v.string(),
    xp_reward: v.number(),
    completed: v.boolean(),
    date: v.string(),
    objective: v.optional(v.string()),    // short text under title
    description: v.optional(v.string()),  // longer flavor text in Description section
    note: v.optional(v.string()),         // completion note: what was actually done
    is_boss: v.optional(v.boolean()),
    is_penalty: v.optional(v.boolean()),
    deadline: v.optional(v.string()),
  }),
  quest_catalog: defineTable({
    name: v.string(),
    stat: v.string(),
    xp: v.number(),
    is_penalty: v.boolean(),
    category: v.string(),
    objective: v.optional(v.string()),
    description: v.optional(v.string()),
  }),
  achievements: defineTable({
    key: v.string(),
    name: v.string(),
    icon: v.string(),
    unlocked: v.boolean(),
    unlocked_at: v.optional(v.string()),
    condition: v.optional(v.string()),
  }),
  abilities: defineTable({
    name: v.string(),
    icon: v.string(),
    type: v.string(),       // "active" | "passive"
    category: v.string(),   // "ai" | "dev" | "infra" | "productivity"
    description: v.string(),
    lore: v.optional(v.string()),
    stat_bonuses: v.optional(v.array(v.object({ stat: v.string(), value: v.number() }))),
    cooldown: v.optional(v.string()),  // flavor text e.g. "无冷却", "每日"
  }),
  equipment: defineTable({
    slot: v.string(),          // e.g. "main_hand"
    slot_zh: v.string(),       // e.g. "主手武器"
    name: v.string(),          // e.g. "MacBook Pro M2 Max 14\""
    quality: v.string(),       // grey|white|green|blue|purple|orange
    icon: v.optional(v.string()),
    stat_bonuses: v.optional(v.array(v.object({ stat: v.string(), value: v.number() }))),
    description: v.optional(v.string()),
    lore: v.optional(v.string()),
  }),
});
