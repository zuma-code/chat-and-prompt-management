"use client"

import { useEffect, useState } from "react"
import { StatsCard } from "@/components/dashboard/stats-card"
import { RecentConversations } from "@/components/dashboard/recent-conversations"
import { PopularPrompts } from "@/components/dashboard/popular-prompts"
import { useAuth } from "@/components/auth/auth-provider"
import { getDashboardStats } from "@/lib/api"
import type { DashboardStats } from "@/lib/types"
import { MessageSquare, BookOpen, TrendingUp, Activity, Calendar, Zap } from "lucide-react"

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      getDashboardStats(user.id)
        .then(setStats)
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [user])

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <div className="h-8 bg-muted rounded w-64 mb-2 animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-96 animate-pulse"></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-foreground">
          Welcome back, {user?.full_name || user?.email?.split("@")[0]}
        </h1>
        <p className="text-muted-foreground">
          Here's an overview of your AI conversation and prompt management activity.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-8">
        <StatsCard
          title="Total Conversations"
          value={stats?.total_conversations || 0}
          description="All your conversations"
          icon={MessageSquare}
        />
        <StatsCard
          title="Active Conversations"
          value={stats?.active_conversations || 0}
          description="Currently active"
          icon={Activity}
        />
        <StatsCard
          title="Available Prompts"
          value={stats?.total_prompts || 0}
          description="Your prompts + public"
          icon={BookOpen}
        />
        <StatsCard
          title="Total Messages"
          value={stats?.total_messages || 0}
          description="Across all conversations"
          icon={TrendingUp}
        />
        <StatsCard
          title="Prompts Used Today"
          value={stats?.prompts_used_today || 0}
          description="Today's usage"
          icon={Zap}
        />
        <StatsCard
          title="New This Week"
          value={stats?.conversations_created_this_week || 0}
          description="Conversations created"
          icon={Calendar}
        />
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <RecentConversations />
        <PopularPrompts />
      </div>
    </div>
  )
}
