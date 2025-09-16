import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { exportToCursor, syncWithCursor } from "@/lib/cursor-integration"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")
  const action = searchParams.get("action") || "export"

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 })
  }

  try {
    switch (action) {
      case "export":
        const exportData = await exportToCursor(userId)
        return NextResponse.json(exportData)

      case "sync":
        const syncResult = await syncWithCursor(userId)
        return NextResponse.json(syncResult)

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Cursor API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, action, data } = body

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {
            // Not needed for server-side operations
          },
          remove() {
            // Not needed for server-side operations
          },
        },
      },
    )

    switch (action) {
      case "get_prompts":
        const { data: prompts, error } = await supabase
          .from("prompts")
          .select(
            `
            *,
            category:prompt_categories(*)
          `,
          )
          .or(`user_id.eq.${userId},is_public.eq.true`)
          .order("usage_count", { ascending: false })

        if (error) throw error

        return NextResponse.json({
          prompts: prompts?.map((prompt) => ({
            id: prompt.id,
            title: prompt.title,
            content: prompt.content,
            description: prompt.description,
            tags: prompt.tags,
            category: prompt.category?.name,
            usage_count: prompt.usage_count,
          })),
        })

      case "record_usage":
        const { promptId } = data
        if (!promptId) {
          return NextResponse.json({ error: "Prompt ID is required" }, { status: 400 })
        }

        // Record usage
        await supabase.from("prompt_usage").insert({
          prompt_id: promptId,
          user_id: userId,
        })

        // Increment usage count
        await supabase.rpc("increment_prompt_usage", { prompt_id: promptId })

        return NextResponse.json({ success: true })

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Cursor API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
