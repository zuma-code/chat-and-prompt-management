export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  user_id: string
  title: string
  description?: string
  status: "active" | "archived" | "deleted"
  is_pinned: boolean
  tags: string[]
  created_at: string
  updated_at: string
  message_count?: number
  last_message_at?: string
}

export interface Message {
  id: string
  conversation_id: string
  role: "user" | "assistant" | "system"
  content: string
  metadata: Record<string, any>
  created_at: string
}

export interface PromptCategory {
  id: string
  name: string
  description?: string
  color: string
  created_at: string
}

export interface Prompt {
  id: string
  user_id?: string
  category_id?: string
  title: string
  content: string
  description?: string
  tags: string[]
  is_public: boolean
  usage_count: number
  created_at: string
  updated_at: string
  category?: PromptCategory
}

export interface PromptUsage {
  id: string
  prompt_id: string
  user_id: string
  conversation_id?: string
  used_at: string
}

export interface DashboardStats {
  total_conversations: number
  active_conversations: number
  total_prompts: number
  total_messages: number
  prompts_used_today: number
  conversations_created_this_week: number
}

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
