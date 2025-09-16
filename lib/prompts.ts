import { createClient } from "./supabase"
import type { Prompt, PromptCategory } from "./types"

export async function getPrompts(
  userId: string,
  filters?: {
    category?: string
    search?: string
    tags?: string[]
    isPublic?: boolean
    limit?: number
    offset?: number
  },
): Promise<{ prompts: Prompt[]; total: number }> {
  const supabase = createClient()
  let query = supabase
    .from("prompts")
    .select(
      `
      *,
      category:prompt_categories(*)
    `,
      { count: "exact" },
    )
    .or(`user_id.eq.${userId},is_public.eq.true`)

  if (filters?.category && filters.category !== "all") {
    query = query.eq("category_id", filters.category)
  }

  if (filters?.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,content.ilike.%${filters.search}%`,
    )
  }

  if (filters?.tags && filters.tags.length > 0) {
    query = query.overlaps("tags", filters.tags)
  }

  if (filters?.isPublic !== undefined) {
    query = query.eq("is_public", filters.isPublic)
  }

  query = query.order("usage_count", { ascending: false }).order("created_at", { ascending: false })

  if (filters?.limit) {
    query = query.range(filters.offset || 0, (filters.offset || 0) + filters.limit - 1)
  }

  const { data, error, count } = await query

  if (error) throw error

  return {
    prompts: data || [],
    total: count || 0,
  }
}

export async function getPrompt(id: string, userId: string): Promise<Prompt | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("prompts")
    .select(
      `
      *,
      category:prompt_categories(*)
    `,
    )
    .eq("id", id)
    .or(`user_id.eq.${userId},is_public.eq.true`)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null
    throw error
  }

  return data
}

export async function createPrompt(
  userId: string,
  data: {
    title: string
    content: string
    description?: string
    category_id?: string
    tags?: string[]
    is_public?: boolean
  },
): Promise<Prompt> {
  const supabase = createClient()

  const { data: prompt, error } = await supabase
    .from("prompts")
    .insert({
      user_id: userId,
      title: data.title,
      content: data.content,
      description: data.description,
      category_id: data.category_id,
      tags: data.tags || [],
      is_public: data.is_public || false,
    })
    .select(
      `
      *,
      category:prompt_categories(*)
    `,
    )
    .single()

  if (error) throw error
  return prompt
}

export async function updatePrompt(
  id: string,
  userId: string,
  data: {
    title?: string
    content?: string
    description?: string
    category_id?: string
    tags?: string[]
    is_public?: boolean
  },
): Promise<Prompt> {
  const supabase = createClient()

  const { data: prompt, error } = await supabase
    .from("prompts")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select(
      `
      *,
      category:prompt_categories(*)
    `,
    )
    .single()

  if (error) throw error
  return prompt
}

export async function deletePrompt(id: string, userId: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase.from("prompts").delete().eq("id", id).eq("user_id", userId)

  if (error) throw error
}

export async function usePrompt(promptId: string, userId: string, conversationId?: string): Promise<void> {
  const supabase = createClient()

  // Record usage
  await supabase.from("prompt_usage").insert({
    prompt_id: promptId,
    user_id: userId,
    conversation_id: conversationId,
  })

  // Increment usage count
  await supabase.rpc("increment_prompt_usage", { prompt_id: promptId })
}

export async function getPromptCategories(): Promise<PromptCategory[]> {
  const supabase = createClient()

  const { data, error } = await supabase.from("prompt_categories").select("*").order("name")

  if (error) throw error
  return data || []
}

export async function createPromptCategory(data: {
  name: string
  description?: string
  color?: string
}): Promise<PromptCategory> {
  const supabase = createClient()

  const { data: category, error } = await supabase.from("prompt_categories").insert(data).select().single()

  if (error) throw error
  return category
}
