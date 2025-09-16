"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { CursorSnippetGenerator } from "./cursor-snippet-generator"
import {
  Download,
  Upload,
  Send as Sync,
  Code,
  FileText,
  Settings,
  CheckCircle,
  AlertCircle,
  Copy,
  ExternalLink,
} from "lucide-react"
import { exportToCursor, importFromCursor, syncWithCursor } from "@/lib/cursor-integration"
import { useAuth } from "@/components/auth/auth-provider"
import type { CursorImportData } from "@/lib/cursor-integration"

export function CursorIntegration() {
  const [exportData, setExportData] = useState<string>("")
  const [importData, setImportData] = useState<string>("")
  const [importResults, setImportResults] = useState<{
    conversations: number
    prompts: number
    errors: string[]
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [syncStatus, setSyncStatus] = useState<{ success: boolean; message: string } | null>(null)
  const { user } = useAuth()

  const handleExport = async () => {
    if (!user) return

    setLoading(true)
    try {
      const data = await exportToCursor(user.id)
      const jsonString = JSON.stringify(data, null, 2)
      setExportData(jsonString)

      // Download file
      const blob = new Blob([jsonString], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `chatprompt-export-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Export error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!user || !importData.trim()) return

    setLoading(true)
    try {
      const data: CursorImportData = JSON.parse(importData)
      const results = await importFromCursor(user.id, data)
      setImportResults(results)
    } catch (error) {
      setImportResults({
        conversations: 0,
        prompts: 0,
        errors: [`Invalid JSON format: ${error}`],
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    if (!user) return

    setLoading(true)
    try {
      const result = await syncWithCursor(user.id)
      setSyncStatus(result)
    } catch (error) {
      setSyncStatus({
        success: false,
        message: `Sync failed: ${error}`,
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold">Cursor Integration</h1>
        <p className="text-muted-foreground">
          Seamlessly integrate your conversations and prompts with Cursor IDE for enhanced development workflow.
        </p>
      </div>

      <Tabs defaultValue="export" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="export">Export Data</TabsTrigger>
          <TabsTrigger value="import">Import Data</TabsTrigger>
          <TabsTrigger value="snippets">Snippets</TabsTrigger>
          <TabsTrigger value="sync">Live Sync</TabsTrigger>
          <TabsTrigger value="setup">Setup Guide</TabsTrigger>
        </TabsList>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export to Cursor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Export all your conversations and prompts in a format compatible with Cursor IDE. This will download a
                JSON file that you can import into Cursor.
              </p>

              <Button onClick={handleExport} disabled={loading} className="w-full">
                {loading ? "Exporting..." : "Export All Data"}
                <Download className="ml-2 h-4 w-4" />
              </Button>

              {exportData && (
                <div className="space-y-2">
                  <Label>Export Preview</Label>
                  <div className="relative">
                    <Textarea
                      value={exportData.substring(0, 500) + (exportData.length > 500 ? "..." : "")}
                      readOnly
                      rows={8}
                      className="font-mono text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2 bg-transparent"
                      onClick={() => copyToClipboard(exportData)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Full export contains {exportData.length} characters. File has been downloaded automatically.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Import from Cursor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Import conversations and prompts from Cursor IDE. Paste the JSON data below or upload a file exported
                from Cursor.
              </p>

              <div className="space-y-2">
                <Label>Import Data (JSON)</Label>
                <Textarea
                  placeholder="Paste your Cursor export JSON here..."
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  rows={8}
                  className="font-mono text-xs"
                />
              </div>

              <Button onClick={handleImport} disabled={loading || !importData.trim()} className="w-full">
                {loading ? "Importing..." : "Import Data"}
                <Upload className="ml-2 h-4 w-4" />
              </Button>

              {importResults && (
                <Alert variant={importResults.errors.length > 0 ? "destructive" : "default"}>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p>
                        Import completed: {importResults.conversations} conversations, {importResults.prompts} prompts
                        imported.
                      </p>
                      {importResults.errors.length > 0 && (
                        <div>
                          <p className="font-medium">Errors:</p>
                          <ul className="list-disc list-inside text-sm">
                            {importResults.errors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Snippets Tab */}
        <TabsContent value="snippets" className="space-y-4">
          <CursorSnippetGenerator />
        </TabsContent>

        {/* Sync Tab */}
        <TabsContent value="sync" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sync className="h-5 w-5" />
                Live Sync with Cursor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enable real-time synchronization between ChatPrompt Manager and Cursor IDE. This allows you to access
                your prompts directly within Cursor.
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>API Endpoint</Label>
                  <Input value={`${window.location.origin}/api/cursor`} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Sync Status</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant={syncStatus?.success ? "default" : "secondary"}>
                      {syncStatus?.success ? "Connected" : "Disconnected"}
                    </Badge>
                  </div>
                </div>
              </div>

              <Button onClick={handleSync} disabled={loading} className="w-full">
                {loading ? "Syncing..." : "Test Sync Connection"}
                <Sync className="ml-2 h-4 w-4" />
              </Button>

              {syncStatus && (
                <Alert variant={syncStatus.success ? "default" : "destructive"}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{syncStatus.message}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Setup Guide Tab */}
        <TabsContent value="setup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Cursor Setup Guide
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">1. Install Cursor Extension</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Install the ChatPrompt Manager extension from the Cursor marketplace.
                  </p>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="mr-2 h-3 w-3" />
                    Open Cursor Marketplace
                  </Button>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">2. Configure API Connection</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Add the following configuration to your Cursor settings:
                  </p>
                  <div className="bg-muted p-3 rounded-md font-mono text-xs">
                    <pre>{`{
  "chatprompt.apiUrl": "${window.location.origin}/api/cursor",
  "chatprompt.userId": "${user?.id}",
  "chatprompt.autoSync": true
}`}</pre>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">3. Available Features</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex items-start gap-3 p-3 border rounded-md">
                      <Code className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <h4 className="font-medium">Prompt Snippets</h4>
                        <p className="text-xs text-muted-foreground">
                          Access your prompts as code snippets with auto-completion
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 border rounded-md">
                      <FileText className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <h4 className="font-medium">Chat History</h4>
                        <p className="text-xs text-muted-foreground">
                          Import and export conversation history seamlessly
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 border rounded-md">
                      <Sync className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <h4 className="font-medium">Real-time Sync</h4>
                        <p className="text-xs text-muted-foreground">
                          Automatic synchronization of prompts and conversations
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 border rounded-md">
                      <Settings className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <h4 className="font-medium">Custom Keybindings</h4>
                        <p className="text-xs text-muted-foreground">
                          Quick access to your most-used prompts with shortcuts
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">4. Usage Tips</h3>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Use @ symbol to trigger prompt auto-completion in Cursor</li>
                    <li>Tag your prompts for better organization and searchability</li>
                    <li>Export conversations regularly to keep your Cursor history updated</li>
                    <li>Use the sync feature to keep your prompts updated across devices</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
