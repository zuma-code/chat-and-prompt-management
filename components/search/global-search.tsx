"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, MessageSquare, BookOpen, MessageCircle } from "lucide-react"
import { performAdvancedSearch, getSearchSuggestions } from "@/lib/search"
import { useAuth } from "@/components/auth/auth-provider"
import type { SearchResult } from "@/lib/types"

export function GlobalSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const router = useRouter()
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (!user || !query.trim()) {
        setResults([])
        setSuggestions([])
        return
      }

      if (query.length < 2) {
        setResults([])
        return
      }

      setLoading(true)
      try {
        const [searchResponse, searchSuggestions] = await Promise.all([
          performAdvancedSearch(user.id, { query }, 5),
          getSearchSuggestions(user.id, query),
        ])

        setResults(searchResponse.results)
        setSuggestions(searchSuggestions)
      } catch (error) {
        console.error("Search error:", error)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(searchTimeout)
  }, [query, user])

  const handleResultClick = (result: SearchResult) => {
    setIsOpen(false)
    setQuery("")

    switch (result.type) {
      case "conversation":
        router.push(`/dashboard/conversations/${result.id}`)
        break
      case "prompt":
        router.push(`/dashboard/prompts/${result.id}`)
        break
      case "message":
        router.push(`/dashboard/conversations/${result.metadata.conversation_id}`)
        break
    }
  }

  const handleAdvancedSearch = () => {
    setIsOpen(false)
    router.push(`/dashboard/search?q=${encodeURIComponent(query)}`)
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

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search everything..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="pl-10"
        />
      </div>

      {isOpen && (query.length > 0 || suggestions.length > 0 || results.length > 0) && (
        <div className="absolute top-full left-0 right-0 bg-popover border border-border rounded-md shadow-lg z-50 mt-1 max-h-96 overflow-y-auto">
          {loading && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <Search className="h-4 w-4 animate-spin mx-auto mb-2" />
              Searching...
            </div>
          )}

          {!loading && suggestions.length > 0 && results.length === 0 && (
            <div className="p-2">
              <div className="text-xs font-medium text-muted-foreground px-2 py-1">Suggestions</div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  className="w-full text-left px-3 py-2 hover:bg-muted transition-colors rounded-sm"
                  onClick={() => {
                    setQuery(suggestion)
                    setIsOpen(false)
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Search className="h-3 w-3 text-muted-foreground" />
                    {suggestion}
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="p-2">
              <div className="text-xs font-medium text-muted-foreground px-2 py-1">Results</div>
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  className="w-full text-left px-3 py-2 hover:bg-muted transition-colors rounded-sm"
                  onClick={() => handleResultClick(result)}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">{getResultIcon(result.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{result.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {result.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{result.excerpt}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loading && query.length > 0 && (
            <div className="border-t border-border p-2">
              <Button variant="ghost" size="sm" onClick={handleAdvancedSearch} className="w-full justify-start">
                <Search className="mr-2 h-4 w-4" />
                Advanced search for "{query}"
              </Button>
            </div>
          )}

          {!loading && query.length > 0 && results.length === 0 && suggestions.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">No results found</div>
          )}
        </div>
      )}
    </div>
  )
}
