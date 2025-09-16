"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { PromptForm } from "@/components/prompts/prompt-form"
import { getPrompt } from "@/lib/prompts"
import { useAuth } from "@/components/auth/auth-provider"
import type { Prompt } from "@/lib/types"

export default function EditPromptPage() {
  const [prompt, setPrompt] = useState<Prompt | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const params = useParams()
  const router = useRouter()
  const promptId = params.id as string

  useEffect(() => {
    const loadPrompt = async () => {
      if (!user) return

      try {
        const data = await getPrompt(promptId, user.id)
        if (!data || data.user_id !== user.id) {
          router.push("/dashboard/prompts")
          return
        }
        setPrompt(data)
      } catch (error) {
        console.error("Error loading prompt:", error)
        router.push("/dashboard/prompts")
      } finally {
        setLoading(false)
      }
    }

    loadPrompt()
  }, [user, promptId])

  const handleSave = (updatedPrompt: Prompt) => {
    router.push(`/dashboard/prompts/${updatedPrompt.id}`)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-8"></div>
            <div className="space-y-4">
              <div className="h-10 bg-muted rounded"></div>
              <div className="h-20 bg-muted rounded"></div>
              <div className="h-40 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!prompt) {
    return null
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <PromptForm prompt={prompt} onSave={handleSave} />
      </div>
    </div>
  )
}
