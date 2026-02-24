import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  character: defineTable({
    name: v.string(),
    class: v.string(),
    overall_level: v.number(),
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
    is_boss: v.optional(v.boolean()),
    is_penalty: v.optional(v.boolean()),
    deadline: v.optional(v.string()),
  }),
  achievements: defineTable({
    key: v.string(),
    name: v.string(),
    icon: v.string(),
    unlocked: v.boolean(),
    unlocked_at: v.optional(v.string()),
    condition: v.optional(v.string()),
  }),
});
