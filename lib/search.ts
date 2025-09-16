import { createClient } from "./supabase"

export interface SearchFilters {
  query?: string
  type?: "all" | "conversations" | "prompts" | "messages"
  dateRange?: {
    from: Date
    to: Date
  }
  tags?: string[]
  categories?: string[]
  status?: string[]
  visibility?: "all" | "public" | "private"
  sortBy?: "relevance" | "date" | "usage"
  sortOrder?: "asc" | "desc"
}

export interface SearchResult {
  id: string
  type: "conversation" | "prompt" | "message"
  title: string
  content: string
  excerpt: string
  metadata: Record<string, any>
  score: number
  created_at: string
  updated_at: string
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
  facets: {
    types: { type: string; count: number }[]
    tags: { tag: string; count: number }[]
    categories: { category: string; count: number }[]
    dateRanges: { range: string; count: number }[]
  }
}

export async function performAdvancedSearch(
  userId: string,
  filters: SearchFilters,
  limit = 20,
  offset = 0,
): Promise<SearchResponse> {
  const supabase = createClient()
  const results: SearchResult[] = []
  let total = 0

  // Search conversations
  if (!filters.type || filters.type === "all" || filters.type === "conversations") {
    const conversationResults = await searchConversations(userId, filters, limit, offset)
    results.push(...conversationResults.results)
    total += conversationResults.total
  }

  // Search prompts
  if (!filters.type || filters.type === "all" || filters.type === "prompts") {
    const promptResults = await searchPrompts(userId, filters, limit, offset)
    results.push(...promptResults.results)
    total += promptResults.total
  }

  // Search messages
  if (!filters.type || filters.type === "all" || filters.type === "messages") {
    const messageResults = await searchMessages(userId, filters, limit, offset)
    results.push(...messageResults.results)
    total += messageResults.total
  }

  // Sort results by relevance or date
  const sortedResults = sortResults(results, filters.sortBy || "relevance", filters.sortOrder || "desc")

  // Generate facets
  const facets = await generateFacets(userId, filters)

  return {
    results: sortedResults.slice(0, limit),
    total,
    facets,
  }
}

async function searchConversations(
  userId: string,
  filters: SearchFilters,
  limit: number,
  offset: number,
): Promise<{ results: SearchResult[]; total: number }> {
  const supabase = createClient()
  let query = supabase
    .from("conversations")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .neq("status", "deleted")

  if (filters.query) {
    query = query.or(`title.ilike.%${filters.query}%,description.ilike.%${filters.query}%`)
  }

  if (filters.tags && filters.tags.length > 0) {
    query = query.overlaps("tags", filters.tags)
  }

  if (filters.status && filters.status.length > 0) {
    query = query.in("status", filters.status)
  }

  if (filters.dateRange) {
    query = query
      .gte("created_at", filters.dateRange.from.toISOString())
      .lte("created_at", filters.dateRange.to.toISOString())
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1)

  if (error) throw error

  const results: SearchResult[] =
    data?.map((conversation) => ({
      id: conversation.id,
      type: "conversation" as const,
      title: conversation.title,
      content: conversation.description || "",
      excerpt: truncateText(conversation.description || conversation.title, 150),
      metadata: {
        status: conversation.status,
        tags: conversation.tags,
        is_pinned: conversation.is_pinned,
      },
      score: calculateRelevanceScore(conversation.title + " " + (conversation.description || ""), filters.query || ""),
      created_at: conversation.created_at,
      updated_at: conversation.updated_at,
    })) || []

  return { results, total: count || 0 }
}

async function searchPrompts(
  userId: string,
  filters: SearchFilters,
  limit: number,
  offset: number,
): Promise<{ results: SearchResult[]; total: number }> {
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

  if (filters.query) {
    query = query.or(
      `title.ilike.%${filters.query}%,description.ilike.%${filters.query}%,content.ilike.%${filters.query}%`,
    )
  }

  if (filters.tags && filters.tags.length > 0) {
    query = query.overlaps("tags", filters.tags)
  }

  if (filters.categories && filters.categories.length > 0) {
    query = query.in("category_id", filters.categories)
  }

  if (filters.visibility === "public") {
    query = query.eq("is_public", true)
  } else if (filters.visibility === "private") {
    query = query.eq("is_public", false).eq("user_id", userId)
  }

  if (filters.dateRange) {
    query = query
      .gte("created_at", filters.dateRange.from.toISOString())
      .lte("created_at", filters.dateRange.to.toISOString())
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1)

  if (error) throw error

  const results: SearchResult[] =
    data?.map((prompt) => ({
      id: prompt.id,
      type: "prompt" as const,
      title: prompt.title,
      content: prompt.content,
      excerpt: truncateText(prompt.description || prompt.content, 150),
      metadata: {
        category: prompt.category,
        tags: prompt.tags,
        is_public: prompt.is_public,
        usage_count: prompt.usage_count,
      },
      score: calculateRelevanceScore(
        prompt.title + " " + (prompt.description || "") + " " + prompt.content,
        filters.query || "",
      ),
      created_at: prompt.created_at,
      updated_at: prompt.updated_at,
    })) || []

  return { results, total: count || 0 }
}

async function searchMessages(
  userId: string,
  filters: SearchFilters,
  limit: number,
  offset: number,
): Promise<{ results: SearchResult[]; total: number }> {
  const supabase = createClient()

  // First get user's conversations
  const { data: conversations } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_id", userId)
    .neq("status", "deleted")

  if (!conversations || conversations.length === 0) {
    return { results: [], total: 0 }
  }

  const conversationIds = conversations.map((c) => c.id)

  let query = supabase
    .from("messages")
    .select(
      `
      *,
      conversation:conversations(title, description)
    `,
      { count: "exact" },
    )
    .in("conversation_id", conversationIds)

  if (filters.query) {
    query = query.ilike("content", `%${filters.query}%`)
  }

  if (filters.dateRange) {
    query = query
      .gte("created_at", filters.dateRange.from.toISOString())
      .lte("created_at", filters.dateRange.to.toISOString())
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1)

  if (error) throw error

  const results: SearchResult[] =
    data?.map((message) => ({
      id: message.id,
      type: "message" as const,
      title: `Message in "${message.conversation?.title || "Untitled"}"`,
      content: message.content,
      excerpt: truncateText(message.content, 150),
      metadata: {
        role: message.role,
        conversation_id: message.conversation_id,
        conversation_title: message.conversation?.title,
      },
      score: calculateRelevanceScore(message.content, filters.query || ""),
      created_at: message.created_at,
      updated_at: message.created_at,
    })) || []

  return { results, total: count || 0 }
}

async function generateFacets(userId: string, filters: SearchFilters) {
  const supabase = createClient()

  // Get type counts
  const types = [
    { type: "conversations", count: 0 },
    { type: "prompts", count: 0 },
    { type: "messages", count: 0 },
  ]

  // Get tag counts from conversations and prompts
  const tags: { tag: string; count: number }[] = []

  // Get category counts from prompts
  const categories: { category: string; count: number }[] = []

  // Get date range counts
  const dateRanges = [
    { range: "Last 7 days", count: 0 },
    { range: "Last 30 days", count: 0 },
    { range: "Last 3 months", count: 0 },
    { range: "Older", count: 0 },
  ]

  return {
    types,
    tags,
    categories,
    dateRanges,
  }
}

function sortResults(results: SearchResult[], sortBy: string, sortOrder: string): SearchResult[] {
  return results.sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case "relevance":
        comparison = b.score - a.score
        break
      case "date":
        comparison = new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        break
      case "usage":
        comparison = (b.metadata.usage_count || 0) - (a.metadata.usage_count || 0)
        break
      default:
        comparison = b.score - a.score
    }

    return sortOrder === "asc" ? -comparison : comparison
  })
}

function calculateRelevanceScore(text: string, query: string): number {
  if (!query) return 1

  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const words = lowerQuery.split(" ").filter((w) => w.length > 0)

  let score = 0

  // Exact phrase match gets highest score
  if (lowerText.includes(lowerQuery)) {
    score += 10
  }

  // Individual word matches
  words.forEach((word) => {
    const matches = (lowerText.match(new RegExp(word, "g")) || []).length
    score += matches * 2
  })

  // Title matches get bonus
  if (text.length < 100 && lowerText.includes(lowerQuery)) {
    score += 5
  }

  return score
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength).trim() + "..."
}

export async function getSearchSuggestions(userId: string, query: string): Promise<string[]> {
  if (!query || query.length < 2) return []

  const supabase = createClient()
  const suggestions: Set<string> = new Set()

  // Get suggestions from conversation titles
  const { data: conversations } = await supabase
    .from("conversations")
    .select("title, tags")
    .eq("user_id", userId)
    .ilike("title", `%${query}%`)
    .limit(5)

  conversations?.forEach((conv) => {
    if (conv.title.toLowerCase().includes(query.toLowerCase())) {
      suggestions.add(conv.title)
    }
    conv.tags?.forEach((tag: string) => {
      if (tag.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(tag)
      }
    })
  })

  // Get suggestions from prompt titles
  const { data: prompts } = await supabase
    .from("prompts")
    .select("title, tags")
    .or(`user_id.eq.${userId},is_public.eq.true`)
    .ilike("title", `%${query}%`)
    .limit(5)

  prompts?.forEach((prompt) => {
    if (prompt.title.toLowerCase().includes(query.toLowerCase())) {
      suggestions.add(prompt.title)
    }
    prompt.tags?.forEach((tag: string) => {
      if (tag.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(tag)
      }
    })
  })

  return Array.from(suggestions).slice(0, 8)
}
