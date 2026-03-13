'use client'

import Image from "next/image"
import { useCallback, useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Copy, Loader2, RefreshCcw, Trash2 } from "lucide-react"
import { SystemUser } from "@/types/facebook"
import { facebookService } from "@/services/facebook.service"

const parseFromFacebookName = (rawName: string) => {
  const parts = rawName
    .split("-")
    .map((part) => part.trim())
    .filter(Boolean)

  const roleCode = (parts[0] ?? "").toUpperCase()
  const role = roleCode === "AD" ? "admin" : "employee"
  const businessName = parts[1] ?? ""
  const description = parts.slice(2).join(" - ")

  return {
    roleCode: roleCode || "EM",
    role,
    businessName,
    description,
  }
}

export default function SystemUserManager() {
  const [isAdminVerified, setIsAdminVerified] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState("")
  const [tokenInput, setTokenInput] = useState("")
  const [appNameInput, setAppNameInput] = useState("")
  const [businessIdInput, setBusinessIdInput] = useState("")
  const [previewUser, setPreviewUser] = useState<SystemUser | null>(null)
  const [savedUsers, setSavedUsers] = useState<SystemUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [isCrawling, setIsCrawling] = useState(false)
  const [saving, setSaving] = useState(false)
  const [refreshingRowKey, setRefreshingRowKey] = useState<string | null>(null)
  const [deletingUserKey, setDeletingUserKey] = useState<string | null>(null)
  const [adminPasswordInput, setAdminPasswordInput] = useState("")
  const [lastCrawledToken, setLastCrawledToken] = useState("")
  const [status, setStatus] = useState("Please enter admin password first")

  const loadSavedUsers = async (password: string) => {
    const res = await fetch("/api/database/systemUsers/secure-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    })
    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || data.message || "Failed to load system users")
    }

    setSavedUsers((data.data ?? []) as SystemUser[])
  }

  const handleVerifyAdmin = async () => {
    const password = adminPasswordInput.trim()
    if (!password) {
      toast.error("Please input admin password")
      return
    }

    try {
      setAuthLoading(true)
      setLoadingUsers(true)
      setAuthError("")
      await loadSavedUsers(password)
      setIsAdminVerified(true)
      setStatus("Input token to start crawling")
      toast.success("Admin verified")
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Invalid admin password"
      setIsAdminVerified(false)
      setSavedUsers([])
      setPreviewUser(null)
      setTokenInput("")
      setAppNameInput("")
      setBusinessIdInput("")
      setStatus("Please enter admin password first")
      setAuthError(message)
      toast.error(message)
    } finally {
      setAuthLoading(false)
      setLoadingUsers(false)
    }
  }

  const crawlUser = useCallback(async (token: string) => {
    try {
      const fbUser = await facebookService.getMe(token)
      const parsed = parseFromFacebookName(fbUser.name)
      setPreviewUser({
        id: fbUser.id,
        name: fbUser.name,
        appName: appNameInput.trim(),
        businessId: businessIdInput.trim(),
        businessName: parsed.businessName,
        roleCode: parsed.roleCode,
        role: parsed.role,
        description: parsed.description,
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
  }, [appNameInput, businessIdInput])

  useEffect(() => {
    const token = tokenInput.trim()

    if (!isAdminVerified) {
      setPreviewUser(null)
      setIsCrawling(false)
      return
    }

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
  }, [tokenInput, isAdminVerified, crawlUser])

  const handleSave = async () => {
    const token = tokenInput.trim()
    const appName = appNameInput.trim()
    const businessId = businessIdInput.trim()

    if (!businessId) {
      toast.error("Please input business id before saving")
      return
    }

    if (!token || !previewUser || token !== lastCrawledToken) {
      toast.error("Please wait for crawl result before saving")
      return
    }

    try {
      setSaving(true)
      const res = await fetch("/api/database/systemUsers/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          appName,
          businessId,
        }),
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
      await loadSavedUsers(adminPasswordInput.trim())
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

  const handleRecrawlAndSave = async (user: SystemUser, rowKey: string) => {
    if (!adminPasswordInput.trim()) {
      toast.error("Please input admin password before recrawl")
      return
    }
    if (!user._id) {
      toast.error("Missing system user record id")
      return
    }

    try {
      setRefreshingRowKey(rowKey)
      const res = await fetch("/api/database/systemUsers/recrawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: user._id, password: adminPasswordInput }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to recrawl system user")
      }

      toast.success("Recrawled and saved")
      await loadSavedUsers(adminPasswordInput.trim())
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error"
      toast.error(message)
    } finally {
      setRefreshingRowKey(null)
    }
  }

  const handleDeleteSystemUser = async (user: SystemUser, rowKey: string) => {
    if (!adminPasswordInput.trim()) {
      toast.error("Please input admin password before delete")
      return
    }

    if (!user._id) {
      toast.error("Missing system user record id")
      return
    }

    try {
      setDeletingUserKey(rowKey)
      const res = await fetch("/api/database/systemUsers/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: user._id,
          password: adminPasswordInput,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to delete system user")
      }

      toast.success(data.message || "System user deleted successfully")
      await loadSavedUsers(adminPasswordInput.trim())
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error"
      toast.error(message)
    } finally {
      setDeletingUserKey(null)
    }
  }

  const formatDate = (value?: string | Date) => {
    if (!value) return "-"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return "-"

    const localDate = new Date(
      date.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" })
    )

    const hh = String(localDate.getHours()).padStart(2, "0")
    const mm = String(localDate.getMinutes()).padStart(2, "0")
    const dd = String(localDate.getDate()).padStart(2, "0")
    const MM = String(localDate.getMonth() + 1).padStart(2, "0")
    const yy = String(localDate.getFullYear()).slice(-2)

    return `${hh}:${mm} ${dd}-${MM}-${yy}`
  }
  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <Card className="relative rounded-2xl border-slate-200 bg-white shadow-lg">
        <div className="pointer-events-none absolute right-6 top-6 rounded-xl border border-slate-200 bg-white/90 p-2.5 shadow-sm">
          <Image src="/icon.png" alt="App icon" width={40} height={40} />
        </div>
        <CardContent className="p-8 space-y-8">
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight">System User Manager</h2>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="text-sm text-slate-600">{status}</p>
                {authError && <p className="text-xs text-red-600">{authError}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="password"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  placeholder="Admin password"
                  className="h-9 w-44 text-xs"
                />
                <Button
                  onClick={handleVerifyAdmin}
                  disabled={authLoading || !adminPasswordInput.trim()}
                  className="h-9 min-w-24 cursor-pointer border border-slate-300 bg-slate-50 px-3 text-xs text-slate-700 shadow-sm hover:bg-slate-100"
                >
                  {authLoading ? "Checking..." : "Unlock"}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[2fr_1fr_1fr_auto]">
            <Input
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Access token"
              disabled={!isAdminVerified}
            />
            <Input
              value={businessIdInput}
              onChange={(e) => setBusinessIdInput(e.target.value)}
              placeholder="Business ID"
              disabled={!isAdminVerified}
            />
            <Input
              value={appNameInput}
              onChange={(e) => setAppNameInput(e.target.value.toLowerCase())}
              placeholder="App (option)"
              disabled={!isAdminVerified}
            />
            <Button
              onClick={handleSave}
              disabled={
                !isAdminVerified ||
                isCrawling ||
                saving ||
                !previewUser ||
                !tokenInput.trim() ||
                !businessIdInput.trim()
              }
              className={`min-w-28 cursor-pointer border border-slate-300 shadow-sm transition-colors duration-200 ${
                isCrawling ||
                saving ||
                !previewUser ||
                !tokenInput.trim() ||
                !businessIdInput.trim()
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
                    <th className="p-3">Business ID</th>
                    <th className="p-3">Business Name</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">App</th>
                  </tr>
                </thead>
                <tbody>
                  {previewUser && (
                    <tr key={previewUser.id} className="border-t hover:bg-slate-50/60">
                      <td className="p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono">{previewUser.id}</span>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => copy(previewUser.id)}
                            className="cursor-pointer border-slate-300 bg-white hover:bg-slate-50"
                            title="Copy system user id"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                      <td className="p-3">{previewUser.name}</td>
                      <td className="p-3">{businessIdInput.trim() || previewUser.businessId || "-"}</td>
                      <td className="p-3">{previewUser.businessName || "-"}</td>
                      <td className="p-3">{previewUser.role || "-"}</td>
                      <td className="p-3">{appNameInput.trim() || "-"}</td>
                    </tr>
                  )}
                  {!previewUser && (
                    <tr className="border-t">
                      <td className="p-3 text-slate-500" colSpan={6}>
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
                    <th className="p-3">App</th>
                    <th className="p-3">Updated</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {savedUsers.map((user, index) => {
                    const rowKey = String(index)
                    return (
                    <tr key={index} className="border-t hover:bg-slate-50/60">
                      <td className="p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono">{user.id}</span>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => copy(user.id)}
                            className="cursor-pointer border-slate-300 bg-white hover:bg-slate-50"
                            title="Copy system user id"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                      <td className="p-3">{user.name}</td>
                      <td className="p-3">{user.appName || "-"}</td>
                      <td className="p-3">{formatDate(user.updatedAt)}</td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => copy(user.token ?? "")}
                            disabled={!user.token}
                            className="cursor-pointer border-slate-300 bg-white hover:bg-slate-50"
                            title="Copy access token"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => handleRecrawlAndSave(user, rowKey)}
                            disabled={
                              !isAdminVerified ||
                              refreshingRowKey === rowKey ||
                              deletingUserKey === rowKey
                            }
                            className="cursor-pointer border-slate-300 bg-white hover:bg-slate-50"
                            title="Recrawl and save"
                          >
                            {refreshingRowKey === rowKey ? (
                              <RefreshCcw className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCcw className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => handleDeleteSystemUser(user, rowKey)}
                            disabled={
                              !isAdminVerified ||
                              deletingUserKey === rowKey ||
                              refreshingRowKey === rowKey
                            }
                            className="cursor-pointer border-red-200 bg-white text-red-600 hover:bg-red-50 hover:text-red-700"
                            title="Delete system user"
                          >
                            {deletingUserKey === rowKey ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )})}
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
