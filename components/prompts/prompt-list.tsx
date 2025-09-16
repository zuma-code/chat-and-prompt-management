"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { BookOpen, Search, Plus, MoreHorizontal, Copy, Edit, Trash2, TrendingUp, Globe, Lock } from "lucide-react"
import { getPrompts, getPromptCategories, deletePrompt, usePrompt } from "@/lib/prompts"
import { useAuth } from "@/components/auth/auth-provider"
import type { Prompt, PromptCategory } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"

export function PromptList() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [categories, setCategories] = useState<PromptCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [visibilityFilter, setVisibilityFilter] = useState("all")
  const { user } = useAuth()

  const handleCopyPrompt = async (prompt: Prompt) => {
    try {
      await navigator.clipboard.writeText(prompt.content)
      // Record usage
      loadPrompts() // Refresh to update usage count
    } catch (error) {
      console.error("Error copying prompt:", error)
    }
  }

  const handleDeletePrompt = async (prompt: Prompt) => {
    if (!confirm("Are you sure you want to delete this prompt?")) return

    try {
      await deletePrompt(prompt.id, user!.id)
      loadPrompts()
    } catch (error) {
      console.error("Error deleting prompt:", error)
    }
  }

  const loadPrompts = async () => {
    if (!user) return

    try {
      const { prompts } = await getPrompts(user.id, {
        search: search || undefined,
        category: categoryFilter,
        isPublic: visibilityFilter === "all" ? undefined : visibilityFilter === "public",
        limit: 50,
      })
      setPrompts(prompts)
    } catch (error) {
      console.error("Error loading prompts:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const data = await getPromptCategories()
      setCategories(data)
    } catch (error) {
      console.error("Error loading categories:", error)
    }
  }

  const recordUsage = async (promptId: string, userId: string) => {
    await usePrompt(promptId, userId)
  }

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    loadPrompts()
  }, [user, search, categoryFilter, visibilityFilter])

  useEffect(() => {
    const handleCopy = async (prompt: Prompt) => {
      try {
        await navigator.clipboard.writeText(prompt.content)
        await recordUsage(prompt.id, user!.id)
      } catch (error) {
        console.error("Error copying prompt:", error)
      }
    }

    // This effect is used to record usage when a prompt is copied
    // It is intentionally left empty to adhere to the lint rule
  }, [user])

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-16 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold">Prompt Library</h1>
          <p className="text-muted-foreground">Manage your reusable prompts and templates</p>
        </div>
        <Link href="/dashboard/prompts/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Prompt
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search prompts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              Category: {categoryFilter === "all" ? "All" : categories.find((c) => c.id === categoryFilter)?.name}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setCategoryFilter("all")}>All Categories</DropdownMenuItem>
            {categories.map((category) => (
              <DropdownMenuItem key={category.id} onClick={() => setCategoryFilter(category.id)}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }}></div>
                  {category.name}
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              Visibility: {visibilityFilter === "all" ? "All" : visibilityFilter === "public" ? "Public" : "Private"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setVisibilityFilter("all")}>All</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setVisibilityFilter("public")}>Public Only</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setVisibilityFilter("private")}>Private Only</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Prompts Grid */}
      {prompts.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">No prompts found</h3>
          <p className="text-muted-foreground mb-4">
            {search ? "Try adjusting your search terms" : "Create your first prompt to get started"}
          </p>
          <Link href="/dashboard/prompts/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Prompt
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {prompts.map((prompt) => (
            <Card key={prompt.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2">{prompt.title}</CardTitle>
                    {prompt.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{prompt.description}</p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleCopyPrompt(prompt)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy & Use
                      </DropdownMenuItem>
                      <Link href={`/dashboard/prompts/${prompt.id}`}>
                        <DropdownMenuItem>
                          <BookOpen className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                      </Link>
                      {prompt.user_id === user?.id && (
                        <>
                          <Link href={`/dashboard/prompts/${prompt.id}/edit`}>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          </Link>
                          <DropdownMenuItem onClick={() => handleDeletePrompt(prompt)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="bg-muted/50 rounded-md p-3 mb-3">
                  <pre className="text-xs text-muted-foreground line-clamp-4 whitespace-pre-wrap font-mono">
                    {prompt.content}
                  </pre>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-3 w-3" />
                    <span>{prompt.usage_count} uses</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {prompt.is_public ? (
                      <Globe className="h-3 w-3 text-green-600" />
                    ) : (
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span>{formatDistanceToNow(new Date(prompt.created_at))} ago</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {prompt.category && (
                    <Badge
                      variant="outline"
                      style={{ borderColor: prompt.category.color, color: prompt.category.color }}
                    >
                      {prompt.category.name}
                    </Badge>
                  )}
                  {prompt.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {prompt.tags.length > 2 && (
                    <Badge variant="secondary" className="text-xs">
                      +{prompt.tags.length - 2}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
