import { createClient } from "./supabase"
import type { Prompt } from "./types"

export interface CursorExportFormat {
  version: "1.0"
  exported_at: string
  conversations: {
    id: string
    title: string
    description?: string
    messages: {
      role: "user" | "assistant" | "system"
      content: string
      timestamp: string
    }[]
    tags: string[]
    created_at: string
  }[]
  prompts: {
    id: string
    title: string
    content: string
    description?: string
    category?: string
    tags: string[]
    usage_count: number
    created_at: string
  }[]
}

export interface CursorImportData {
  conversations?: {
    title: string
    description?: string
    messages: {
      role: "user" | "assistant" | "system"
      content: string
      timestamp?: string
    }[]
    tags?: string[]
  }[]
  prompts?: {
    title: string
    content: string
    description?: string
    category?: string
    tags?: string[]
  }[]
}

export async function exportToCursor(userId: string): Promise<CursorExportFormat> {
  const supabase = createClient()

  // Get user's conversations with messages
  const { data: conversations, error: convError } = await supabase
    .from("conversations")
    .select(
      `
      *,
      messages(*)
    `,
    )
    .eq("user_id", userId)
    .neq("status", "deleted")
    .order("created_at", { ascending: false })

  if (convError) throw convError

  // Get user's prompts
  const { data: prompts, error: promptError } = await supabase
    .from("prompts")
    .select(
      `
      *,
      category:prompt_categories(name)
    `,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (promptError) throw promptError

  const exportData: CursorExportFormat = {
    version: "1.0",
    exported_at: new Date().toISOString(),
    conversations:
      conversations?.map((conv) => ({
        id: conv.id,
        title: conv.title,
        description: conv.description,
        messages:
          conv.messages
            ?.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .map((msg: any) => ({
              role: msg.role,
              content: msg.content,
              timestamp: msg.created_at,
            })) || [],
        tags: conv.tags || [],
        created_at: conv.created_at,
      })) || [],
    prompts:
      prompts?.map((prompt) => ({
        id: prompt.id,
        title: prompt.title,
        content: prompt.content,
        description: prompt.description,
        category: prompt.category?.name,
        tags: prompt.tags || [],
        usage_count: prompt.usage_count,
        created_at: prompt.created_at,
      })) || [],
  }

  return exportData
}

export async function importFromCursor(
  userId: string,
  data: CursorImportData,
): Promise<{
  conversations: number
  prompts: number
  errors: string[]
}> {
  const supabase = createClient()
  const errors: string[] = []
  let conversationsImported = 0
  let promptsImported = 0

  // Import conversations
  if (data.conversations) {
    for (const convData of data.conversations) {
      try {
        // Create conversation
        const { data: conversation, error: convError } = await supabase
          .from("conversations")
          .insert({
            user_id: userId,
            title: convData.title,
            description: convData.description,
            tags: convData.tags || [],
          })
          .select()
          .single()

        if (convError) {
          errors.push(`Failed to import conversation "${convData.title}": ${convError.message}`)
          continue
        }

        // Import messages
        if (convData.messages && convData.messages.length > 0) {
          const messages = convData.messages.map((msg) => ({
            conversation_id: conversation.id,
            role: msg.role,
            content: msg.content,
            created_at: msg.timestamp || new Date().toISOString(),
          }))

          const { error: msgError } = await supabase.from("messages").insert(messages)

          if (msgError) {
            errors.push(`Failed to import messages for "${convData.title}": ${msgError.message}`)
          }
        }

        conversationsImported++
      } catch (error) {
        errors.push(`Unexpected error importing conversation "${convData.title}": ${error}`)
      }
    }
  }

  // Import prompts
  if (data.prompts) {
    // Get categories for mapping
    const { data: categories } = await supabase.from("prompt_categories").select("*")
    const categoryMap = new Map(categories?.map((cat) => [cat.name.toLowerCase(), cat.id]) || [])

    for (const promptData of data.prompts) {
      try {
        const categoryId = promptData.category ? categoryMap.get(promptData.category.toLowerCase()) : undefined

        const { error: promptError } = await supabase.from("prompts").insert({
          user_id: userId,
          title: promptData.title,
          content: promptData.content,
          description: promptData.description,
          category_id: categoryId,
          tags: promptData.tags || [],
          is_public: false,
        })

        if (promptError) {
          errors.push(`Failed to import prompt "${promptData.title}": ${promptError.message}`)
          continue
        }

        promptsImported++
      } catch (error) {
        errors.push(`Unexpected error importing prompt "${promptData.title}": ${error}`)
      }
    }
  }

  return {
    conversations: conversationsImported,
    prompts: promptsImported,
    errors,
  }
}

export function generateCursorSnippet(prompt: Prompt): string {
  const snippet = `// ChatPrompt Manager - ${prompt.title}
// ${prompt.description || "No description"}
// Tags: ${prompt.tags.join(", ")}
// Usage: ${prompt.usage_count} times

/*
${prompt.content}
*/`

  return snippet
}

export function generateCursorWorkspaceConfig(prompts: Prompt[]): object {
  return {
    "chatprompt.prompts": prompts.map((prompt) => ({
      id: prompt.id,
      title: prompt.title,
      description: prompt.description,
      content: prompt.content,
      tags: prompt.tags,
      category: prompt.category?.name,
      keybinding: `ctrl+shift+p ${prompt.title.toLowerCase().replace(/\s+/g, "-")}`,
    })),
    "chatprompt.autoComplete": {
      enabled: true,
      triggerCharacters: ["@", "#"],
    },
    "chatprompt.integration": {
      apiEndpoint: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      syncEnabled: true,
    },
  }
}

export async function syncWithCursor(userId: string): Promise<{
  success: boolean
  message: string
  data?: any
}> {
  try {
    const exportData = await exportToCursor(userId)
    const workspaceConfig = generateCursorWorkspaceConfig(exportData.prompts.map((p) => p as any))

    return {
      success: true,
      message: "Sync data prepared successfully",
      data: {
        export: exportData,
        config: workspaceConfig,
      },
    }
  } catch (error) {
    return {
      success: false,
      message: `Sync failed: ${error}`,
    }
  }
}
