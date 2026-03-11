'use client'

import Image from "next/image"
import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Copy, Loader2, RefreshCcw } from "lucide-react"
import { SystemUser } from "@/types/facebook"
import { facebookService } from "@/services/facebook.service"

export default function SystemUserManager() {
  const [tokenInput, setTokenInput] = useState("")
  const [previewUser, setPreviewUser] = useState<SystemUser | null>(null)
  const [savedUsers, setSavedUsers] = useState<SystemUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [isCrawling, setIsCrawling] = useState(false)
  const [saving, setSaving] = useState(false)
  const [refreshingUserId, setRefreshingUserId] = useState<string | null>(null)
  const [lastCrawledToken, setLastCrawledToken] = useState("")
  const [status, setStatus] = useState("Input token to start crawling")

  const loadSavedUsers = async () => {
    try {
      setLoadingUsers(true)
      const res = await fetch("/api/database/systemUsers")
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to load system users")
      }

      setSavedUsers((data.data ?? []) as SystemUser[])
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error"
      toast.error(message)
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    void loadSavedUsers()
  }, [])

  const crawlUser = async (token: string) => {
    try {
      const fbUser = await facebookService.getMe(token)
      setPreviewUser({
        id: fbUser.id,
        name: fbUser.name,
        token,
      })
      setLastCrawledToken(token)
      setStatus("Crawl success. Review data and click Save.")
    } catch (error: unknown) {
      setPreviewUser(null)
      const message = error instanceof Error ? error.message : "Unknown error"
      toast.error(message)
      setStatus("Crawl failed. Check token and try again.")
    } finally {
      setIsCrawling(false)
    }
  }

  useEffect(() => {
    const token = tokenInput.trim()

    if (!token) {
      setPreviewUser(null)
      setIsCrawling(false)
      setStatus("Input token to start crawling")
      return
    }

    setIsCrawling(true)
    setStatus("Crawling user information...")

    const timeout = setTimeout(() => {
      void crawlUser(token)
    }, 3000)

    return () => clearTimeout(timeout)
  }, [tokenInput])

  const handleSave = async () => {
    const token = tokenInput.trim()
    if (!token || !previewUser || token !== lastCrawledToken) {
      toast.error("Please wait for crawl result before saving")
      return
    }

    try {
      setSaving(true)
      const res = await fetch("/api/database/systemUsers/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to save system user")
      }

      setPreviewUser((prev) =>
        prev
          ? {
              ...prev,
              createdAt: data?.data?.createdAt ?? prev.createdAt,
              updatedAt: data?.data?.updatedAt ?? prev.updatedAt,
            }
          : prev
      )
      toast.success("System user saved")
      setStatus("Saved successfully")
      await loadSavedUsers()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error"
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Copied")
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error"
      toast.error(message)
    }
  }

  const handleRecrawlAndSave = async (user: SystemUser) => {
    if (!user.token) {
      toast.error("Missing token for this system user")
      return
    }

    try {
      setRefreshingUserId(user.id)
      const res = await fetch("/api/database/systemUsers/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: user.token }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to recrawl system user")
      }

      toast.success("Recrawled and saved")
      await loadSavedUsers()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error"
      toast.error(message)
    } finally {
      setRefreshingUserId(null)
    }
  }

  const formatDate = (value?: string | Date) => {
    if (!value) return "-"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return "-"
    return new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(date)
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <Card className="relative rounded-2xl border-slate-200 bg-white shadow-lg">
        <div className="pointer-events-none absolute right-6 top-6 rounded-xl border border-slate-200 bg-white/90 p-2.5 shadow-sm">
          <Image src="/icon.png" alt="App icon" width={40} height={40} />
        </div>
        <CardContent className="p-8 space-y-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              System User Manager
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">Save System User</h2>
            <p className="text-sm text-slate-600">{status}</p>
          </div>

          <div className="flex items-center gap-3">
            <Input
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Paste access token"
            />
            <Button
              onClick={handleSave}
              disabled={isCrawling || saving || !previewUser}
              className={`min-w-28 cursor-pointer border border-slate-300 shadow-sm transition-colors duration-200 ${
                isCrawling || saving || !previewUser
                  ? "bg-white text-slate-400 hover:bg-white"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {isCrawling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Crawling...
                </>
              ) : saving ? "Saving..." : "Save"}
            </Button>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold tracking-tight">Preview</h3>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left font-semibold">
                    <th className="p-3">System User ID</th>
                    <th className="p-3">Name</th>
                  </tr>
                </thead>
                <tbody>
                  {previewUser && (
                    <tr key={previewUser.id} className="border-t hover:bg-slate-50/60">
                      <td className="p-3 font-mono">{previewUser.id}</td>
                      <td className="p-3">{previewUser.name}</td>
                    </tr>
                  )}
                  {!previewUser && (
                    <tr className="border-t">
                      <td className="p-3 text-slate-500" colSpan={2}>
                        No crawled user yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold tracking-tight">System Users</h3>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left font-semibold">
                    <th className="p-3">System User ID</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Created At</th>
                    <th className="p-3">Updated At</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {savedUsers.map((user) => (
                    <tr key={user.id} className="border-t hover:bg-slate-50/60">
                      <td className="p-3 font-mono">{user.id}</td>
                      <td className="p-3">{user.name}</td>
                      <td className="p-3">{formatDate(user.createdAt)}</td>
                      <td className="p-3">{formatDate(user.updatedAt)}</td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => copy(user.id)}
                            className="cursor-pointer border-slate-300 bg-white hover:bg-slate-50"
                            title="Copy system user id"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => handleRecrawlAndSave(user)}
                            disabled={refreshingUserId === user.id}
                            className="cursor-pointer border-slate-300 bg-white hover:bg-slate-50"
                            title="Recrawl and save"
                          >
                            {refreshingUserId === user.id ? (
                              <RefreshCcw className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCcw className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loadingUsers && savedUsers.length === 0 && (
                    <tr className="border-t">
                      <td className="p-3 text-slate-500" colSpan={5}>
                        No saved system users.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
