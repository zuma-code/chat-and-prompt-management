"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X } from "lucide-react"
import { createPrompt, updatePrompt, getPromptCategories } from "@/lib/prompts"
import { useAuth } from "@/components/auth/auth-provider"
import type { Prompt, PromptCategory } from "@/lib/types"

interface PromptFormProps {
  prompt?: Prompt
  onSave?: (prompt: Prompt) => void
}

export function PromptForm({ prompt, onSave }: PromptFormProps) {
  const [title, setTitle] = useState(prompt?.title || "")
  const [content, setContent] = useState(prompt?.content || "")
  const [description, setDescription] = useState(prompt?.description || "")
  const [categoryId, setCategoryId] = useState(prompt?.category_id || "none")
  const [tags, setTags] = useState<string[]>(prompt?.tags || [])
  const [newTag, setNewTag] = useState("")
  const [isPublic, setIsPublic] = useState(prompt?.is_public || false)
  const [categories, setCategories] = useState<PromptCategory[]>([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await getPromptCategories()
        setCategories(data)
      } catch (error) {
        console.error("Error loading categories:", error)
      }
    }
    loadCategories()
  }, [])

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !title.trim() || !content.trim()) return

    setLoading(true)
    try {
      let result: Prompt

      if (prompt) {
        result = await updatePrompt(prompt.id, user.id, {
          title: title.trim(),
          content: content.trim(),
          description: description.trim() || undefined,
          category_id: categoryId || undefined,
          tags,
          is_public: isPublic,
        })
      } else {
        result = await createPrompt(user.id, {
          title: title.trim(),
          content: content.trim(),
          description: description.trim() || undefined,
          category_id: categoryId || undefined,
          tags,
          is_public: isPublic,
        })
      }

      if (onSave) {
        onSave(result)
      } else {
        router.push(`/dashboard/prompts/${result.id}`)
      }
    } catch (error) {
      console.error("Error saving prompt:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{prompt ? "Edit Prompt" : "New Prompt"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter prompt title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this prompt does"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Prompt Content *</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter your prompt content here. Use {variable} for placeholders."
              rows={8}
              required
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Tip: Use curly braces like {"{variable}"} for placeholders that can be replaced when using the prompt.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }}></div>
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Visibility</Label>
              <div className="flex items-center space-x-2">
                <Switch id="public" checked={isPublic} onCheckedChange={setIsPublic} />
                <Label htmlFor="public" className="text-sm">
                  Make this prompt public
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">Public prompts can be used by other users</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag"
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              />
              <Button type="button" onClick={addTag} variant="outline">
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading || !title.trim() || !content.trim()}>
              {loading ? "Saving..." : prompt ? "Update Prompt" : "Create Prompt"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
