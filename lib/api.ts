import { createClient } from "./supabase"
import type { DashboardStats, Conversation, Prompt } from "./types"

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const supabase = createClient()

  // Get total conversations
  const { count: totalConversations } = await supabase
    .from("conversations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .neq("status", "deleted")

  // Get active conversations
  const { count: activeConversations } = await supabase
    .from("conversations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "active")

  // Get total prompts (user's + public)
  const { count: totalPrompts } = await supabase
    .from("prompts")
    .select("*", { count: "exact", head: true })
    .or(`user_id.eq.${userId},is_public.eq.true`)

  // Get total messages
  const { count: totalMessages } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .in("conversation_id", supabase.from("conversations").select("id").eq("user_id", userId).neq("status", "deleted"))

  // Get prompts used today
  const today = new Date().toISOString().split("T")[0]
  const { count: promptsUsedToday } = await supabase
    .from("prompt_usage")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("used_at", `${today}T00:00:00.000Z`)

  // Get conversations created this week
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const { count: conversationsThisWeek } = await supabase
    .from("conversations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", weekAgo.toISOString())

  return {
    total_conversations: totalConversations || 0,
    active_conversations: activeConversations || 0,
    total_prompts: totalPrompts || 0,
    total_messages: totalMessages || 0,
    prompts_used_today: promptsUsedToday || 0,
    conversations_created_this_week: conversationsThisWeek || 0,
  }
}

export async function getRecentConversations(userId: string, limit = 5): Promise<Conversation[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", userId)
    .neq("status", "deleted")
    .order("updated_at", { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

export async function getPopularPrompts(userId: string, limit = 5): Promise<Prompt[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("prompts")
    .select(`
      *,
      category:prompt_categories(*)
    `)
    .or(`user_id.eq.${userId},is_public.eq.true`)
    .order("usage_count", { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}
