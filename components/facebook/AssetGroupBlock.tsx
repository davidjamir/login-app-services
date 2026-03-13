'use client'

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Copy, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { facebookService } from "@/services/facebook.service"

type AssetGroup = { id: string; name: string }
type AssignedUser = { id: string; name: string; page_roles?: string[] }

const PAGE_ROLES = ["MANAGE", "CREATE_CONTENT", "MODERATE", "ADVERTISE", "ANALYZE"]

type SystemUserOption = { id: string; name: string }

type Props = {
  activeToken: string
  businessId: string
  systemUsers: SystemUserOption[]
  pageIdsInput?: string
}

export default function AssetGroupBlock({ activeToken, businessId, systemUsers, pageIdsInput = "" }: Props) {
  const [assetGroups, setAssetGroups] = useState<AssetGroup[]>([])
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [groupPageCounts, setGroupPageCounts] = useState<Record<string, number>>({})
  const [createName, setCreateName] = useState("")
  const [createDescription, setCreateDescription] = useState("")
  const [createLoading, setCreateLoading] = useState(false)
  const [editGroupId, setEditGroupId] = useState("")
  const [editName, setEditName] = useState("")
  const [editLoading, setEditLoading] = useState(false)
  const [deleteGroupId, setDeleteGroupId] = useState("")
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [expandedGroupId, setExpandedGroupId] = useState("")
  const [assignedUsers, setAssignedUsers] = useState<AssignedUser[]>([])
  const [loadingAssigned, setLoadingAssigned] = useState(false)
  const [assignUserId, setAssignUserId] = useState("")
  const [assignUserManualId, setAssignUserManualId] = useState("")
  const [assignPageRoles, setAssignPageRoles] = useState<string[]>(["CREATE_CONTENT", "MODERATE", "ADVERTISE", "ANALYZE"])
  const [assignLoading, setAssignLoading] = useState(false)
  const [removeLoading, setRemoveLoading] = useState(false)
  const [containedPages, setContainedPages] = useState<Array<{ id: string; name?: string }>>([])
  const [loadingPages, setLoadingPages] = useState(false)
  const [addPageLoading, setAddPageLoading] = useState(false)
  const [removePageLoading, setRemovePageLoading] = useState(false)
  const [tokenOwnerUser, setTokenOwnerUser] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    if (!activeToken) {
      setTokenOwnerUser(null)
      return
    }
    let active = true
    facebookService
      .getMe(activeToken)
      .then((user) => {
        if (active) setTokenOwnerUser(user)
      })
      .catch(() => {
        if (active) setTokenOwnerUser(null)
      })
    return () => {
      active = false
    }
  }, [activeToken])

  useEffect(() => {
    if (!activeToken || !businessId) {
      setAssetGroups([])
      setLoadingGroups(false)
      return
    }
    let active = true
    setLoadingGroups(true)
    void facebookService
      .getBusinessAssetGroups(activeToken, businessId)
      .then(async (groups) => {
        if (!active) return
        setAssetGroups(groups)
        const counts: Record<string, number> = {}
        await Promise.all(
          groups.map(async (g) => {
            try {
              const c = await facebookService.getAssetGroupContainedPagesCount(activeToken, g.id)
              if (active) counts[g.id] = c
            } catch {
              if (active) counts[g.id] = 0
            }
          })
        )
        if (active) setGroupPageCounts(counts)
      })
      .catch((err) => {
        if (active) {
          setAssetGroups([])
          toast.error(err instanceof Error ? err.message : "Failed to load groups")
        }
      })
      .finally(() => {
        if (active) setLoadingGroups(false)
      })
    return () => {
      active = false
    }
  }, [activeToken, businessId])

  useEffect(() => {
    if (!expandedGroupId || !activeToken || !businessId) {
      setAssignedUsers([])
      setLoadingAssigned(false)
      return
    }
    let active = true
    setLoadingAssigned(true)
    fetch("/api/facebook/business/assetGroups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: activeToken,
        businessId,
        action: "assigned-users",
        assetGroupId: expandedGroupId,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!active) return
        if (data.success && Array.isArray(data.data)) {
          setAssignedUsers(data.data)
        } else {
          setAssignedUsers([])
          if (data.error || data.message) toast.error(data.message || data.error || "Failed to load assigned users")
        }
      })
      .catch((err) => {
        if (active) {
          setAssignedUsers([])
          toast.error(err instanceof Error ? err.message : "Failed to load assigned users")
        }
      })
      .finally(() => {
        if (active) setLoadingAssigned(false)
      })
    return () => {
      active = false
    }
  }, [expandedGroupId, activeToken, businessId])

  useEffect(() => {
    if (!expandedGroupId || !activeToken) {
      setContainedPages([])
      setLoadingPages(false)
      return
    }
    let active = true
    setLoadingPages(true)
    facebookService
      .getAssetGroupContainedPages(activeToken, expandedGroupId)
      .then((pages) => {
        if (active) setContainedPages(pages)
      })
      .catch(() => {
        if (active) setContainedPages([])
      })
      .finally(() => {
        if (active) setLoadingPages(false)
      })
    return () => {
      active = false
    }
  }, [expandedGroupId, activeToken])

  const handleCreate = async () => {
    const name = createName.trim()
    if (!name || !activeToken || !businessId) {
      toast.error("Name required")
      return
    }
    try {
      setCreateLoading(true)
      const res = await fetch("/api/facebook/business/assetGroups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: activeToken,
          businessId,
          action: "create",
          name,
          description: createDescription.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.message || "Create failed")
      toast.success("Asset group created")
      setCreateName("")
      setCreateDescription("")
      setAssetGroups((prev) => [...prev, { id: data.data?.id ?? "", name }])
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Create failed")
    } finally {
      setCreateLoading(false)
    }
  }

  const handleUpdate = async () => {
    const name = editName.trim()
    if (!editGroupId || !name || !activeToken) {
      toast.error("Select group and enter new name")
      return
    }
    try {
      setEditLoading(true)
      const res = await fetch("/api/facebook/business/assetGroups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: activeToken,
          action: "update",
          assetGroupId: editGroupId,
          name,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.message || "Update failed")
      toast.success("Asset group updated")
      setEditGroupId("")
      setEditName("")
      setAssetGroups((prev) =>
        prev.map((g) => (g.id === editGroupId ? { ...g, name } : g))
      )
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Update failed")
    } finally {
      setEditLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteGroupId || !activeToken) {
      toast.error("Select group to delete")
      return
    }
    try {
      setDeleteLoading(true)
      const res = await fetch("/api/facebook/business/assetGroups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: activeToken,
          action: "delete",
          assetGroupId: deleteGroupId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.message || "Delete failed")
      toast.success("Asset group deleted")
      setAssetGroups((prev) => prev.filter((g) => g.id !== deleteGroupId))
      if (expandedGroupId === deleteGroupId) setExpandedGroupId("")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Delete failed")
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleAssignUser = async () => {
    const userId = assignUserManualId.trim() || assignUserId
    if (!userId || !expandedGroupId || !activeToken || !businessId) {
      toast.error("Select group and system user (or enter ID)")
      return
    }
    try {
      setAssignLoading(true)
      const res = await fetch("/api/facebook/business/assetGroups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: activeToken,
          businessId,
          action: "assign-user",
          assetGroupId: expandedGroupId,
          userId,
          pageRoles: assignPageRoles,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.message || "Assign failed")
      toast.success("System user assigned")
      setAssignUserId("")
      setAssignUserManualId("")
      const refetch = await fetch("/api/facebook/business/assetGroups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: activeToken,
          businessId,
          action: "assigned-users",
          assetGroupId: expandedGroupId,
        }),
      })
      const refetchData = await refetch.json()
      if (refetchData.success && Array.isArray(refetchData.data)) {
        setAssignedUsers(refetchData.data)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Assign failed")
    } finally {
      setAssignLoading(false)
    }
  }

  const handleRemoveUser = async (userId: string) => {
    if (!userId || !expandedGroupId || !activeToken || !businessId) {
      toast.error("Select user to remove")
      return
    }
    try {
      setRemoveLoading(true)
      const res = await fetch("/api/facebook/business/assetGroups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: activeToken,
          businessId,
          action: "remove-user",
          assetGroupId: expandedGroupId,
          userId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.message || "Remove failed")
      toast.success("User removed from asset group")
      setAssignedUsers((prev) => prev.filter((u) => u.id !== userId))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Remove failed")
    } finally {
      setRemoveLoading(false)
    }
  }

  const pageIdsFromInput = pageIdsInput
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  const handleAddPages = async () => {
    if (pageIdsFromInput.length === 0 || !expandedGroupId || !activeToken) {
      toast.error("Enter page IDs in the area above (one per line)")
      return
    }
    try {
      setAddPageLoading(true)
      let successCount = 0
      for (const pageId of pageIdsFromInput) {
        try {
          const res = await fetch("/api/facebook/business/assetGroups", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token: activeToken,
              action: "add-page",
              assetGroupId: expandedGroupId,
              pageId,
            }),
          })
          const data = await res.json()
          if (res.ok) successCount++
          else throw new Error(data.error || data.message)
        } catch {
          throw new Error(`Failed to add page ${pageId}`)
        }
      }
      toast.success(`${successCount} page(s) added`)
      const refetch = await fetch("/api/facebook/business/assetGroups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: activeToken,
          action: "contained-pages",
          assetGroupId: expandedGroupId,
        }),
      })
      const refetchData = await refetch.json()
      if (refetchData.success && Array.isArray(refetchData.data)) {
        setContainedPages(refetchData.data)
        setGroupPageCounts((prev) => ({
          ...prev,
          [expandedGroupId]: refetchData.data.length,
        }))
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Add failed")
    } finally {
      setAddPageLoading(false)
    }
  }

  const handleRemovePage = async (pageId: string) => {
    if (!pageId || !expandedGroupId || !activeToken) return
    try {
      setRemovePageLoading(true)
      const res = await fetch("/api/facebook/business/assetGroups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: activeToken,
          action: "remove-page",
          assetGroupId: expandedGroupId,
          pageId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.message || "Remove failed")
      toast.success("Page removed")
      setContainedPages((prev) => prev.filter((p) => p.id !== pageId))
      setGroupPageCounts((prev) => ({
        ...prev,
        [expandedGroupId]: Math.max(0, (prev[expandedGroupId] ?? 0) - 1),
      }))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Remove failed")
    } finally {
      setRemovePageLoading(false)
    }
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Copied")
    } catch {
      toast.error("Copy failed")
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={createName}
          onChange={(e) => setCreateName(e.target.value)}
          placeholder="Group name"
          className="h-8 w-48 text-xs"
        />
        <Input
          value={createDescription}
          onChange={(e) => setCreateDescription(e.target.value)}
          placeholder="Description (optional)"
          className="h-8 w-48 text-xs"
        />
        <Button
          size="sm"
          onClick={() => void handleCreate()}
          disabled={!createName.trim() || createLoading}
          className="h-8 cursor-pointer"
        >
          {createLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
          Create Group
        </Button>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-600">Asset Groups</p>
        {loadingGroups ? (
          <p className="text-xs text-slate-500">Loading...</p>
        ) : assetGroups.length === 0 ? (
          <p className="text-xs text-slate-500">No asset groups.</p>
        ) : (
          <div className="max-h-[360px] space-y-2 overflow-y-auto">
            {assetGroups.map((g) => (
              <div
                key={g.id}
                className="rounded-lg border border-slate-200 bg-white p-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{g.name}</span>
                      <span className="font-mono text-xs text-slate-500">{g.id}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-6 w-6"
                      onClick={() => void copy(g.id)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Owner · page: {groupPageCounts[g.id] !== undefined ? groupPageCounts[g.id] : 0}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditGroupId(g.id)
                        setEditName(g.name)
                      }}
                      className="h-6 text-xs"
                    >
                      <Pencil className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setExpandedGroupId(expandedGroupId === g.id ? "" : g.id)}
                      className="h-6 text-xs"
                    >
                      {expandedGroupId === g.id ? "Hide" : "Details"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeleteGroupId(g.id)}
                      disabled={deleteLoading}
                      className="h-6 text-xs text-red-600 hover:bg-red-50"
                    >
                      {deleteGroupId === g.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="mr-1 h-3 w-3" />
                      )}
                      Delete
                    </Button>
                  </div>
                </div>

                {expandedGroupId === g.id && (
                  <div className="mt-2 space-y-3 border-t border-slate-200 pt-2">
                    <div>
                      <p className="text-[11px] font-medium text-slate-600">Assigned users in this group</p>
                      {loadingAssigned ? (
                        <p className="text-[11px] text-slate-500">Loading...</p>
                      ) : (
                        <>
                          <div className="mt-2 space-y-1">
                            {assignedUsers.map((u) => (
                              <div
                                key={u.id}
                                className="flex items-center justify-between rounded bg-slate-50 px-2 py-1 text-[11px]"
                              >
                                <span>
                                  {u.name} • {u.id}
                                  {u.page_roles?.length ? ` (${u.page_roles.join(", ")})` : ""}
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void handleRemoveUser(u.id)}
                                  disabled={removeLoading}
                                  className="h-5 text-[11px] text-red-600"
                                >
                                  Remove
                                </Button>
                              </div>
                            ))}
                            {assignedUsers.length === 0 && (
                              <p className="text-[11px] text-slate-500">No users assigned.</p>
                            )}
                          </div>
                          <p className="mt-2 text-[11px] font-medium text-slate-600">Add user</p>
                          <div className="mt-1 flex flex-nowrap items-center gap-1 overflow-x-auto">
                          <select
                            value={assignUserId}
                            onChange={(e) => {
                              setAssignUserId(e.target.value)
                              if (e.target.value) setAssignUserManualId("")
                            }}
                            className="h-8 min-w-0 max-w-[200px] shrink rounded-md border border-slate-300 px-2 text-xs"
                          >
                            <option value="">Select user</option>
                            {tokenOwnerUser && (
                              <option key={`token-owner-${tokenOwnerUser.id}`} value={tokenOwnerUser.id}>
                                {tokenOwnerUser.name} • {tokenOwnerUser.id}
                              </option>
                            )}
                            {systemUsers
                              .filter((u) => !assignedUsers.some((a) => a.id === u.id))
                              .map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.name} • {u.id}
                                </option>
                              ))}
                          </select>
                          <span className="shrink-0 text-xs text-slate-400">or</span>
                          <Input
                            value={assignUserManualId}
                            onChange={(e) => {
                              setAssignUserManualId(e.target.value)
                              if (e.target.value.trim()) setAssignUserId("")
                            }}
                            placeholder="Enter ID"
                            className="h-8 w-44 shrink-0 rounded-md px-2 text-xs"
                          />
                          <div className="flex shrink-0 flex-wrap gap-0.5">
                            {PAGE_ROLES.map((r) => (
                              <label key={r} className="flex items-center gap-0.5 text-[10px]">
                                <input
                                  type="checkbox"
                                  checked={assignPageRoles.includes(r)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setAssignPageRoles((prev) => [...prev, r])
                                    } else {
                                      setAssignPageRoles((prev) => prev.filter((x) => x !== r))
                                    }
                                  }}
                                  className="h-3 w-3"
                                />
                                {r}
                              </label>
                            ))}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => void handleAssignUser()}
                            disabled={(!assignUserId && !assignUserManualId.trim()) || assignLoading}
                            className="h-8 shrink-0 px-3 text-xs"
                          >
                            {assignLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
                          </Button>
                        </div>
                        </>
                      )}
                    </div>

                    <div className="border-t border-slate-200 pt-3">
                          <p className="text-[11px] font-medium text-slate-600">Contained Pages</p>
                          {loadingPages ? (
                            <p className="text-[11px] text-slate-500">Loading...</p>
                          ) : (
                            <>
                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => void handleAddPages()}
                                  disabled={pageIdsFromInput.length === 0 || addPageLoading}
                                  className="h-7 text-xs"
                                >
                                  {addPageLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : `Add ${pageIdsFromInput.length} page(s) from area above`}
                                </Button>
                              </div>
                              <div className="space-y-1">
                                {containedPages.map((p) => (
                                  <div
                                    key={p.id}
                                    className="flex items-center justify-between rounded bg-slate-50 px-2 py-1 text-[11px]"
                                  >
                                    <span>{p.name || p.id}</span>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        size="icon"
                                        variant="outline"
                                        className="h-5 w-5"
                                        onClick={() => void copy(p.id)}
                                      >
                                        <Copy className="h-2.5 w-2.5" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => void handleRemovePage(p.id)}
                                        disabled={removePageLoading}
                                        className="h-5 text-[11px] text-red-600"
                                      >
                                        Remove
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                                {containedPages.length === 0 && (
                                  <p className="text-[11px] text-slate-500">No pages in this group.</p>
                                )}
                              </div>
                            </>
                          )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {editGroupId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="rounded-xl border bg-white p-6 shadow-lg">
            <p className="mb-2 font-medium text-sm">Edit Asset Group</p>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="New name"
              className="mb-3 h-8 text-xs"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void handleUpdate()} disabled={editLoading}>
                {editLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditGroupId("")
                  setEditName("")
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteGroupId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="rounded-xl border bg-white p-6 shadow-lg">
            <p className="mb-3 font-medium text-sm">Delete asset group?</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => void handleDelete()}
                disabled={deleteLoading}
              >
                {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setDeleteGroupId("")}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
