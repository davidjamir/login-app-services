'use client'

import Image from "next/image"
import { Fragment, useEffect, useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Copy, RefreshCcw, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { facebookService } from "@/services/facebook.service"
import { FacebookBusiness, FacebookPage, SystemUser } from "@/types/facebook"

type SourceMode = "system-user" | "account-user"
type BusinessPageRow = FacebookPage & { businessId: string; businessName: string }
type LatestResponseItem = {
  pageId: string
  pageName: string
  status: "success" | "failed"
  message: string
}

export default function PageManager() {
  const [status, setStatus] = useState("Please enter admin password first.")
  const [authError, setAuthError] = useState("")
  const [adminPasswordInput, setAdminPasswordInput] = useState("")
  const [isAdminVerified, setIsAdminVerified] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)

  const [mode, setMode] = useState<SourceMode>("system-user")
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([])
  const [selectedUserIndex, setSelectedUserIndex] = useState("")
  const [selectedAdminUserIndex, setSelectedAdminUserIndex] = useState("")
  const [accountTokenInput, setAccountTokenInput] = useState("")

  const [loadingData, setLoadingData] = useState(false)
  const [businesses, setBusinesses] = useState<FacebookBusiness[]>([])
  const [businessPages, setBusinessPages] = useState<BusinessPageRow[]>([])
  const [allManagedPages, setAllManagedPages] = useState<FacebookPage[]>([])
  const [outsidePages, setOutsidePages] = useState<FacebookPage[]>([])
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([])
  const [latestResponses, setLatestResponses] = useState<LatestResponseItem[]>([])
  const [hasLatestResponseError, setHasLatestResponseError] = useState(false)

  const selectedSystemUser =
    selectedUserIndex !== "" ? systemUsers[Number(selectedUserIndex)] : undefined
  const adminSystemUsers = useMemo(
    () => systemUsers.filter((user) => String(user.role || "").toLowerCase() === "admin"),
    [systemUsers]
  )
  const selectedAdminSystemUser =
    selectedAdminUserIndex !== "" ? adminSystemUsers[Number(selectedAdminUserIndex)] : undefined
  const effectiveAdminSystemUser = selectedAdminSystemUser ?? selectedSystemUser
  const activeToken = useMemo(() => {
    if (!isAdminVerified) return ""
    if (mode === "system-user") return selectedSystemUser?.token ?? ""
    return accountTokenInput.trim()
  }, [isAdminVerified, mode, selectedSystemUser?.token, accountTokenInput])
  const businessRows = useMemo(
    () =>
      businesses.map((bm) => ({
        ...bm,
        pages: businessPages.filter((page) => page.businessId === bm.id),
      })),
    [businesses, businessPages]
  )
  const allPageIds = useMemo(() => allManagedPages.map((page) => page.id), [allManagedPages])
  const isAllSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedPageIds.includes(id))
  const successResponses = useMemo(
    () => latestResponses.filter((item) => item.status === "success"),
    [latestResponses]
  )
  const failedResponses = useMemo(
    () => latestResponses.filter((item) => item.status === "failed"),
    [latestResponses]
  )

  const loadSystemUsers = async (password: string) => {
    const res = await fetch("/api/database/systemUsers/secure-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || data.message || "Failed to load system users")
    }

    const users = (data.data ?? []) as SystemUser[]
    setSystemUsers(users)
    setSelectedUserIndex((prev) => {
      const index = Number(prev)
      return Number.isInteger(index) && index >= 0 && index < users.length ? prev : ""
    })
    setSelectedAdminUserIndex((prev) => {
      const index = Number(prev)
      return Number.isInteger(index) && index >= 0 && index < users.length ? prev : ""
    })
    return users
  }

  const handleVerifyAdmin = async () => {
    const password = adminPasswordInput.trim()
    if (!password) {
      toast.error("Please input admin password")
      return
    }

    try {
      setAuthLoading(true)
      setAuthError("")
      const users = await loadSystemUsers(password)
      setIsAdminVerified(true)
      setMode("system-user")
      setStatus(`Unlocked. Loaded ${users.length} system user(s).`)
      toast.success("Admin verified")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid admin password"
      setIsAdminVerified(false)
      setSystemUsers([])
      setSelectedUserIndex("")
      setSelectedAdminUserIndex("")
      setAccountTokenInput("")
      setBusinesses([])
      setBusinessPages([])
      setOutsidePages([])
      setAllManagedPages([])
      setStatus("Please enter admin password first.")
      setAuthError(message)
      toast.error(message)
    } finally {
      setAuthLoading(false)
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

  const handleCopySelectedPages = async () => {
    const selectedIds = allManagedPages
      .filter((page) => selectedPageIds.includes(page.id))
      .map((page) => page.id)

    if (selectedIds.length === 0) return
    await copy(selectedIds.join("\n"))
  }

  const handleDeleteSelectedPages = async () => {
    if (selectedPageIds.length === 0) return
    if (mode !== "system-user") return

    const userId = selectedSystemUser?.id
    const targetBusinessId = selectedSystemUser?.businessId
    if (!userId || !targetBusinessId) {
      toast.error("Missing target system user or business id")
      return
    }

    await deleteBySystemAdmin(userId, targetBusinessId)
  }

  const applyDeleteResult = (
    selectedIds: string[],
    result: { successPageIds: string[]; failed: Array<{ pageId: string; message: string }> }
  ) => {
    const pageNameMap = new Map(allManagedPages.map((page) => [page.id, page.name]))
    setAllManagedPages((prev) => prev.filter((page) => !result.successPageIds.includes(page.id)))
    setSelectedPageIds((prev) => prev.filter((id) => !result.successPageIds.includes(id)))

    const failedMap = new Map(result.failed.map((item) => [item.pageId, item.message]))
    const responses = selectedIds.map((pageId) => {
      const failedMessage = failedMap.get(pageId)
      return {
        pageId,
        pageName: pageNameMap.get(pageId) || "-",
        status: failedMessage ? "failed" : "success",
        message: failedMessage || "Permission removed successfully",
      } satisfies LatestResponseItem
    })

    setLatestResponses(responses)
    setHasLatestResponseError(result.failed.length > 0)

    if (result.failed.length === 0) {
      toast.success(`Deleted ${result.successPageIds.length} page permission(s)`)
    } else {
      toast.error(`Deleted ${result.successPageIds.length}, failed ${result.failed.length}`)
    }
  }

  const applyDeleteError = (selectedIds: string[], message: string) => {
    const fallbackResponses = selectedIds.map((pageId) => ({
      pageId,
      pageName: allManagedPages.find((page) => page.id === pageId)?.name || "-",
      status: "failed" as const,
      message,
    }))
    setLatestResponses(fallbackResponses)
    setHasLatestResponseError(true)
    toast.error(message)
  }

  const deleteBySystemAdmin = async (userId: string, businessId: string) => {
    const adminToken = effectiveAdminSystemUser?.token || ""
    if (!adminToken) {
      toast.error("Missing valid system admin token")
      return
    }

    try {
      setLoadingData(true)
      const selectedIds = [...selectedPageIds]
      const result = await facebookService.removeSystemUserFromPagesByPageAssignedUsersBatch(
        selectedIds,
        userId,
        adminToken
      )
      applyDeleteResult(selectedIds, result)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error"
      applyDeleteError([...selectedPageIds], message)
    } finally {
      setLoadingData(false)
    }
  }

  const handleRefreshPages = async () => {
    if (!activeToken) {
      toast.error("Please select a valid token before refreshing")
      return
    }
    await crawlPages(activeToken)
  }

  const handleCopyLatestResponse = async () => {
    if (latestResponses.length === 0) return

    const lines = latestResponses.map((item) => {
      const label = item.status === "success" ? "SUCCESS" : "FAILED"
      return `[${label}] ${item.pageId} (${item.pageName}): ${item.message}`
    })
    await copy(lines.join("\n"))
  }

  const crawlPages = async (token: string) => {
    try {
      setLoadingData(true)
      setStatus("Crawling businesses and pages...")

      const [me, bmList, managedPages] = await Promise.all([
        facebookService.getMe(token),
        facebookService.getBusinesses(token),
        facebookService.getPages(token),
      ])

      const bmWithRoles = await Promise.all(
        bmList.map(async (bm) => {
          const assignedRoles = await facebookService.getBusinessRolesForUser(token, bm.id, me.id)
          return {
            ...bm,
            permitted_roles: assignedRoles.length > 0 ? assignedRoles : (bm.permitted_roles ?? []),
          }
        })
      )

      const bmPageGroups = await Promise.all(
        bmWithRoles.map(async (bm) => {
          const pages = await facebookService.getBusinessPages(token, bm.id)
          return pages.map((page) => ({
            ...page,
            businessId: bm.id,
            businessName: bm.name,
          }))
        })
      )

      const flattenedBmPages = bmPageGroups.flat()
      const bmPageIdSet = new Set(flattenedBmPages.map((item) => item.id))
      const pagesOutsideBm = managedPages.filter((page) => !bmPageIdSet.has(page.id))

      setBusinesses(bmWithRoles)
      setBusinessPages(flattenedBmPages)
      setAllManagedPages(managedPages)
      setOutsidePages(pagesOutsideBm)
      setStatus("Crawl success.")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setBusinesses([])
      setBusinessPages([])
      setAllManagedPages([])
      setOutsidePages([])
      setStatus("Unable to crawl pages. Please check token permissions.")
      toast.error(message)
    } finally {
      setLoadingData(false)
    }
  }

  useEffect(() => {
    if (!isAdminVerified) {
      setBusinesses([])
      setBusinessPages([])
      setAllManagedPages([])
      setOutsidePages([])
      return
    }

    if (!activeToken) {
      setBusinesses([])
      setBusinessPages([])
      setAllManagedPages([])
      setOutsidePages([])
      setStatus("Select source and token to auto crawl pages.")
      return
    }

    const timeout = setTimeout(() => {
      void crawlPages(activeToken)
    }, 1200)

    return () => clearTimeout(timeout)
  }, [isAdminVerified, activeToken])

  useEffect(() => {
    setSelectedPageIds((prev) => prev.filter((id) => allPageIds.includes(id)))
  }, [allPageIds])

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Card className="relative rounded-2xl border-slate-200 bg-white shadow-lg">
        <div className="pointer-events-none absolute right-6 top-6 rounded-xl border border-slate-200 bg-white/90 p-2.5 shadow-sm">
          <Image src="/icon.png" alt="App icon" width={40} height={40} />
        </div>
        <CardContent className="space-y-8 p-8">
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight">Page Manager</h2>
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
                  className="h-9 w-44 text-xs disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
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

          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <Button
              variant="outline"
              onClick={() => setMode("system-user")}
              disabled={!isAdminVerified}
              className={`h-9 cursor-pointer rounded-lg border-slate-200 px-4 ${
                mode === "system-user"
                  ? "bg-slate-100 text-slate-800 hover:bg-slate-100"
                  : "border-transparent bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              System User
            </Button>
            <Button
              variant="outline"
              onClick={() => setMode("account-user")}
              disabled={!isAdminVerified}
              className={`h-9 cursor-pointer rounded-lg border-slate-200 px-4 ${
                mode === "account-user"
                  ? "bg-slate-100 text-slate-800 hover:bg-slate-100"
                  : "border-transparent bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              Account User
            </Button>
          </div>

          {mode === "system-user" ? (
            <div className="space-y-2">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <select
                  value={selectedUserIndex}
                  onChange={(e) => setSelectedUserIndex(e.target.value)}
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm"
                  disabled={!isAdminVerified || systemUsers.length === 0}
                >
                  <option value="" disabled>
                    {!isAdminVerified
                      ? "Please enter admin password first"
                      : systemUsers.length === 0
                        ? "No system users"
                        : "Select system user (name • app • id)"}
                  </option>
                  {systemUsers.map((user, index) => (
                    <option key={index} value={String(index)}>
                      {`${user.name} • ${user.appName || "(no-app)"} • ${user.id}`}
                    </option>
                  ))}
                </select>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => copy(selectedSystemUser?.token ?? "")}
                  disabled={!selectedSystemUser?.token}
                  className="h-10 w-10 cursor-pointer border-slate-300 bg-white hover:bg-slate-50"
                  title="Copy selected token"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRefreshPages}
                  disabled={loadingData || !selectedSystemUser?.token}
                  className="h-10 cursor-pointer border-slate-300 bg-white px-3 text-xs hover:bg-slate-50"
                  title="Refresh pages"
                >
                  <RefreshCcw className={`mr-1 h-3.5 w-3.5 ${loadingData ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="w-36 text-xs text-slate-600">Select System Admin</p>
                  <select
                    value={selectedAdminUserIndex}
                    onChange={(e) => setSelectedAdminUserIndex(e.target.value)}
                    className="h-8 w-full max-w-sm rounded-md border border-slate-300 bg-white px-3 pr-10 text-xs shadow-sm [background-position:right_0.7rem_center] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                    disabled={
                      !isAdminVerified ||
                      adminSystemUsers.length === 0 ||
                      selectedPageIds.length === 0
                    }
                  >
                    <option value="" disabled>
                      {!isAdminVerified
                        ? "Please enter admin password first"
                        : selectedPageIds.length === 0
                          ? "Select pages in the table first"
                          : adminSystemUsers.length === 0
                          ? "No admin system users"
                          : "Select system admin"}
                    </option>
                    {adminSystemUsers.map((user, index) => (
                      <option key={`admin-${index}`} value={String(index)}>
                        {`${user.name} • ${user.appName || "(no-app)"} • ${user.id}`}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mt-1 text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-800">Note:</span> Delete works only when the selected system user and system admin are in the same app.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <Input
                value={accountTokenInput}
                onChange={(e) => setAccountTokenInput(e.target.value)}
                placeholder="Paste account user access token"
                disabled={!isAdminVerified}
                className="disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={() => copy(accountTokenInput.trim())}
                disabled={!accountTokenInput.trim()}
                className="h-10 w-10 cursor-pointer border-slate-300 bg-white hover:bg-slate-50"
                title="Copy input token"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}

          {mode === "system-user" ? (
            <div className="space-y-3">
              {latestResponses.length > 0 && (
                <div
                  className={`space-y-2 rounded-xl p-3 backdrop-blur-[1px] ${
                    failedResponses.length === 0
                      ? "border border-emerald-300 bg-white shadow-[0_0_0_1px_rgba(16,185,129,0.15),0_0_20px_rgba(16,185,129,0.22)]"
                      : successResponses.length === 0
                        ? "border border-red-300 bg-white shadow-[0_0_0_1px_rgba(248,113,113,0.15),0_0_20px_rgba(248,113,113,0.22)]"
                        : "border border-amber-200 bg-white shadow-[0_0_0_1px_rgba(251,191,36,0.10),0_0_16px_rgba(251,191,36,0.14)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-700">Latest Response</p>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={handleCopyLatestResponse}
                      disabled={latestResponses.length === 0}
                      className="h-7 w-7 cursor-pointer border-slate-300 bg-white hover:bg-slate-50 disabled:cursor-not-allowed"
                      title="Copy latest response"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p
                    className={`text-xs ${
                      failedResponses.length === 0
                        ? "text-emerald-700"
                        : successResponses.length === 0
                          ? "text-red-600"
                          : "text-amber-700"
                    }`}
                  >
                    {failedResponses.length === 0
                      ? `All pages succeeded. Success: ${successResponses.length}.`
                      : successResponses.length === 0
                        ? `All pages failed. Failed: ${failedResponses.length}.`
                        : `Some pages failed. Success: ${successResponses.length}, Failed: ${failedResponses.length}.`}
                  </p>
                  <div className="max-h-60 overflow-y-auto">
                    {failedResponses.length > 0 && (
                      <div className="space-y-1 pt-2">
                        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600 marker:text-red-500">
                          {failedResponses.map((item, index) => (
                            <li key={`failed-${item.pageId}-${index}`}>
                              <span className="font-mono font-semibold text-slate-800">{item.pageId}</span> ({item.pageName}):{" "}
                              <span className="text-red-500">{item.message}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {successResponses.length > 0 && (
                      <div className="space-y-1 pt-3">
                        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600 marker:text-emerald-600">
                          {successResponses.map((item, index) => (
                            <li key={`success-${item.pageId}-${index}`}>
                              <span className="font-mono font-semibold text-slate-800">{item.pageId}</span> ({item.pageName}):{" "}
                              <span className="text-emerald-700">{item.message}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold tracking-tight">All Pages</h3>
                  <p className="text-xs text-slate-500">pages: {allManagedPages.length}</p>
                  <p className="text-xs text-slate-500">selected: {selectedPageIds.length}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopySelectedPages}
                    disabled={selectedPageIds.length === 0}
                    className="h-8 cursor-pointer border-slate-300 bg-white px-3 text-xs hover:bg-slate-50 disabled:cursor-not-allowed"
                  >
                    <Copy className="mr-1 h-3.5 w-3.5" />
                    Copy Selected
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDeleteSelectedPages}
                    disabled={selectedPageIds.length === 0 || !effectiveAdminSystemUser?.token}
                    className="h-8 cursor-pointer border-red-200 bg-white px-3 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:text-red-300"
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Delete Selected
                  </Button>
                </div>
              </div>
              <div className="max-h-[1220px] overflow-y-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left font-semibold">
                      <th className="sticky top-0 z-10 bg-slate-50 p-3">#</th>
                      <th className="sticky top-0 z-10 bg-slate-50 p-3">Page ID</th>
                      <th className="sticky top-0 z-10 bg-slate-50 p-3">Page Name</th>
                      <th className="sticky top-0 z-10 bg-slate-50 p-3">Category</th>
                      <th className="sticky top-0 z-10 w-12 bg-slate-50 p-3 pr-5 text-right">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          disabled={allPageIds.length === 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPageIds(allPageIds)
                            } else {
                              setSelectedPageIds([])
                            }
                          }}
                          className="h-4 w-4 cursor-pointer accent-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Select all pages"
                        />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {allManagedPages.map((row, index) => {
                      const isChecked = selectedPageIds.includes(row.id)
                      return (
                        <tr key={`${row.id}-${index}`} className="border-t hover:bg-slate-50/60">
                          <td className="p-3">{index + 1}</td>
                          <td className="p-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono">{row.id}</span>
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => copy(row.id)}
                                className="cursor-pointer border-slate-300 bg-white hover:bg-slate-50"
                                title="Copy page id"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                          <td className="p-3">{row.name}</td>
                          <td className="p-3">{row.category || "-"}</td>
                          <td className="p-3 pr-5 text-right">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPageIds((prev) => [...new Set([...prev, row.id])])
                                } else {
                                  setSelectedPageIds((prev) => prev.filter((id) => id !== row.id))
                                }
                              }}
                              className="h-4 w-4 cursor-pointer accent-slate-600"
                              aria-label={`Select page ${row.name}`}
                            />
                          </td>
                        </tr>
                      )
                    })}
                    {!loadingData && allManagedPages.length === 0 && (
                      <tr className="border-t">
                        <td className="p-3 text-slate-500" colSpan={5}>
                          No pages found for this system user.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-8 grid grid-cols-[auto_1fr] items-start gap-x-2 text-xs text-slate-500">
                <p>* Note:</p>
                <ul className="list-disc pl-5">
                  <li>Copy Selected copies page IDs line by line (one page ID per line).</li>
                  <li>Delete Selected removes selected page permissions from this system user.</li>
                </ul>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold tracking-tight">All Pages</h3>
                  <p className="text-sm text-slate-600">Pages: {allManagedPages.length}</p>
                </div>
                <p className="text-sm text-slate-600">
                  Account User mode: shows BM access list, pages inside BM, and pages assigned outside BM.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold tracking-tight">Business Managers</h3>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr className="text-left font-semibold">
                        <th className="p-3">#</th>
                        <th className="p-3">BM Name</th>
                        <th className="p-3">BM ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {businesses.map((bm, index) => (
                        <tr key={bm.id} className="border-t hover:bg-slate-50/60">
                          <td className="p-3">{index + 1}</td>
                          <td className="p-3">{bm.name}</td>
                          <td className="p-3 font-mono">{bm.id}</td>
                        </tr>
                      ))}
                      {!loadingData && businesses.length === 0 && (
                        <tr className="border-t">
                          <td className="p-3 text-slate-500" colSpan={3}>
                            No BM found for this access token.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold tracking-tight">Pages In BM</h3>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr className="text-left font-semibold">
                        <th className="p-3">Business</th>
                        <th className="p-3">#</th>
                        <th className="p-3">Page ID</th>
                        <th className="p-3">Page Name</th>
                        <th className="p-3">Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {businessRows.map((bm) => (
                        <Fragment key={`bm-group-${bm.id}`}>
                          <tr key={`bm-${bm.id}`} className="border-t bg-slate-50/70">
                            <td className="p-3 font-semibold">{bm.name}</td>
                            <td className="p-3 text-slate-500" colSpan={4}>
                              BM ID: <span className="font-mono">{bm.id}</span>
                            </td>
                          </tr>
                          {bm.pages.length === 0 && (
                            <tr key={`bm-${bm.id}-empty`} className="border-t">
                              <td className="p-3 text-slate-500">-</td>
                              <td className="p-3 text-slate-500" colSpan={4}>
                                No pages in this BM.
                              </td>
                            </tr>
                          )}
                          {bm.pages.map((row, index) => (
                            <tr key={`${row.businessId}-${row.id}-${index}`} className="border-t hover:bg-slate-50/60">
                              <td className="p-3 text-slate-500">{bm.name}</td>
                              <td className="p-3">{index + 1}</td>
                              <td className="p-3 font-mono">{row.id}</td>
                              <td className="p-3">{row.name}</td>
                              <td className="p-3">{row.category || "-"}</td>
                            </tr>
                          ))}
                        </Fragment>
                      ))}
                      {!loadingData && businessPages.length === 0 && (
                        <tr className="border-t">
                          <td className="p-3 text-slate-500" colSpan={5}>
                            No pages in BM.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold tracking-tight">Pages Outside BM</h3>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr className="text-left font-semibold">
                        <th className="p-3">#</th>
                        <th className="p-3">Page ID</th>
                        <th className="p-3">Page Name</th>
                        <th className="p-3">Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outsidePages.map((page, index) => (
                        <tr key={`${page.id}-${index}`} className="border-t hover:bg-slate-50/60">
                          <td className="p-3">{index + 1}</td>
                          <td className="p-3 font-mono">{page.id}</td>
                          <td className="p-3">{page.name}</td>
                          <td className="p-3">{page.category || "-"}</td>
                        </tr>
                      ))}
                      {!loadingData && outsidePages.length === 0 && (
                        <tr className="border-t">
                          <td className="p-3 text-slate-500" colSpan={4}>
                            No pages outside BM.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

        </CardContent>
      </Card>
    </div>
  )
}
