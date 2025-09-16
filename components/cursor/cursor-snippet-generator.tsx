"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Copy, Code, Download } from "lucide-react"
import { getPrompts } from "@/lib/prompts"
import { generateCursorSnippet } from "@/lib/cursor-integration"
import { useAuth } from "@/components/auth/auth-provider"
import type { Prompt } from "@/lib/types"

export function CursorSnippetGenerator() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [selectedPrompt, setSelectedPrompt] = useState<string>("")
  const [snippet, setSnippet] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    const loadPrompts = async () => {
      if (!user) return

      try {
        const { prompts } = await getPrompts(user.id, { limit: 100 })
        setPrompts(prompts)
      } catch (error) {
        console.error("Error loading prompts:", error)
      } finally {
        setLoading(false)
      }
    }

    loadPrompts()
  }, [user])

  useEffect(() => {
    if (selectedPrompt) {
      const prompt = prompts.find((p) => p.id === selectedPrompt)
      if (prompt) {
        const generatedSnippet = generateCursorSnippet(prompt)
        setSnippet(generatedSnippet)
      }
    } else {
      setSnippet("")
    }
  }, [selectedPrompt, prompts])

  const copySnippet = () => {
    navigator.clipboard.writeText(snippet)
  }

  const downloadSnippet = () => {
    const prompt = prompts.find((p) => p.id === selectedPrompt)
    if (!prompt) return

    const blob = new Blob([snippet], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${prompt.title.toLowerCase().replace(/\s+/g, "-")}.cursor-snippet`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-1/3 mb-4"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code className="h-5 w-5" />
          Cursor Snippet Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Prompt</label>
          <Select value={selectedPrompt} onValueChange={setSelectedPrompt}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a prompt to generate snippet" />
            </SelectTrigger>
            <SelectContent>
              {prompts.map((prompt) => (
                <SelectItem key={prompt.id} value={prompt.id}>
                  <div className="flex items-center gap-2">
                    <span>{prompt.title}</span>
                    {prompt.category && (
                      <Badge
                        variant="outline"
                        style={{ borderColor: prompt.category.color, color: prompt.category.color }}
                      >
                        {prompt.category.name}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {snippet && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Generated Snippet</label>
            <div className="relative">
              <Textarea value={snippet} readOnly rows={12} className="font-mono text-xs" />
              <div className="absolute top-2 right-2 flex gap-2">
                <Button size="sm" variant="outline" onClick={copySnippet}>
                  <Copy className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={downloadSnippet}>
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Copy this snippet and paste it into your Cursor snippets configuration, or download as a file.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
