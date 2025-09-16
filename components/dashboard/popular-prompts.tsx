"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BookOpen, TrendingUp } from "lucide-react"
import { getPopularPrompts } from "@/lib/api"
import { useAuth } from "@/components/auth/auth-provider"
import type { Prompt } from "@/lib/types"

export function PopularPrompts() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      getPopularPrompts(user.id)
        .then(setPrompts)
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [user])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Popular Prompts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Popular Prompts</CardTitle>
        <Link href="/dashboard/prompts">
          <Button variant="outline" size="sm">
            View All
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {prompts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No prompts yet</p>
            <p className="text-sm">Create your first prompt to see it here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {prompts.map((prompt) => (
              <Link key={prompt.id} href={`/dashboard/prompts/${prompt.id}`}>
                <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <BookOpen className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{prompt.title}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <TrendingUp className="h-3 w-3" />
                        {prompt.usage_count}
                      </div>
                    </div>
                    {prompt.description && (
                      <p className="text-xs text-muted-foreground truncate">{prompt.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {prompt.category && (
                        <Badge
                          variant="outline"
                          className="text-xs"
                          style={{ borderColor: prompt.category.color, color: prompt.category.color }}
                        >
                          {prompt.category.name}
                        </Badge>
                      )}
                      {prompt.is_public && (
                        <Badge variant="secondary" className="text-xs">
                          Public
                        </Badge>
                      )}
                      {prompt.tags.length > 0 && (
                        <div className="flex gap-1">
                          {prompt.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {prompt.tags.length > 2 && (
                            <span className="text-xs text-muted-foreground">+{prompt.tags.length - 2}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
