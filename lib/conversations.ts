import { createClient } from "./supabase"
import type { Conversation, Message } from "./types"

export async function getConversations(
  userId: string,
  filters?: {
    status?: string
    search?: string
    tags?: string[]
    limit?: number
    offset?: number
  },
): Promise<{ conversations: Conversation[]; total: number }> {
  const supabase = createClient()
  let query = supabase
    .from("conversations")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .neq("status", "deleted")

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status)
  }

  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
  }

  if (filters?.tags && filters.tags.length > 0) {
    query = query.overlaps("tags", filters.tags)
  }

  query = query.order("updated_at", { ascending: false })

  if (filters?.limit) {
    query = query.range(filters.offset || 0, (filters.offset || 0) + filters.limit - 1)
  }

  const { data, error, count } = await query

  if (error) throw error

  return {
    conversations: data || [],
    total: count || 0,
  }
}

export async function getConversation(id: string, userId: string): Promise<Conversation | null> {
  const supabase = createClient()

  const { data, error } = await supabase.from("conversations").select("*").eq("id", id).eq("user_id", userId).single()

  if (error) {
    if (error.code === "PGRST116") return null
    throw error
  }

  return data
}

export async function createConversation(
  userId: string,
  data: {
    title: string
    description?: string
    tags?: string[]
  },
): Promise<Conversation> {
  const supabase = createClient()

  const { data: conversation, error } = await supabase
    .from("conversations")
    .insert({
      user_id: userId,
      title: data.title,
      description: data.description,
      tags: data.tags || [],
    })
    .select()
    .single()

  if (error) throw error
  return conversation
}

export async function updateConversation(
  id: string,
  userId: string,
  data: {
    title?: string
    description?: string
    status?: "active" | "archived"
    is_pinned?: boolean
    tags?: string[]
  },
): Promise<Conversation> {
  const supabase = createClient()

  const { data: conversation, error } = await supabase
    .from("conversations")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single()

  if (error) throw error
  return conversation
}

export async function deleteConversation(id: string, userId: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from("conversations")
    .update({ status: "deleted" })
    .eq("id", id)
    .eq("user_id", userId)

  if (error) throw error
}

export async function getConversationMessages(conversationId: string): Promise<Message[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })

  if (error) throw error
  return data || []
}

export async function addMessage(
  conversationId: string,
  data: {
    role: "user" | "assistant" | "system"
    content: string
    metadata?: Record<string, any>
  },
): Promise<Message> {
  const supabase = createClient()

  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      role: data.role,
      content: data.content,
      metadata: data.metadata || {},
    })
    .select()
    .single()

  if (error) throw error

  // Update conversation's updated_at timestamp
  await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId)

  return message
}
