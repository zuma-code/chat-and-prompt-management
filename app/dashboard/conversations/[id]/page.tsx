"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MessageList } from "@/components/conversations/message-list"
import { ConversationForm } from "@/components/conversations/conversation-form"
import { ArrowLeft, MoreHorizontal, Edit, Pin, Archive, Trash2 } from "lucide-react"
import { getConversation, updateConversation, deleteConversation } from "@/lib/conversations"
import { useAuth } from "@/components/auth/auth-provider"
import type { Conversation } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"

export default function ConversationPage() {
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const { user } = useAuth()
  const params = useParams()
  const router = useRouter()
  const conversationId = params.id as string

  const loadConversation = async () => {
    if (!user) return

    try {
      const data = await getConversation(conversationId, user.id)
      if (!data) {
        router.push("/dashboard/conversations")
        return
      }
      setConversation(data)
    } catch (error) {
      console.error("Error loading conversation:", error)
      router.push("/dashboard/conversations")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConversation()
  }, [user, conversationId])

  const handlePin = async () => {
    if (!conversation || !user) return

    try {
      const updated = await updateConversation(conversation.id, user.id, {
        is_pinned: !conversation.is_pinned,
      })
      setConversation(updated)
    } catch (error) {
      console.error("Error pinning conversation:", error)
    }
  }

  const handleArchive = async () => {
    if (!conversation || !user) return

    try {
      const updated = await updateConversation(conversation.id, user.id, {
        status: conversation.status === "archived" ? "active" : "archived",
      })
      setConversation(updated)
    } catch (error) {
      console.error("Error archiving conversation:", error)
    }
  }

  const handleDelete = async () => {
    if (!conversation || !user) return
    if (!confirm("Are you sure you want to delete this conversation?")) return

    try {
      await deleteConversation(conversation.id, user.id)
      router.push("/dashboard/conversations")
    } catch (error) {
      console.error("Error deleting conversation:", error)
    }
  }

  const handleSave = (updatedConversation: Conversation) => {
    setConversation(updatedConversation)
    setEditing(false)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-muted rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!conversation) {
    return null
  }

  if (editing) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <ConversationForm conversation={conversation} onSave={handleSave} />
        </div>
      </div>
    )
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
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-heading font-bold">{conversation.title}</h1>
              {conversation.is_pinned && <Pin className="h-5 w-5 text-primary" />}
            </div>
            {conversation.description && <p className="text-muted-foreground">{conversation.description}</p>}
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={conversation.status === "active" ? "default" : "secondary"}>{conversation.status}</Badge>
              <span className="text-sm text-muted-foreground">
                Updated {formatDistanceToNow(new Date(conversation.updated_at))} ago
              </span>
            </div>
            {conversation.tags.length > 0 && (
              <div className="flex gap-1 mt-2">
                {conversation.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditing(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handlePin}>
              <Pin className="mr-2 h-4 w-4" />
              {conversation.is_pinned ? "Unpin" : "Pin"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleArchive}>
              <Archive className="mr-2 h-4 w-4" />
              {conversation.status === "archived" ? "Unarchive" : "Archive"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <MessageList conversationId={conversation.id} />
    </div>
  )
}
