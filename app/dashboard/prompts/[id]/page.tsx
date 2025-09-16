"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ArrowLeft, MoreHorizontal, Edit, Copy, Trash2, TrendingUp, Globe, Lock, User } from "lucide-react"
import { getPrompt, deletePrompt } from "@/lib/prompts"
import { useAuth } from "@/components/auth/auth-provider"
import type { Prompt } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"

export default function PromptPage() {
  const [prompt, setPrompt] = useState<Prompt | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const params = useParams()
  const router = useRouter()
  const promptId = params.id as string
  const { usePrompt } = useAuth() // Use usePrompt hook at top level

  const loadPrompt = async () => {
    if (!user) return

    try {
      const data = await getPrompt(promptId, user.id)
      if (!data) {
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

  useEffect(() => {
    loadPrompt()
  }, [user, promptId])

  const handleCopyPrompt = async () => {
    if (!prompt) return

    try {
      await navigator.clipboard.writeText(prompt.content)
      usePrompt(prompt.id, user!.id) // Call usePrompt hook here
      loadPrompt() // Refresh to update usage count
    } catch (error) {
      console.error("Error copying prompt:", error)
    }
  }

  const handleDelete = async () => {
    if (!prompt || !user) return
    if (!confirm("Are you sure you want to delete this prompt?")) return

    try {
      await deletePrompt(prompt.id, user.id)
      router.push("/dashboard/prompts")
    } catch (error) {
      console.error("Error deleting prompt:", error)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-muted rounded w-1/2 mb-8"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  if (!prompt) {
    return null
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-heading font-bold">{prompt.title}</h1>
            {prompt.description && <p className="text-muted-foreground">{prompt.description}</p>}
            <div className="flex items-center gap-2 mt-2">
              {prompt.category && (
                <Badge variant="outline" style={{ borderColor: prompt.category.color, color: prompt.category.color }}>
                  {prompt.category.name}
                </Badge>
              )}
              <Badge variant={prompt.is_public ? "default" : "secondary"}>
                {prompt.is_public ? (
                  <>
                    <Globe className="mr-1 h-3 w-3" />
                    Public
                  </>
                ) : (
                  <>
                    <Lock className="mr-1 h-3 w-3" />
                    Private
                  </>
                )}
              </Badge>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                {prompt.usage_count} uses
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleCopyPrompt}>
            <Copy className="mr-2 h-4 w-4" />
            Copy & Use
          </Button>
          {prompt.user_id === user?.id && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/dashboard/prompts/${prompt.id}/edit`)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Prompt Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-4">
                <pre className="whitespace-pre-wrap font-mono text-sm">{prompt.content}</pre>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="text-sm">{formatDistanceToNow(new Date(prompt.created_at))} ago</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                <p className="text-sm">{formatDistanceToNow(new Date(prompt.updated_at))} ago</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Usage Count</p>
                <p className="text-sm">{prompt.usage_count} times</p>
              </div>
              {prompt.user_id !== user?.id && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Author</p>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-3 w-3" />
                    Public Template
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          {prompt.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {prompt.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
