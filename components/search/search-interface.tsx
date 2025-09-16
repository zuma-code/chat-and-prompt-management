"use client"

import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Search,
  Filter,
  CalendarIcon,
  MessageSquare,
  BookOpen,
  MessageCircle,
  X,
  Clock,
  TrendingUp,
  Globe,
  Lock,
} from "lucide-react"
import { performAdvancedSearch, getSearchSuggestions } from "@/lib/search"
import { getPromptCategories } from "@/lib/prompts"
import { useAuth } from "@/components/auth/auth-provider"
import type { SearchFilters, SearchResult, PromptCategory } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"
import { format } from "date-fns"
import Link from "next/link"

export function SearchInterface() {
  const [query, setQuery] = useState("")
  const [filters, setFilters] = useState<SearchFilters>({})
  const [results, setResults] = useState<SearchResult[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [categories, setCategories] = useState<PromptCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [total, setTotal] = useState(0)
  const { user } = useAuth()

  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string, searchFilters: SearchFilters) => {
      if (!user) return

      setLoading(true)
      try {
        const response = await performAdvancedSearch(user.id, { ...searchFilters, query: searchQuery })
        setResults(response.results)
        setTotal(response.total)
      } catch (error) {
        console.error("Search error:", error)
      } finally {
        setLoading(false)
      }
    }, 300),
    [user],
  )

  const debouncedSuggestions = useCallback(
    debounce(async (searchQuery: string) => {
      if (!user || searchQuery.length < 2) {
        setSuggestions([])
        return
      }

      try {
        const suggestions = await getSearchSuggestions(user.id, searchQuery)
        setSuggestions(suggestions)
      } catch (error) {
        console.error("Suggestions error:", error)
      }
    }, 200),
    [user],
  )

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

  useEffect(() => {
    if (query || Object.keys(filters).length > 0) {
      debouncedSearch(query, filters)
    } else {
      setResults([])
      setTotal(0)
    }
  }, [query, filters, debouncedSearch])

  useEffect(() => {
    debouncedSuggestions(query)
  }, [query, debouncedSuggestions])

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({})
    setQuery("")
  }

  const getResultIcon = (type: string) => {
    switch (type) {
      case "conversation":
        return <MessageSquare className="h-4 w-4" />
      case "prompt":
        return <BookOpen className="h-4 w-4" />
      case "message":
        return <MessageCircle className="h-4 w-4" />
      default:
        return <Search className="h-4 w-4" />
    }
  }

  const getResultLink = (result: SearchResult) => {
    switch (result.type) {
      case "conversation":
        return `/dashboard/conversations/${result.id}`
      case "prompt":
        return `/dashboard/prompts/${result.id}`
      case "message":
        return `/dashboard/conversations/${result.metadata.conversation_id}`
      default:
        return "#"
    }
  }

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold">Advanced Search</h1>
        <p className="text-muted-foreground">Search across all your conversations, prompts, and messages</p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search conversations, prompts, and messages..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-4 py-3 text-lg"
        />
        {suggestions.length > 0 && query.length > 1 && (
          <div className="absolute top-full left-0 right-0 bg-popover border border-border rounded-md shadow-lg z-10 mt-1">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                className="w-full text-left px-4 py-2 hover:bg-muted transition-colors"
                onClick={() => {
                  setQuery(suggestion)
                  setSuggestions([])
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
        {Object.keys(filters).length > 0 && (
          <Button variant="ghost" onClick={clearFilters}>
            <X className="mr-2 h-4 w-4" />
            Clear Filters
          </Button>
        )}
        {total > 0 && <span className="text-sm text-muted-foreground">{total} results found</span>}
      </div>

      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Search Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Content Type */}
              <div className="space-y-2">
                <Label>Content Type</Label>
                <Select value={filters.type || "all"} onValueChange={(value) => handleFilterChange("type", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="conversations">Conversations</SelectItem>
                    <SelectItem value="prompts">Prompts</SelectItem>
                    <SelectItem value="messages">Messages</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort By */}
              <div className="space-y-2">
                <Label>Sort By</Label>
                <Select
                  value={filters.sortBy || "relevance"}
                  onValueChange={(value) => handleFilterChange("sortBy", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevance</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="usage">Usage</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label>Date Range</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start bg-transparent">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange
                        ? `${format(filters.dateRange.from, "MMM dd")} - ${format(filters.dateRange.to, "MMM dd")}`
                        : "Select dates"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={
                        filters.dateRange ? { from: filters.dateRange.from, to: filters.dateRange.to } : undefined
                      }
                      onSelect={(range) =>
                        handleFilterChange("dateRange", range ? { from: range.from!, to: range.to! } : undefined)
                      }
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Visibility (for prompts) */}
              <div className="space-y-2">
                <Label>Visibility</Label>
                <Select
                  value={filters.visibility || "all"}
                  onValueChange={(value) => handleFilterChange("visibility", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="public">Public Only</SelectItem>
                    <SelectItem value="private">Private Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Categories */}
            {categories.length > 0 && (
              <div className="space-y-2">
                <Label>Categories</Label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={category.id}
                        checked={filters.categories?.includes(category.id) || false}
                        onCheckedChange={(checked) => {
                          const current = filters.categories || []
                          if (checked) {
                            handleFilterChange("categories", [...current, category.id])
                          } else {
                            handleFilterChange(
                              "categories",
                              current.filter((id) => id !== category.id),
                            )
                          }
                        }}
                      />
                      <Label htmlFor={category.id} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }}></div>
                        {category.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
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
        ) : results.length === 0 && (query || Object.keys(filters).length > 0) ? (
          <div className="text-center py-12">
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No results found</h3>
            <p className="text-muted-foreground">Try adjusting your search terms or filters</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">Start searching</h3>
            <p className="text-muted-foreground">Enter a search term to find conversations, prompts, and messages</p>
          </div>
        ) : (
          results.map((result) => (
            <Link key={`${result.type}-${result.id}`} href={getResultLink(result)}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-muted">{getResultIcon(result.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">{result.title}</h3>
                        <Badge variant="outline" className="text-xs">
                          {result.type}
                        </Badge>
                        {result.type === "prompt" && (
                          <Badge variant={result.metadata.is_public ? "default" : "secondary"} className="text-xs">
                            {result.metadata.is_public ? (
                              <>
                                <Globe className="mr-1 h-2 w-2" />
                                Public
                              </>
                            ) : (
                              <>
                                <Lock className="mr-1 h-2 w-2" />
                                Private
                              </>
                            )}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{result.excerpt}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(result.updated_at))} ago
                        </div>
                        {result.metadata.usage_count !== undefined && (
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {result.metadata.usage_count} uses
                          </div>
                        )}
                        {result.metadata.category && (
                          <Badge
                            variant="outline"
                            style={{
                              borderColor: result.metadata.category.color,
                              color: result.metadata.category.color,
                            }}
                            className="text-xs"
                          >
                            {result.metadata.category.name}
                          </Badge>
                        )}
                      </div>
                      {result.metadata.tags && result.metadata.tags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {result.metadata.tags.slice(0, 3).map((tag: string) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {result.metadata.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{result.metadata.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}

// Utility function for debouncing
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout
  return ((...args: any[]) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }) as T
}
