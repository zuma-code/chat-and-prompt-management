"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MessageSquare, Pin, Archive, Trash2, MoreHorizontal, Search, Plus } from "lucide-react"
import { getConversations, updateConversation, deleteConversation } from "@/lib/conversations"
import { useAuth } from "@/components/auth/auth-provider"
import type { Conversation } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"

export function ConversationList() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const { user } = useAuth()

  const loadConversations = async () => {
    if (!user) return

    try {
      const { conversations } = await getConversations(user.id, {
        search: search || undefined,
        status: statusFilter,
        limit: 50,
      })
      setConversations(conversations)
    } catch (error) {
      console.error("Error loading conversations:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConversations()
  }, [user, search, statusFilter])

  const handlePin = async (conversation: Conversation) => {
    try {
      await updateConversation(conversation.id, user!.id, {
        is_pinned: !conversation.is_pinned,
      })
      loadConversations()
    } catch (error) {
      console.error("Error pinning conversation:", error)
    }
  }

  const handleArchive = async (conversation: Conversation) => {
    try {
      await updateConversation(conversation.id, user!.id, {
        status: conversation.status === "archived" ? "active" : "archived",
      })
      loadConversations()
    } catch (error) {
      console.error("Error archiving conversation:", error)
    }
  }

  const handleDelete = async (conversation: Conversation) => {
    if (!confirm("Are you sure you want to delete this conversation?")) return

    try {
      await deleteConversation(conversation.id, user!.id)
      loadConversations()
    } catch (error) {
      console.error("Error deleting conversation:", error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
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
          <h1 className="text-3xl font-heading font-bold">Conversations</h1>
          <p className="text-muted-foreground">Manage your AI conversations</p>
        </div>
        <Link href="/dashboard/conversations/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Conversation
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Status: {statusFilter === "all" ? "All" : statusFilter}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setStatusFilter("all")}>All</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("active")}>Active</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("archived")}>Archived</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Conversations */}
      {conversations.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">No conversations found</h3>
          <p className="text-muted-foreground mb-4">
            {search ? "Try adjusting your search terms" : "Start your first conversation"}
          </p>
          <Link href="/dashboard/conversations/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Conversation
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {conversations.map((conversation) => (
            <Card key={conversation.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <Link href={`/dashboard/conversations/${conversation.id}`} className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium hover:text-primary transition-colors">{conversation.title}</h3>
                      {conversation.is_pinned && <Pin className="h-4 w-4 text-primary" />}
                    </div>
                    {conversation.description && (
                      <p className="text-sm text-muted-foreground mb-2">{conversation.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant={conversation.status === "active" ? "default" : "secondary"}>
                        {conversation.status}
                      </Badge>
                      <span>Updated {formatDistanceToNow(new Date(conversation.updated_at))} ago</span>
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
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handlePin(conversation)}>
                        <Pin className="mr-2 h-4 w-4" />
                        {conversation.is_pinned ? "Unpin" : "Pin"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleArchive(conversation)}>
                        <Archive className="mr-2 h-4 w-4" />
                        {conversation.status === "archived" ? "Unarchive" : "Archive"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(conversation)} className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
