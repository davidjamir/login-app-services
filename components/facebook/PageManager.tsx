'use client'

import Image from "next/image"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronDown, ChevronUp, ClipboardPaste, Copy, Dices, RefreshCcw, Search, Trash2 } from "lucide-react"
import { BASIC_LABEL, FULL_LABEL } from "@/lib/facebook-permissions"
import { copyToClipboard } from "@/lib/copy"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { facebookService } from "@/services/facebook.service"
import { FacebookBusiness, FacebookPage, SystemUser } from "@/types/facebook"
import AssetGroupBlock from "@/components/facebook/AssetGroupBlock"
import EditPageListItem from "@/components/facebook/EditPageListItem"
import PageTableRow from "@/components/facebook/PageTableRow"

type SourceMode = "system-user" | "account-user"
type BusinessPageRow = FacebookPage & {
  businessId: string
  businessName: string
  pageSource: "owned" | "client"
}
type LatestResponseItem = {
  pageId: string
  pageName: string
  status: "success" | "failed"
  message: string
}

const PHONE_COUNTRY_CODES = [
  { value: "+1", label: "+1 (US/CA)" },
  { value: "+44", label: "+44 (UK)" },
  { value: "+84", label: "+84 (VN)" },
  { value: "+81", label: "+81 (JP)" },
  { value: "+86", label: "+86 (CN)" },
  { value: "+91", label: "+91 (IN)" },
  { value: "+49", label: "+49 (DE)" },
  { value: "+33", label: "+33 (FR)" },
  { value: "+39", label: "+39 (IT)" },
  { value: "+34", label: "+34 (ES)" },
  { value: "+61", label: "+61 (AU)" },
  { value: "+82", label: "+82 (KR)" },
  { value: "+65", label: "+65 (SG)" },
  { value: "+66", label: "+66 (TH)" },
  { value: "+63", label: "+63 (PH)" },
  { value: "+60", label: "+60 (MY)" },
  { value: "+62", label: "+62 (ID)" },
  { value: "+55", label: "+55 (BR)" },
  { value: "+52", label: "+52 (MX)" },
  { value: "+7", label: "+7 (RU)" },
]

const ACCOUNT_TOKEN_STORAGE_KEY = "page-manager-account-token"

const RAND_PHONE_NUMBERS = [
  "+1 5053174588",
  "+1 3052062554",
  "+1 9805621692",
  "+1 3052655833",
  "+1 9383498129",
  "+1 7042162513",
  "+1 9838471098",
  "+1 2536868075",
  "+1 8655454194",
  "+1 9834839678",
  "+1 5052520883",
  "+1 6459688867",
  "+1 3052009263",
  "+1 9834048917",
  "+1 9832113240",
  "+1 4724201610",
  "+1 5056469900",
]

const EMAIL_ORIGINS = [
  "nflhub.store",
  "nbahub.store",
  "mlbhub.store",
  "nhlhub.store",
  "thetimenews.us",
  "thetimenews.site",
  "thetimenews.co",
  "thetimenews.store",
  "thedailysports.site",
  "dailysportnews.online",
  "thecryptonews.space",
  "imagetimes.space",
]

type Props = { adminPassword: string; isAdminVerified: boolean }

export default function PageManager({ adminPassword, isAdminVerified }: Props) {
  const [status, setStatus] = useState("Select a system user or enter account token.")
  const [mode, setMode] = useState<SourceMode>("system-user")
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([])
  const [selectedBmFilter, setSelectedBmFilter] = useState("")
  const [selectedSystemUserId, setSelectedSystemUserId] = useState("")
  const [selectedAdminUserIndex, setSelectedAdminUserIndex] = useState("")
  const [accountTokenInput, setAccountTokenInput] = useState("")

  useEffect(() => {
    if (typeof window === "undefined") return
    const saved = localStorage.getItem(ACCOUNT_TOKEN_STORAGE_KEY)
    if (saved) setAccountTokenInput(saved)
  }, [])

  const [loadingData, setLoadingData] = useState(false)
  const [businesses, setBusinesses] = useState<FacebookBusiness[]>([])
  const [businessPages, setBusinessPages] = useState<BusinessPageRow[]>([])
  const [assignedPageIdsByBusiness, setAssignedPageIdsByBusiness] = useState<Record<string, string[]>>({})
  const [allManagedPages, setAllManagedPages] = useState<FacebookPage[]>([])
  const [outsidePages, setOutsidePages] = useState<FacebookPage[]>([])
  const [activeViewerId, setActiveViewerId] = useState("")
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([])
  const [outsideSelectedPageIds, setOutsideSelectedPageIds] = useState<string[]>([])
  const [bmAllSelectedPageIds, setBmAllSelectedPageIds] = useState<Record<string, string[]>>({})
  const [bmAssignedSelectedPageIds, setBmAssignedSelectedPageIds] = useState<Record<string, string[]>>({})
  const [pushedPageIdsInput, setPushedPageIdsInput] = useState("")
  const [bulkSourceBmId, setBulkSourceBmId] = useState("")
  const [bulkActionType, setBulkActionType] = useState<
    | "share-other-bm"
    | "add-current-bm"
    | "assign-user-current-bm"
    | "remove-user-current-bm"
    | "remove-page-current-bm"
    | "create-system-user"
    | "edit-system-user"
    | "manage-asset-groups"
    | "edit-page-info"
  >("add-current-bm")
  const [bulkTargetUserMode, setBulkTargetUserMode] = useState<"system-user" | "manual">("system-user")
  const [bulkTargetSystemUserId, setBulkTargetSystemUserId] = useState("")
  const [bulkBmSystemUsers, setBulkBmSystemUsers] = useState<Array<{ id: string; name: string; role?: string }>>([])
  const [bulkBmSystemUsersLoading, setBulkBmSystemUsersLoading] = useState(false)
  const [bulkTargetBmId, setBulkTargetBmId] = useState("")
  const [bulkTargetUserId, setBulkTargetUserId] = useState("")
  const [taskMode, setTaskMode] = useState<"basic" | "full">("basic")
  const [latestResponses, setLatestResponses] = useState<LatestResponseItem[]>([])
  const [createSystemUserName, setCreateSystemUserName] = useState("")
  const [createSystemUserRole, setCreateSystemUserRole] = useState<"ADMIN" | "EMPLOYEE">("EMPLOYEE")
  const [createSystemUserLoading, setCreateSystemUserLoading] = useState(false)
  const [editSystemUserId, setEditSystemUserId] = useState("")
  const [editSystemUserName, setEditSystemUserName] = useState("")
  const [editSystemUserLoading, setEditSystemUserLoading] = useState(false)
  const [createBmSystemUsers, setCreateBmSystemUsers] = useState<
    Array<{ id: string; name: string; role?: string }>
  >([])
  const [createBmSystemUsersLoading, setCreateBmSystemUsersLoading] = useState(false)
  const [editPageId, setEditPageId] = useState("")
  const [editPageAbout, setEditPageAbout] = useState("")
  const [editPageDescription, setEditPageDescription] = useState("")
  const [editPageCategoryList, setEditPageCategoryList] = useState<Array<{ id: string; name: string }>>([])
  const [editPageWebsite, setEditPageWebsite] = useState("")
  const [editPagePhone, setEditPagePhone] = useState("")
  const [editPagePhoneCode, setEditPagePhoneCode] = useState("+1")
  const [editPageAddress, setEditPageAddress] = useState("")
  const [editPageStreet, setEditPageStreet] = useState("")
  const [editPageCity, setEditPageCity] = useState("")
  const [editPageZip, setEditPageZip] = useState("")
  const [editPageCountry, setEditPageCountry] = useState("USA")
  const [editPageEmail, setEditPageEmail] = useState("")
  const [editPageLoading, setEditPageLoading] = useState(false)
  const [editPageInfoLoading, setEditPageInfoLoading] = useState(false)
  const [editPageSearchQuery, setEditPageSearchQuery] = useState("")
  const [editPageBlockCollapsed, setEditPageBlockCollapsed] = useState(false)
  const [systemUserManagePageInfoVisible, setSystemUserManagePageInfoVisible] = useState(false)
  const [editPageOriginal, setEditPageOriginal] = useState<{
    about: string
    description: string
    website: string
    phoneCode: string
    phone: string
    street: string
    city: string
    zip: string
    country: string
    email: string
  } | null>(null)

  const lastCrawledTokenRef = useRef<string>("")
  const loadingPageIdRef = useRef<string>("")

  const bmFilterOptions = useMemo(() => {
    const seen = new Set<string>()
    const list: Array<{ id: string; name: string }> = []
    for (const u of systemUsers) {
      const bid = u.businessId?.trim()
      if (bid && !seen.has(bid)) {
        seen.add(bid)
        list.push({ id: bid, name: u.businessName?.trim() || bid })
      }
    }
    return list.sort((a, b) => a.name.localeCompare(b.name))
  }, [systemUsers])

  const filteredSystemUsers = useMemo(() => {
    if (!selectedBmFilter) return systemUsers
    return systemUsers.filter((u) => (u.businessId ?? "").trim() === selectedBmFilter)
  }, [systemUsers, selectedBmFilter])

  const selectedSystemUser = systemUsers.find((u) => u.id === selectedSystemUserId)
  const adminSystemUsers = useMemo(
    () => systemUsers.filter((user) => String(user.role || "").toLowerCase() === "admin"),
    [systemUsers]
  )
  const isSelectedUserAdmin = String(selectedSystemUser?.role || "").toLowerCase() === "admin"
  const filteredAdminSystemUsers = useMemo(() => {
    if (!selectedSystemUser) return []
    if (isSelectedUserAdmin) return [] // Admin: use selected user directly, no need to search
    const selectedBmId = (selectedSystemUser.businessId ?? "").trim()
    const selectedAppName = String(selectedSystemUser.appName || "").trim().toLowerCase()
    return adminSystemUsers.filter((user) => {
      const sameBm = (user.businessId ?? "").trim() === selectedBmId
      const sameApp = String(user.appName || "").trim().toLowerCase() === selectedAppName
      return sameBm && sameApp
    })
  }, [adminSystemUsers, selectedSystemUser, isSelectedUserAdmin])
  const selectedAdminSystemUser =
    selectedAdminUserIndex !== "" ? filteredAdminSystemUsers[Number(selectedAdminUserIndex)] : undefined
  const effectiveAdminSystemUser = selectedAdminSystemUser ?? selectedSystemUser
  const activeToken = useMemo(() => {
    if (!isAdminVerified) return ""
    if (mode === "system-user") return selectedSystemUser?.token ?? ""
    return accountTokenInput.trim()
  }, [isAdminVerified, mode, selectedSystemUser?.token, accountTokenInput])
  const businessRows = useMemo(
    () =>
      businesses.map((bm) => {
        const bmPages = businessPages.filter((page) => page.businessId === bm.id)
        const assignedIdSet = new Set(assignedPageIdsByBusiness[bm.id] ?? [])
        const managedIdSet = new Set(allManagedPages.map((page) => page.id))

        return {
          ...bm,
          pages: bmPages,
          // Match strictly by page id only.
          // Prefer BM-specific assignment; fallback to globally managed ids for visibility.
          assignedPages: bmPages
            .filter((page) => assignedIdSet.has(page.id) || managedIdSet.has(page.id))
            .map((page) => ({
              id: page.id,
              name: page.name,
              category: page.category,
              access_token: "",
            })),
        }
      })
      .sort((a, b) => b.pages.length - a.pages.length),
    [businesses, businessPages, assignedPageIdsByBusiness, allManagedPages]
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
  const selectedBulkSourceBm = useMemo(
    () => businessRows.find((bm) => bm.id === bulkSourceBmId),
    [businessRows, bulkSourceBmId]
  )
  const adminBusinessRows = useMemo(
    () =>
      businessRows.filter((bm) =>
        (bm.permitted_roles ?? []).some((role) => String(role).toLowerCase() === "admin")
      ),
    [businessRows]
  )
  const allowedBulkActions = useMemo(() => {
    if (!selectedBulkSourceBm) {
      return [] as Array<{
        value: "share-other-bm" | "add-current-bm" | "assign-user-current-bm" | "remove-user-current-bm" | "remove-page-current-bm" | "create-system-user" | "edit-system-user" | "manage-asset-groups" | "edit-page-info"
        label: string
      }>
    }

    const roles = (selectedBulkSourceBm.permitted_roles ?? []).map((role) => String(role).toLowerCase())
    const isAdmin = roles.includes("admin")

    if (isAdmin) {
      return [
        { value: "share-other-bm", label: "Share to other BM" },
        { value: "add-current-bm", label: "Add to current BM" },
        { value: "assign-user-current-bm", label: "Assign to user in current BM" },
        { value: "remove-user-current-bm", label: "Remove from user in current BM" },
        { value: "remove-page-current-bm", label: "Remove page from current BM" },
        { value: "create-system-user", label: "Create System User" },
        { value: "edit-system-user", label: "Edit System User" },
        { value: "manage-asset-groups", label: "Manage Asset Groups" },
        { value: "edit-page-info", label: "Manage Page Info" },
      ] as Array<{
        value: "share-other-bm" | "add-current-bm" | "assign-user-current-bm" | "remove-user-current-bm" | "remove-page-current-bm" | "create-system-user" | "edit-system-user" | "manage-asset-groups" | "edit-page-info"
        label: string
      }>
    }

    return [] as Array<{
      value: "share-other-bm" | "add-current-bm" | "assign-user-current-bm" | "remove-user-current-bm" | "remove-page-current-bm" | "create-system-user" | "edit-system-user" | "manage-asset-groups" | "edit-page-info"
      label: string
    }>
  }, [selectedBulkSourceBm])

  useEffect(() => {
    if (!allowedBulkActions.some((action) => action.value === bulkActionType)) {
      setBulkActionType(allowedBulkActions[0]?.value ?? "add-current-bm")
    }
  }, [allowedBulkActions, bulkActionType])

  useEffect(() => {
    if (!isAdminVerified || !activeToken || !bulkSourceBmId) {
      setCreateBmSystemUsers([])
      setCreateBmSystemUsersLoading(false)
      setEditSystemUserId("")
      setEditSystemUserName("")
      setBulkBmSystemUsers([])
      setBulkTargetSystemUserId("")
      setBulkBmSystemUsersLoading(false)
      return
    }

    let active = true
    setCreateBmSystemUsersLoading(true)
    setBulkBmSystemUsersLoading(true)
    void facebookService
      .getBusinessSystemUsers(activeToken, bulkSourceBmId)
      .then((users) => {
        if (!active) return
        setCreateBmSystemUsers(users)
        setBulkBmSystemUsers(users)
        setBulkTargetSystemUserId((prev) =>
          users.some((user) => user.id === prev) ? prev : ""
        )
      })
      .catch(() => {
        if (!active) return
        setCreateBmSystemUsers([])
        setBulkBmSystemUsers([])
        setBulkTargetSystemUserId("")
      })
      .finally(() => {
        if (!active) return
        setCreateBmSystemUsersLoading(false)
        setBulkBmSystemUsersLoading(false)
      })

    return () => {
      active = false
    }
  }, [isAdminVerified, activeToken, bulkSourceBmId])

  const loadSystemUsers = useCallback(async (password: string) => {
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
    setSelectedSystemUserId((prev) => (users.some((u) => u.id === prev) ? prev : ""))
    setSelectedAdminUserIndex("")
    return users
  }, [])

  useEffect(() => {
    if (!isAdminVerified || !adminPassword.trim()) {
      setSystemUsers([])
      setSelectedBmFilter("")
      setSelectedSystemUserId("")
      setSelectedAdminUserIndex("")
      setStatus("Select a system user or enter account token.")
      return
    }
    void loadSystemUsers(adminPassword.trim()).then((users) => {
      setStatus(`Loaded ${users.length} system user(s).`)
    })
  }, [isAdminVerified, adminPassword, loadSystemUsers])

  useEffect(() => {
    if (selectedSystemUserId && !filteredSystemUsers.some((u) => u.id === selectedSystemUserId)) {
      setSelectedSystemUserId("")
    }
  }, [selectedBmFilter, filteredSystemUsers, selectedSystemUserId])

  useEffect(() => {
    if (selectedBmFilter && !bmFilterOptions.some((bm) => bm.id === selectedBmFilter)) {
      setSelectedBmFilter("")
    }
  }, [bmFilterOptions, selectedBmFilter])

  useEffect(() => {
    setSelectedAdminUserIndex((prev) => {
      const index = Number(prev)
      return Number.isInteger(index) && index >= 0 && index < filteredAdminSystemUsers.length
        ? prev
        : ""
    })
  }, [filteredAdminSystemUsers])

  const handleCreateSystemUser = async () => {
    const token = activeToken
    const businessId = bulkSourceBmId
    const name = createSystemUserName.trim()

    if (!token) {
      toast.error("Access token required. Use Account User mode or select a system user.")
      return
    }
    if (!businessId) {
      toast.error("Please select a Business Manager first")
      return
    }
    if (!name) {
      toast.error("Please enter system user name")
      return
    }

    try {
      setCreateSystemUserLoading(true)
      const res = await fetch("/api/facebook/business/systemUsers/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          businessId,
          name,
          role: createSystemUserRole,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to create system user")
      }

      toast.success(`System user created: ${data.data?.id ?? "OK"}`)
      setCreateSystemUserName("")
      setCreateBmSystemUsers((prev) => [
        ...prev,
        { id: data.data?.id ?? "", name, role: createSystemUserRole },
      ])
      setBulkBmSystemUsers((prev) =>
        prev.length > 0
          ? [...prev, { id: data.data?.id ?? "", name, role: createSystemUserRole }]
          : prev
      )
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error"
      toast.error(message)
    } finally {
      setCreateSystemUserLoading(false)
    }
  }

  const handleEditSystemUser = async () => {
    const token = activeToken
    const businessId = bulkSourceBmId
    const systemUserId = editSystemUserId.trim()
    const name = editSystemUserName.trim()

    if (!token) {
      toast.error("Access token required. Use Account User mode or select a system user.")
      return
    }
    if (!businessId) {
      toast.error("Please select a Business Manager first")
      return
    }
    if (!systemUserId) {
      toast.error("Please select a system user to edit")
      return
    }
    if (!name) {
      toast.error("Please enter new name")
      return
    }

    try {
      setEditSystemUserLoading(true)
      const res = await fetch("/api/facebook/business/systemUsers/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          businessId,
          systemUserId,
          name,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to update system user")
      }

      toast.success("System user updated")
      setCreateBmSystemUsers((prev) =>
        prev.map((u) => (u.id === systemUserId ? { ...u, name } : u))
      )
      setBulkBmSystemUsers((prev) =>
        prev.map((u) => (u.id === systemUserId ? { ...u, name } : u))
      )
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error"
      toast.error(message)
    } finally {
      setEditSystemUserLoading(false)
    }
  }

  const handleCopySelectedPages = async () => {
    const selectedIds = allManagedPages
      .filter((page) => selectedPageIds.includes(page.id))
      .map((page) => page.id)

    if (selectedIds.length === 0) return
    await copyToClipboard(selectedIds.join("\n"))
  }

  const handleDeleteSelectedPages = async () => {
    if (selectedPageIds.length === 0) return
    if (mode !== "system-user") {
      if (!activeViewerId || !activeToken) {
        toast.error("Missing account user context")
        return
      }
      await deleteByUserToken(selectedPageIds, activeViewerId, activeToken)
      return
    }

    const userId = selectedSystemUser?.id
    const targetBusinessId = selectedSystemUser?.businessId
    if (!userId || !targetBusinessId) {
      toast.error("Missing target system user or business id")
      return
    }

    await deleteBySystemAdmin(userId, targetBusinessId)
  }

  const deleteByUserToken = async (selectedIds: string[], userId: string, token: string) => {
    try {
      setLoadingData(true)
      const result = await facebookService.removeSystemUserFromPagesByPageAssignedUsersBatch(
        selectedIds,
        userId,
        token
      )
      applyDeleteResult(selectedIds, result)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error"
      applyDeleteError(selectedIds, message)
    } finally {
      setLoadingData(false)
    }
  }

  const applyDeleteResult = (
    selectedIds: string[],
    result: { successPageIds: string[]; failed: Array<{ pageId: string; message: string }> }
  ) => {
    const pageNameMap = new Map(allManagedPages.map((page) => [page.id, page.name]))
    setAllManagedPages((prev) => prev.filter((page) => !result.successPageIds.includes(page.id)))
    setSelectedPageIds((prev) => prev.filter((id) => !result.successPageIds.includes(id)))
    setOutsideSelectedPageIds((prev) => prev.filter((id) => !result.successPageIds.includes(id)))
    setBmAllSelectedPageIds((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([key, ids]) => [key, ids.filter((id) => !result.successPageIds.includes(id))])
      )
    )
    setBmAssignedSelectedPageIds((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([key, ids]) => [key, ids.filter((id) => !result.successPageIds.includes(id))])
      )
    )

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
    toast.error(message)
  }

  const applyAssignResult = (
    selectedIds: string[],
    result: { successPageIds: string[]; failed: Array<{ pageId: string; message: string }> }
  ) => {
    const pageNameMap = new Map(allManagedPages.map((page) => [page.id, page.name]))
    const businessPageMap = new Map(businessPages.map((page) => [page.id, page]))

    if (result.successPageIds.length > 0) {
      setAllManagedPages((prev) => {
        const existing = new Set(prev.map((page) => page.id))
        const additions = result.successPageIds
          .map((id) => businessPageMap.get(id))
          .filter((item): item is BusinessPageRow => Boolean(item))
          .filter((item) => !existing.has(item.id))
          .map((item) => ({
            id: item.id,
            name: item.name,
            category: item.category,
            access_token: "",
          }))
        return [...prev, ...additions]
      })
    }

    const failedMap = new Map(result.failed.map((item) => [item.pageId, item.message]))
    const responses = selectedIds.map((pageId) => {
      const failedMessage = failedMap.get(pageId)
      const fallbackName = businessPageMap.get(pageId)?.name || "-"
      return {
        pageId,
        pageName: pageNameMap.get(pageId) || fallbackName,
        status: failedMessage ? "failed" : "success",
        message: failedMessage ? failedMessage : "Permission assigned successfully",
      } satisfies LatestResponseItem
    })

    setLatestResponses(responses)

    if (result.failed.length === 0) {
      toast.success(`Assigned ${result.successPageIds.length} page permission(s)`)
    } else {
      toast.error(`Assigned ${result.successPageIds.length}, failed ${result.failed.length}`)
    }
  }

  const applyAssignError = (selectedIds: string[], message: string) => {
    const fallbackResponses = selectedIds.map((pageId) => ({
      pageId,
      pageName: businessPages.find((page) => page.id === pageId)?.name || "-",
      status: "failed" as const,
      message,
    }))
    setLatestResponses(fallbackResponses)
    toast.error(message)
  }

  const applyAddToBusinessResult = (
    selectedIds: string[],
    result: { successPageIds: string[]; failed: Array<{ pageId: string; message: string }> }
  ) => {
    const pageNameMap = new Map(businessPages.map((page) => [page.id, page.name]))
    const failedMap = new Map(result.failed.map((item) => [item.pageId, item.message]))
    const responses = selectedIds.map((pageId) => {
      const failedMessage = failedMap.get(pageId)
      return {
        pageId,
        pageName: pageNameMap.get(pageId) || "-",
        status: failedMessage ? "failed" : "success",
        message: failedMessage ? failedMessage : "Page added into business successfully",
      } satisfies LatestResponseItem
    })

    setLatestResponses(responses)

    if (result.failed.length === 0) {
      toast.success(`Added ${result.successPageIds.length} page(s) into business`)
    } else {
      toast.error(`Added ${result.successPageIds.length}, failed ${result.failed.length}`)
    }
  }

  const applyAddToBusinessError = (selectedIds: string[], message: string) => {
    const pageNameMap = new Map(businessPages.map((page) => [page.id, page.name]))
    setLatestResponses(
      selectedIds.map((pageId) => ({
        pageId,
        pageName: pageNameMap.get(pageId) || "-",
        status: "failed" as const,
        message,
      }))
    )
    toast.error(message)
  }

  const addPagesToBusiness = async (selectedIds: string[], businessId: string, token: string) => {
    try {
      setLoadingData(true)
      const result = await facebookService.addPagesToBusinessOwnedPagesBatch(
        selectedIds,
        businessId,
        token
      )
      applyAddToBusinessResult(selectedIds, result)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error"
      applyAddToBusinessError(selectedIds, message)
    } finally {
      setLoadingData(false)
    }
  }

  const removePagesFromBusiness = async (selectedIds: string[], businessId: string, token: string) => {
    try {
      setLoadingData(true)
      const result = await facebookService.removePagesFromBusinessBatch(
        selectedIds,
        businessId,
        token
      )
      const pageNameMap = new Map(businessPages.map((page) => [page.id, page.name]))
      setLatestResponses(
        selectedIds.map((pageId) => {
          const failedMessage = result.failed.find((item) => item.pageId === pageId)?.message
          return {
            pageId,
            pageName: pageNameMap.get(pageId) || "-",
            status: failedMessage ? "failed" : "success",
            message: failedMessage || "Page removed from business successfully",
          } satisfies LatestResponseItem
        })
      )
      if (result.failed.length === 0) {
        toast.success(`Removed ${result.successPageIds.length} page(s) from business`)
      } else {
        toast.error(`Removed ${result.successPageIds.length}, failed ${result.failed.length}`)
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error"
      const pageNameMap = new Map(businessPages.map((page) => [page.id, page.name]))
      setLatestResponses(
        selectedIds.map((pageId) => ({
          pageId,
          pageName: pageNameMap.get(pageId) || "-",
          status: "failed" as const,
          message,
        }))
      )
      toast.error(message)
    } finally {
      setLoadingData(false)
    }
  }

  const sharePagesToOtherBusiness = async (
    selectedIds: string[],
    targetBusinessId: string,
    token: string,
    mode: "basic" | "full"
  ) => {
    try {
      setLoadingData(true)
      const result = await facebookService.sharePagesToBusinessByAgencies(
        selectedIds,
        targetBusinessId,
        token,
        mode
      )
      const pageNameMap = new Map(businessPages.map((page) => [page.id, page.name]))
      setLatestResponses(
        selectedIds.map((pageId) => {
          const failedMessage = result.failed.find((item) => item.pageId === pageId)?.message
          return {
            pageId,
            pageName: pageNameMap.get(pageId) || "-",
            status: failedMessage ? "failed" : "success",
            message: failedMessage || "Page shared to target business successfully",
          } satisfies LatestResponseItem
        })
      )
      if (result.failed.length === 0) {
        toast.success(`Shared ${result.successPageIds.length} page(s) to target business`)
      } else {
        toast.error(`Shared ${result.successPageIds.length}, failed ${result.failed.length}`)
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error"
      const pageNameMap = new Map(businessPages.map((page) => [page.id, page.name]))
      setLatestResponses(
        selectedIds.map((pageId) => ({
          pageId,
          pageName: pageNameMap.get(pageId) || "-",
          status: "failed" as const,
          message,
        }))
      )
      toast.error(message)
    } finally {
      setLoadingData(false)
    }
  }

  const assignByUserToken = async (
    selectedIds: string[],
    businessId: string,
    userId: string,
    token: string,
    mode: "basic" | "full"
  ) => {
    try {
      setLoadingData(true)
      const result = await facebookService.assignUserToPagesByBusinessAssignedUsersBatch(
        selectedIds,
        businessId,
        userId,
        token,
        mode
      )
      applyAssignResult(selectedIds, result)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error"
      applyAssignError(selectedIds, message)
    } finally {
      setLoadingData(false)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- businessId kept for API consistency
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

  const handleAddressInputChange = (raw: string) => {
    setEditPageAddress(raw)
    const parts = raw.split(",").map((p) => p.trim())
    setEditPageStreet(parts[0] ?? "")
    setEditPageCity(parts[1] ?? "")
    setEditPageZip(parts[2] ?? "")
    setEditPageCountry(parts[3] ?? "USA")
  }

  const handleAddressPartChange = (
    field: "street" | "city" | "zip" | "country",
    value: string
  ) => {
    if (field === "street") setEditPageStreet(value)
    else if (field === "city") setEditPageCity(value)
    else if (field === "zip") setEditPageZip(value)
    else setEditPageCountry(value || "USA")
    const street = field === "street" ? value : editPageStreet
    const city = field === "city" ? value : editPageCity
    const zip = field === "zip" ? value : editPageZip
    const country = field === "country" ? value : editPageCountry
    setEditPageAddress([street, city, zip, country].filter(Boolean).join(", "))
  }

  const handleEmailInputChange = (raw: string) => {
    setEditPageEmail(raw)
  }

  const handleWebsiteInputChange = (raw: string) => {
    if (!raw.trim()) {
      setEditPageWebsite(raw)
      return
    }
    setEditPageWebsite(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
  }

  const handlePhoneInputChange = (raw: string) => {
    const trimmed = raw.trim()
    const matchedCode = [...PHONE_COUNTRY_CODES]
      .sort((a, b) => b.value.length - a.value.length)
      .find((c) => trimmed.startsWith(c.value))
    if (matchedCode) {
      setEditPagePhoneCode(matchedCode.value)
      setEditPagePhone(trimmed.slice(matchedCode.value.length).replace(/^\s+/, ""))
    } else {
      setEditPagePhone(raw)
    }
  }

  const handleRandPhone = () => {
    const picked = RAND_PHONE_NUMBERS[Math.floor(Math.random() * RAND_PHONE_NUMBERS.length)]
    handlePhoneInputChange(picked)
  }

  const handleLoadEditPageInfo = async (pageId: string) => {
    if (!pageId || !activeToken) return
    loadingPageIdRef.current = pageId
    setEditPageInfoLoading(true)
    try {
      const info = await facebookService.getPageInfo(activeToken, pageId)
      if (loadingPageIdRef.current !== pageId) return
      setEditPageAbout(info.about ?? "")
      setEditPageDescription(info.description ?? "")
      setEditPageCategoryList(info.category_list ?? [])
      setEditPageWebsite(info.website ?? "")
      const rawPhone = (info.phone ?? "").trim()
      const matchedCode = [...PHONE_COUNTRY_CODES]
        .sort((a, b) => b.value.length - a.value.length)
        .find((c) => rawPhone.startsWith(c.value))
      if (matchedCode) {
        setEditPagePhoneCode(matchedCode.value)
        setEditPagePhone(rawPhone.slice(matchedCode.value.length).replace(/^\s+/, "") ?? "")
      } else {
        setEditPagePhoneCode("+1")
        setEditPagePhone(rawPhone)
      }
      const loc = info.location
      const street = loc?.street ?? ""
      const city = loc?.city ?? ""
      const zip = loc?.zip ?? ""
      const country = loc?.country ?? "USA"
      setEditPageStreet(street)
      setEditPageCity(city)
      setEditPageZip(zip)
      setEditPageCountry(country || "USA")
      setEditPageAddress([street, city, zip, country].filter(Boolean).join(", "))
      const loadedEmail = info.emails?.[0] ?? ""
      setEditPageEmail(loadedEmail || "")
      const rawWebsite = (info.website ?? "").trim()
      const normWebsite = rawWebsite && !/^https?:\/\//i.test(rawWebsite) ? `https://${rawWebsite}` : rawWebsite
      setEditPageOriginal({
        about: info.about ?? "",
        description: info.description ?? "",
        website: normWebsite,
        phoneCode: matchedCode?.value ?? "+1",
        phone: matchedCode ? (rawPhone.slice(matchedCode.value.length).replace(/^\s+/, "") ?? "") : rawPhone,
        street,
        city,
        zip,
        country: country || "USA",
        email: loadedEmail || "",
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load page info")
      setEditPageOriginal(null)
    } finally {
      setEditPageInfoLoading(false)
    }
  }

  const hasEditPageChanges = useMemo(() => {
    if (!editPageOriginal) return false
    const websiteVal = editPageWebsite.trim()
    const normWebsite = websiteVal && !/^https?:\/\//i.test(websiteVal) ? `https://${websiteVal}` : websiteVal
    const phoneVal = editPagePhone.trim()
    const fullPhone = phoneVal ? `${editPagePhoneCode}${phoneVal}` : ""
    return (
      (editPageAbout ?? "") !== editPageOriginal.about ||
      (editPageDescription ?? "") !== editPageOriginal.description ||
      normWebsite !== editPageOriginal.website ||
      fullPhone !== `${editPageOriginal.phoneCode}${editPageOriginal.phone}` ||
      (editPageStreet ?? "") !== editPageOriginal.street ||
      (editPageCity ?? "") !== editPageOriginal.city ||
      (editPageZip ?? "") !== editPageOriginal.zip ||
      (editPageCountry ?? "") !== editPageOriginal.country ||
      (editPageEmail ?? "").trim() !== editPageOriginal.email
    )
  }, [
    editPageOriginal,
    editPageAbout,
    editPageDescription,
    editPageWebsite,
    editPagePhoneCode,
    editPagePhone,
    editPageStreet,
    editPageCity,
    editPageZip,
    editPageCountry,
    editPageEmail,
  ])

  const handleSaveEditPageInfo = async () => {
    if (!editPageId || !activeToken) return
    if (!hasEditPageChanges) {
      toast.error("No changes to save")
      return
    }
    setEditPageLoading(true)
    try {
      const websiteValue = editPageWebsite.trim()
      const websiteUrl = websiteValue
        ? /^https?:\/\//i.test(websiteValue)
          ? websiteValue
          : `https://${websiteValue}`
        : undefined
      const phoneNumber = editPagePhone.trim()
      const phoneValue = phoneNumber ? `${editPagePhoneCode}${phoneNumber}` : undefined
      const updates: Parameters<typeof facebookService.updatePageInfo>[2] = {
        about: editPageAbout || undefined,
        description: editPageDescription || undefined,
        website: websiteUrl,
        phone: phoneValue,
        email: (() => {
          const v = editPageEmail.trim()
          if (!v) return undefined
          return v.includes("@") ? v : `contact@${v}`
        })(),
      }
      const hasAddress =
        editPageStreet.trim() ||
        editPageCity.trim() ||
        editPageZip.trim() ||
        editPageCountry.trim()
      if (hasAddress) {
        updates.location = {
          street: editPageStreet.trim() || undefined,
          city: editPageCity.trim() || undefined,
          zip: editPageZip.trim() || undefined,
          country: editPageCountry.trim() || undefined,
        }
      }
      await facebookService.updatePageInfo(activeToken, editPageId, updates)
      const websiteVal = (websiteUrl ?? editPageWebsite.trim()) || ""
      const normWebsite =
        websiteVal && !/^https?:\/\//i.test(websiteVal) ? `https://${websiteVal}` : websiteVal
      setEditPageOriginal({
        about: editPageAbout ?? "",
        description: editPageDescription ?? "",
        website: normWebsite ?? "",
        phoneCode: editPagePhoneCode,
        phone: editPagePhone.trim(),
        street: editPageStreet.trim(),
        city: editPageCity.trim(),
        zip: editPageZip.trim(),
        country: editPageCountry.trim(),
        email: (editPageEmail ?? "").trim(),
      })
      toast.success("Page updated")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update page")
    } finally {
      setEditPageLoading(false)
    }
  }

  const handleCopyLatestResponse = async () => {
    if (latestResponses.length === 0) return

    const lines = latestResponses.map((item) => {
      const label = item.status === "success" ? "SUCCESS" : "FAILED"
      return `[${label}] ${item.pageId} (${item.pageName}): ${item.message}`
    })
    await copyToClipboard(lines.join("\n"))
  }

  const handlePushPageIds = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText()
      const trimmed = clipboardText.trim()
      if (!trimmed) {
        toast.error("Clipboard is empty")
        return
      }
      setPushedPageIdsInput((prev) => {
        const current = prev.trim()
        if (!current) return trimmed
        return `${prev}\n${trimmed}`
      })
      toast.success("Pushed clipboard text into area")
    } catch {
      toast.error("Unable to read clipboard")
    }
  }

  const handleClearPushedPageIds = () => {
    setPushedPageIdsInput("")
    toast.success("Cleared page ids area")
  }

  const getBulkPageIds = () =>
    pushedPageIdsInput
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)

  const executeBulkAction = async () => {
    const ids = getBulkPageIds()
    if (ids.length === 0) {
      toast.error("Please input page ids, one per line")
      return
    }
    if (!activeToken || !activeViewerId) {
      toast.error("Missing account user context")
      return
    }
    if (!bulkSourceBmId) {
      toast.error("Please select source BM")
      return
    }

    if (bulkActionType === "add-current-bm") {
      const sourceBm = businessRows.find((bm) => bm.id === bulkSourceBmId)
      const existingIdSet = new Set((sourceBm?.pages ?? []).map((page) => page.id))
      const idsToAdd = ids.filter((id) => !existingIdSet.has(id))
      const skippedCount = ids.length - idsToAdd.length

      if (idsToAdd.length === 0) {
        toast.error("All input page ids already exist in this BM")
        return
      }

      if (skippedCount > 0) {
        toast.message(`Skipped ${skippedCount} existing page id(s)`)
      }

      await addPagesToBusiness(idsToAdd, bulkSourceBmId, activeToken)
      return
    }

    if (bulkActionType === "assign-user-current-bm") {
      const resolvedTargetUserId =
        bulkTargetUserMode === "system-user" ? bulkTargetSystemUserId.trim() : bulkTargetUserId.trim()
      const targetUser = resolvedTargetUserId
      if (!targetUser) {
        toast.error("Please input target user id")
        return
      }
      await assignByUserToken(ids, bulkSourceBmId, targetUser, activeToken, taskMode)
      return
    }

    if (bulkActionType === "remove-user-current-bm") {
      const resolvedTargetUserId =
        bulkTargetUserMode === "system-user" ? bulkTargetSystemUserId.trim() : bulkTargetUserId.trim()
      const targetUser = resolvedTargetUserId
      if (!targetUser) {
        toast.error("Please input target user id")
        return
      }
      await deleteByUserToken(ids, targetUser, activeToken)
      return
    }

    if (bulkActionType === "remove-page-current-bm") {
      await removePagesFromBusiness(ids, bulkSourceBmId, activeToken)
      return
    }

    if (bulkActionType === "share-other-bm") {
      const targetBm = bulkTargetBmId.trim()
      if (!targetBm) {
        toast.error("Please input target BM id")
        return
      }
      await sharePagesToOtherBusiness(ids, targetBm, activeToken, taskMode)
    }
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

      const bmWithRoles = await Promise.allSettled(
        bmList.map(async (bm) => {
          const assignedRoles = await facebookService.getBusinessRolesForUser(token, bm.id, me.id)
          return {
            ...bm,
            permitted_roles: assignedRoles.length > 0 ? assignedRoles : (bm.permitted_roles ?? []),
          }
        })
      )

      const normalizedBusinesses = bmWithRoles.map((item, index) => {
        if (item.status === "fulfilled") return item.value
        const fallback = bmList[index]
        return {
          ...fallback,
          permitted_roles: fallback.permitted_roles ?? [],
        }
      })

      const bmPageGroups = await Promise.allSettled(
        normalizedBusinesses.map(async (bm) => {
          const [ownedPages, clientPages] = await Promise.all([
            facebookService.getBusinessPages(token, bm.id),
            facebookService.getBusinessClientPages(token, bm.id).catch(() => []),
          ])
          const uniquePages = Array.from(
            new Map([...ownedPages, ...clientPages].map((page) => [page.id, page])).values()
          )
          return {
            bm,
            pages: uniquePages.map((page) => ({
              ...page,
              businessId: bm.id,
              businessName: bm.name,
              pageSource: ownedPages.some((owned) => owned.id === page.id) ? "owned" : "client",
            })),
          }
        })
      )

      const flattenedBmPages = bmPageGroups
        .filter((item) => item.status === "fulfilled")
        .flatMap((item) =>
          (item as PromiseFulfilledResult<{ bm: FacebookBusiness; pages: BusinessPageRow[] }>).value.pages
        )

      const bmAssignedGroups = await Promise.allSettled(
        normalizedBusinesses.map(async (bm) => {
          const pagesInBm = flattenedBmPages
            .filter((page) => page.businessId === bm.id)
            .map((page) => page.id)
          const assignedPageIds =
            pagesInBm.length > 0
              ? await facebookService.getAssignedPageIdsInBusinessBatch(
                  token,
                  bm.id,
                  me.id,
                  pagesInBm
                )
              : []

          return {
            businessId: bm.id,
            assignedPageIds,
          }
        })
      )
      const bmPageIdSet = new Set(flattenedBmPages.map((item) => item.id))
      const pagesOutsideBm = managedPages.filter((page) => !bmPageIdSet.has(page.id))
      const nextAssignedByBusiness: Record<string, string[]> = {}
      for (const item of bmAssignedGroups) {
        if (item.status === "fulfilled") {
          nextAssignedByBusiness[item.value.businessId] = item.value.assignedPageIds
        }
      }

      setBusinesses(normalizedBusinesses)
      setBusinessPages(flattenedBmPages)
      setAssignedPageIdsByBusiness(nextAssignedByBusiness)
      setAllManagedPages(managedPages)
      setOutsidePages(pagesOutsideBm)
      setActiveViewerId(me.id)
      setOutsideSelectedPageIds([])
      setBmAllSelectedPageIds({})
      setBmAssignedSelectedPageIds({})
      setStatus("Crawl success.")
      lastCrawledTokenRef.current = token
    } catch (err: unknown) {
      lastCrawledTokenRef.current = token
      const message = err instanceof Error ? err.message : "Unknown error"
      setBusinesses([])
      setBusinessPages([])
      setAssignedPageIdsByBusiness({})
      setAllManagedPages([])
      setOutsidePages([])
      setActiveViewerId("")
      setOutsideSelectedPageIds([])
      setBmAllSelectedPageIds({})
      setBmAssignedSelectedPageIds({})
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
      setAssignedPageIdsByBusiness({})
      setAllManagedPages([])
      setOutsidePages([])
      setActiveViewerId("")
      setOutsideSelectedPageIds([])
      setBmAllSelectedPageIds({})
      setBmAssignedSelectedPageIds({})
      lastCrawledTokenRef.current = ""
      return
    }

    if (!activeToken) {
      setBusinesses([])
      setBusinessPages([])
      setAssignedPageIdsByBusiness({})
      setAllManagedPages([])
      setOutsidePages([])
      setActiveViewerId("")
      setOutsideSelectedPageIds([])
      setBmAllSelectedPageIds({})
      setBmAssignedSelectedPageIds({})
      setStatus("Select source and token to auto crawl pages.")
      lastCrawledTokenRef.current = ""
      return
    }

    if (mode === "system-user") {
      setStatus("Click Manage Page Info or Refresh to load pages.")
      return
    }

    if (lastCrawledTokenRef.current === activeToken && businesses.length > 0) {
      return
    }

    const timeout = setTimeout(() => {
      void crawlPages(activeToken)
    }, 2000)

    return () => clearTimeout(timeout)
  }, [isAdminVerified, activeToken, businesses.length, mode])

  useEffect(() => {
    setSelectedPageIds((prev) => prev.filter((id) => allPageIds.includes(id)))
  }, [allPageIds])

  const renderLatestResponseBlock = (
    title: string,
    data: Array<{ status: "success" | "failed"; message: string; id: string; name: string }>
  ) => {
    const successItems = data.filter((item) => item.status === "success")
    const failedItems = data.filter((item) => item.status === "failed")

    return (
      <div
        className={`space-y-2 rounded-xl p-3 backdrop-blur-[1px] ${
          failedItems.length === 0
            ? "border border-emerald-300 bg-white shadow-[0_0_0_1px_rgba(16,185,129,0.15),0_0_20px_rgba(16,185,129,0.22)]"
            : successItems.length === 0
              ? "border border-red-300 bg-white shadow-[0_0_0_1px_rgba(248,113,113,0.15),0_0_20px_rgba(248,113,113,0.22)]"
              : "border border-amber-200 bg-white shadow-[0_0_0_1px_rgba(251,191,36,0.10),0_0_16px_rgba(251,191,36,0.14)]"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-700">{title}</p>
          <Button
            size="icon"
            variant="outline"
            onClick={() => {
              const lines = data.map((item) => {
                const label = item.status === "success" ? "SUCCESS" : "FAILED"
                return `[${label}] ${item.id} (${item.name}): ${item.message}`
              })
              void copyToClipboard(lines.join("\n"))
            }}
            disabled={data.length === 0}
            className="h-7 w-7 cursor-pointer border-slate-300 bg-white hover:bg-slate-50 disabled:cursor-not-allowed"
            title="Copy latest response"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p
          className={`text-xs ${
            failedItems.length === 0
              ? "text-emerald-700"
              : successItems.length === 0
                ? "text-red-600"
                : "text-amber-700"
          }`}
        >
          {failedItems.length === 0
            ? `All items succeeded. Success: ${successItems.length}.`
            : successItems.length === 0
              ? `All items failed. Failed: ${failedItems.length}.`
              : `Some items failed. Success: ${successItems.length}, Failed: ${failedItems.length}.`}
        </p>
        <div className="max-h-60 overflow-y-auto">
          {failedItems.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600 marker:text-red-500">
              {failedItems.map((item, index) => (
                <li key={`failed-${item.id}-${index}`}>
                  <span className="font-mono font-semibold text-slate-800">{item.id}</span> ({item.name}):{" "}
                  <span className="text-red-500">{item.message}</span>
                </li>
              ))}
            </ul>
          )}
          {successItems.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 pt-2 text-xs text-slate-600 marker:text-emerald-600">
              {successItems.map((item, index) => (
                <li key={`success-${item.id}-${index}`}>
                  <span className="font-mono font-semibold text-slate-800">{item.id}</span> ({item.name}):{" "}
                  <span className="text-emerald-700">{item.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    )
  }

  return (
    <Card className="relative w-full rounded-2xl border-slate-200 bg-white shadow-lg">
        <div className="pointer-events-none absolute right-6 top-6 rounded-xl border border-slate-200 bg-white/90 p-2.5 shadow-sm">
          <Image src="/icon.png" alt="App icon" width={40} height={40} />
        </div>
        <CardContent className="space-y-8 p-8">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight">Page Manager</h2>
            <p className="text-sm text-slate-600">{status}</p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <Button
              variant="outline"
              onClick={() => {
                setMode("system-user")
                setSystemUserManagePageInfoVisible(false)
                setBusinesses([])
                setBusinessPages([])
                setAssignedPageIdsByBusiness({})
                setAllManagedPages([])
                setOutsidePages([])
                setSelectedPageIds([])
                lastCrawledTokenRef.current = ""
              }}
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
              onClick={() => {
                setMode("account-user")
                setSystemUserManagePageInfoVisible(false)
                setEditPageId("")
                setEditPageSearchQuery("")
                setEditPageOriginal(null)
              }}
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
            <div className="grid grid-cols-[9rem_minmax(0,1fr)_auto] gap-x-2 gap-y-2">
              <select
                value={selectedBmFilter}
                onChange={(e) => setSelectedBmFilter(e.target.value)}
                className="h-10 w-full rounded-md border border-slate-300 bg-slate-50/80 px-3 text-sm text-slate-700 shadow-sm"
                disabled={!isAdminVerified || systemUsers.length === 0}
                title="Filter by Business Manager"
              >
                <option value="">All BMs</option>
                {bmFilterOptions.map((bm) => (
                  <option key={bm.id} value={bm.id}>
                    {bm.name}
                  </option>
                ))}
              </select>
              <select
                value={selectedSystemUserId}
                onChange={(e) => setSelectedSystemUserId(e.target.value)}
                className="h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm"
                disabled={!isAdminVerified || filteredSystemUsers.length === 0}
              >
                <option value="" disabled>
                  {!isAdminVerified
                    ? "Please enter admin password first"
                    : filteredSystemUsers.length === 0
                      ? selectedBmFilter
                        ? "No system users in this BM"
                        : "No system users"
                      : "Select system user (name • app • id)"}
                </option>
                {filteredSystemUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {`${user.name} • ${user.appName || "(no-app)"} • ${user.id}`}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => copyToClipboard(selectedSystemUser?.token ?? "")}
                  disabled={!selectedSystemUser?.token}
                  className="h-10 w-10 shrink-0 cursor-pointer border-slate-300 bg-white hover:bg-slate-50"
                  title="Copy selected token"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRefreshPages}
                  disabled={loadingData || !selectedSystemUser?.token}
                  className="h-10 shrink-0 cursor-pointer border-slate-300 bg-white px-3 text-xs hover:bg-slate-50"
                  title="Refresh pages"
                >
                  <RefreshCcw className={`mr-1 h-3.5 w-3.5 ${loadingData ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
              <p className="flex items-center text-xs text-slate-600">Select System Admin</p>
              {isSelectedUserAdmin ? (
                <div className="flex h-8 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-600">
                  Using selected user (admin)
                </div>
              ) : (
                <select
                  value={selectedAdminUserIndex}
                  onChange={(e) => setSelectedAdminUserIndex(e.target.value)}
                  className="h-8 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 pr-10 text-xs shadow-sm [background-position:right_0.7rem_center] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                  disabled={
                    !isAdminVerified ||
                    filteredAdminSystemUsers.length === 0 ||
                    selectedPageIds.length === 0
                  }
                >
                  <option value="" disabled>
                    {!isAdminVerified
                      ? "Please enter admin password first"
                      : selectedPageIds.length === 0
                        ? "Select pages in the table first"
                        : filteredAdminSystemUsers.length === 0
                          ? "No admin in same BM and app"
                          : "Select system admin"}
                  </option>
                  {filteredAdminSystemUsers.map((user, index) => (
                    <option key={`admin-${index}`} value={String(index)}>
                      {`${user.name} • ${user.appName || "(no-app)"} • ${user.id}`}
                    </option>
                  ))}
                </select>
              )}
              <div className="flex items-center">
                <Button
                    size="sm"
                    variant={systemUserManagePageInfoVisible ? "secondary" : "outline"}
                    onClick={async () => {
                      const next = !systemUserManagePageInfoVisible
                      setSystemUserManagePageInfoVisible(next)
                      if (next && selectedSystemUser?.token) {
                        await handleRefreshPages()
                      }
                    }}
                    disabled={!selectedSystemUser?.token}
                    className={cn(
                      "ml-auto h-8 cursor-pointer px-3 text-xs disabled:cursor-not-allowed",
                      systemUserManagePageInfoVisible
                        ? "border border-slate-300 bg-slate-100 hover:bg-slate-200"
                        : "border-slate-300 bg-white hover:bg-slate-50"
                    )}
                    title={systemUserManagePageInfoVisible ? "Hide Manage Page Info" : "Show Manage Page Info and load pages"}
                  >
                    Manage Page Info
                    {systemUserManagePageInfoVisible ? (
                      <ChevronUp className="ml-1 h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="ml-1 h-3.5 w-3.5" />
                    )}
                  </Button>
              </div>
              <div className="col-span-3">
                <p className="text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-800">Note:</span> Delete works only when the selected system user and system admin are in the same app.
                </p>
                {systemUserManagePageInfoVisible && (
                <div className="mt-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div
                    className="mb-4 flex cursor-pointer items-center justify-between gap-3"
                    onClick={() => setEditPageBlockCollapsed((c) => !c)}
                    onKeyDown={(e) => e.key === "Enter" && setEditPageBlockCollapsed((c) => !c)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <h3 className="text-lg font-semibold tracking-tight">Manage Page Info</h3>
                      {editPageBlockCollapsed ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                      ) : (
                        <ChevronUp className="h-4 w-4 shrink-0 text-slate-500" />
                      )}
                    </div>
                    <div
                      className="relative w-56 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={editPageSearchQuery}
                        onChange={(e) => setEditPageSearchQuery(e.target.value)}
                        placeholder="Search by name or ID..."
                        className="h-9 pl-8 text-xs"
                      />
                    </div>
                  </div>
                  {activeToken && (() => {
                    const editPageOptions = allManagedPages
                    if (editPageOptions.length === 0) {
                      return (
                        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                          No pages from /me/accounts. Click Refresh to load pages for this system user.
                        </p>
                      )
                    }
                    const filteredOptions = editPageSearchQuery.trim()
                      ? editPageOptions.filter(
                          (p) =>
                            p.name.toLowerCase().includes(editPageSearchQuery.trim().toLowerCase()) ||
                            p.id.includes(editPageSearchQuery.trim())
                        )
                      : editPageOptions
                    return (
                      <div className="space-y-3">
                        <div className="max-h-80 overflow-y-auto rounded-md border border-slate-200 bg-white">
                          {filteredOptions.length === 0 ? (
                            <p className="p-3 text-center text-xs text-slate-500">No pages match</p>
                          ) : (
                            <ul className="divide-y divide-slate-100">
                              {filteredOptions.map((p) => (
                                <EditPageListItem
                                  key={p.id}
                                  page={p}
                                  isSelected={editPageId === p.id}
                                  isLoading={editPageInfoLoading && editPageId === p.id}
                                  disabled={!activeToken || editPageInfoLoading}
                                  onSelect={() => {
                                    setEditPageId(p.id)
                                    loadingPageIdRef.current = p.id
                                    void handleLoadEditPageInfo(p.id)
                                  }}
                                />
                              ))}
                            </ul>
                          )}
                        </div>
                        {!editPageBlockCollapsed && editPageId && (
                          <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2">
                            <div className="space-y-4">
                              <div>
                                <label className="text-[11px] text-slate-500">About</label>
                                <Input
                                  value={editPageAbout}
                                  onChange={(e) => setEditPageAbout(e.target.value)}
                                  placeholder="About"
                                  className="mt-0.5 h-8 w-full text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] text-slate-500">Category</label>
                                <div className="mt-0.5 min-h-8 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                                  {editPageCategoryList.length > 0
                                    ? editPageCategoryList.map((c) => c.name).join(", ")
                                    : "—"}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[11px] text-slate-500">Address</label>
                                <div className="mt-0.5 flex gap-2">
                                  <Input
                                    value={editPageAddress}
                                    onChange={(e) => handleAddressInputChange(e.target.value)}
                                    onPaste={(e) => {
                                      const text = e.clipboardData.getData("text")
                                      e.preventDefault()
                                      handleAddressInputChange(text)
                                    }}
                                    placeholder="Street, city, zip, country"
                                    className="h-8 flex-1 text-xs"
                                  />
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={async () => {
                                      try {
                                        const text = await navigator.clipboard.readText()
                                        handleAddressInputChange(text)
                                        toast.success("Address pasted and split")
                                      } catch {
                                        toast.error("Failed to read clipboard")
                                      }
                                    }}
                                    className="h-8 w-8 shrink-0 cursor-pointer border-slate-300 bg-white hover:bg-slate-50"
                                    title="Paste"
                                  >
                                    <ClipboardPaste className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={() => {
                                      setEditPageAddress("")
                                      setEditPageStreet("")
                                      setEditPageCity("")
                                      setEditPageZip("")
                                      setEditPageCountry("USA")
                                      toast.success("Address cleared")
                                    }}
                                    className="h-8 w-8 shrink-0 cursor-pointer border-red-300 bg-red-50 text-red-600 hover:bg-red-100"
                                    title="Clear"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <div>
                                    <label className="text-[10px] text-slate-400">Street</label>
                                    <Input
                                      value={editPageStreet}
                                      onChange={(e) => handleAddressPartChange("street", e.target.value)}
                                      placeholder="Street"
                                      className="mt-0.5 h-8 text-xs"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-slate-400">City</label>
                                    <Input
                                      value={editPageCity}
                                      onChange={(e) => handleAddressPartChange("city", e.target.value)}
                                      placeholder="City"
                                      className="mt-0.5 h-8 text-xs"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-slate-400">Zip</label>
                                    <Input
                                      value={editPageZip}
                                      onChange={(e) => handleAddressPartChange("zip", e.target.value)}
                                      placeholder="Zip"
                                      className="mt-0.5 h-8 text-xs"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-slate-400">Country</label>
                                    <Input
                                      value={editPageCountry}
                                      onChange={(e) => handleAddressPartChange("country", e.target.value)}
                                      placeholder="Country"
                                      className="mt-0.5 h-8 text-xs"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-4">
                              <div>
                                <label className="text-[11px] text-slate-500">Description</label>
                                <Input
                                  value={editPageDescription}
                                  onChange={(e) => setEditPageDescription(e.target.value)}
                                  placeholder="Description"
                                  className="mt-0.5 h-8 w-full text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] text-slate-500">Website</label>
                                <Input
                                  value={editPageWebsite}
                                  onChange={(e) => handleWebsiteInputChange(e.target.value)}
                                  placeholder="example.com or sub.example.com"
                                  className="mt-0.5 h-8 w-full text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] text-slate-500">Phone</label>
                                <div className="mt-0.5 flex items-center gap-2">
                                  <select
                                    value={editPagePhoneCode}
                                    onChange={(e) => setEditPagePhoneCode(e.target.value)}
                                    className="h-8 w-[110px] shrink-0 rounded-md border border-slate-300 bg-white px-2 text-xs"
                                  >
                                    {PHONE_COUNTRY_CODES.map((c) => (
                                      <option key={c.value} value={c.value}>
                                        {c.label}
                                      </option>
                                    ))}
                                  </select>
                                  <Input
                                    value={editPagePhone}
                                    onChange={(e) => handlePhoneInputChange(e.target.value)}
                                    placeholder="Phone number"
                                    className="h-8 flex-1 text-xs"
                                  />
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    type="button"
                                    onClick={handleRandPhone}
                                    className="h-8 w-8 shrink-0 cursor-pointer border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100"
                                    title="Random phone number"
                                  >
                                    <Dices className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            <div>
                              <label className="text-[11px] text-slate-500">Email</label>
                              <div className="mt-0.5 flex gap-2">
                                <Input
                                  value={editPageEmail}
                                  onChange={(e) => handleEmailInputChange(e.target.value)}
                                  placeholder="contact@example.com"
                                  className="h-8 flex-1 text-xs"
                                />
                                <select
                                  value={(() => {
                                    const domain = (editPageEmail.includes("@")
                                      ? editPageEmail.split("@").pop() ?? ""
                                      : editPageEmail
                                    ).toLowerCase()
                                    return EMAIL_ORIGINS.find((o) => o.toLowerCase() === domain) ?? ""
                                  })()}
                                  onChange={(e) => {
                                    const v = e.target.value
                                    setEditPageEmail(v ? `contact@${v}` : "")
                                  }}
                                  className="h-8 w-[140px] shrink-0 rounded-md border border-slate-300 bg-white px-2 text-xs"
                                >
                                  <option value="">Select origin</option>
                                  {EMAIL_ORIGINS.map((origin) => (
                                    <option key={origin} value={origin}>
                                      {origin}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {!editPageBlockCollapsed && editPageId && (
                        <div className="mt-4 flex justify-end">
                          <Button
                            size="sm"
                            onClick={() => void handleSaveEditPageInfo()}
                            disabled={editPageLoading || !activeToken || !hasEditPageChanges}
                            className="cursor-pointer bg-blue-600 px-4 text-xs text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {editPageLoading ? "Updating..." : "Update"}
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })()}
                </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <Input
                value={accountTokenInput}
                onChange={(e) => {
                  const next = e.target.value
                  setAccountTokenInput(next)
                  if (typeof window !== "undefined") {
                    localStorage.setItem(ACCOUNT_TOKEN_STORAGE_KEY, next)
                  }
                }}
                placeholder="Paste account user access token"
                disabled={!isAdminVerified}
                className="disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={() => copyToClipboard(accountTokenInput.trim())}
                disabled={!accountTokenInput.trim()}
                className="h-10 w-10 cursor-pointer border-slate-300 bg-white hover:bg-slate-50"
                title="Copy input token"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRefreshPages}
                disabled={loadingData || !accountTokenInput.trim()}
                className="h-10 cursor-pointer border-slate-300 bg-white px-3 text-xs hover:bg-slate-50"
                title="Refresh pages"
              >
                <RefreshCcw className={`mr-1 h-3.5 w-3.5 ${loadingData ? "animate-spin" : ""}`} />
                Refresh
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
                    className="h-8 cursor-pointer rounded-r-none border-red-200 bg-white px-3 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:text-red-300"
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Delete Selected
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedPageIds([])}
                    disabled={selectedPageIds.length === 0}
                    className="-ml-px h-8 cursor-pointer rounded-l-none border-red-200 bg-white px-3 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:text-red-300"
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Clear Selected
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
                    {allManagedPages.map((row, index) => (
                      <PageTableRow
                        key={`${row.id}-${index}`}
                        index={index}
                        page={row}
                        checked={selectedPageIds.includes(row.id)}
                        onRowClick={() => {
                          const isChecked = selectedPageIds.includes(row.id)
                          setSelectedPageIds((prev) =>
                            isChecked ? prev.filter((id) => id !== row.id) : [...prev, row.id]
                          )
                        }}
                        onCheckboxChange={(checked) => {
                          setSelectedPageIds((prev) =>
                            checked ? [...new Set([...prev, row.id])] : prev.filter((id) => id !== row.id)
                          )
                        }}
                      />
                    ))}
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
              {latestResponses.length > 0 &&
                renderLatestResponseBlock(
                  "Latest Response",
                  latestResponses.map((item) => ({
                    status: item.status,
                    message: item.message,
                    id: item.pageId,
                    name: item.pageName,
                  }))
                )}
              <div className="grid grid-cols-1 items-stretch gap-3 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[1.5fr_1fr]">
                <div className="flex h-full flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-700">Page IDs Area</p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void copyToClipboard(pushedPageIdsInput)}
                        disabled={!pushedPageIdsInput.trim()}
                        className="h-8 cursor-pointer border-emerald-200 bg-white px-3 text-xs text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 disabled:cursor-not-allowed disabled:text-emerald-300"
                      >
                        <Copy className="mr-1 h-3.5 w-3.5" />
                        Copy
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handlePushPageIds()}
                        className="h-8 cursor-pointer border-blue-200 bg-white px-3 text-xs text-blue-700 hover:bg-blue-50 hover:text-blue-800 disabled:cursor-not-allowed disabled:text-blue-300"
                      >
                        <ClipboardPaste className="mr-1 h-3.5 w-3.5" />
                        Paste
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleClearPushedPageIds}
                        disabled={!pushedPageIdsInput.trim()}
                        className="h-8 cursor-pointer border-red-200 bg-white px-3 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:text-red-300"
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        Clear
                      </Button>
                    </div>
                  </div>
                  <textarea
                    value={pushedPageIdsInput}
                    onChange={(e) => setPushedPageIdsInput(e.target.value)}
                    placeholder={"Input page ids, one per line\nExample:\n1234567890\n9988776655"}
                    className="h-full min-h-28 w-full flex-1 resize-y rounded-md border border-slate-300 p-2 text-xs outline-none ring-0 focus:border-slate-400"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">Actions</p>
                  <select
                    value={bulkSourceBmId}
                    onChange={(e) => {
                      setBulkSourceBmId(e.target.value)
                      setEditPageId("")
                      setEditPageSearchQuery("")
                      setEditPageOriginal(null)
                    }}
                    className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs shadow-sm"
                  >
                    <option value="">
                      {adminBusinessRows.length > 0 ? "Select source BM (admin only)" : "No admin BM available"}
                    </option>
                    {adminBusinessRows.map((bm) => (
                      <option key={`bulk-source-${bm.id}`} value={bm.id}>
                        {bm.name} - {bm.id}
                      </option>
                    ))}
                  </select>
                  <select
                    value={bulkActionType}
                    onChange={(e) => {
                        setBulkActionType(
                          e.target.value as
                            | "share-other-bm"
                            | "add-current-bm"
                            | "assign-user-current-bm"
                            | "remove-user-current-bm"
                            | "remove-page-current-bm"
                            | "create-system-user"
                            | "edit-system-user"
                            | "manage-asset-groups"
                            | "edit-page-info"
                        )
                        if (e.target.value !== "edit-page-info") {
                          setEditPageId("")
                          setEditPageSearchQuery("")
                          setEditPageOriginal(null)
                        }
                      }}
                    className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs shadow-sm"
                    disabled={!bulkSourceBmId || allowedBulkActions.length === 0}
                  >
                    {allowedBulkActions.length === 0 ? (
                      <option value="">No actions (admin BM only)</option>
                    ) : (
                      allowedBulkActions.map((action) => (
                        <option key={`bulk-action-${action.value}`} value={action.value}>
                          {action.label}
                        </option>
                      ))
                    )}
                  </select>
                  {bulkActionType === "create-system-user" && bulkSourceBmId && (
                    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/50 p-2">
                      <p className="text-xs font-medium text-slate-600">Create System User</p>
                      <p className="text-[11px] text-slate-500">
                        Current: {createBmSystemUsersLoading ? "..." : `${createBmSystemUsers.length} system user(s)`}
                        {createBmSystemUsers.length > 0 && (
                          <span className="ml-1">
                            ({createBmSystemUsers.filter((u) => u.role === "ADMIN").length} ADMIN,{" "}
                            {createBmSystemUsers.filter((u) => u.role === "EMPLOYEE").length} EMPLOYEE)
                          </span>
                        )}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          value={createSystemUserName}
                          onChange={(e) => setCreateSystemUserName(e.target.value)}
                          placeholder="System user name"
                          className="h-8 flex-1 min-w-[120px] text-xs"
                        />
                        <select
                          value={createSystemUserRole}
                          onChange={(e) => setCreateSystemUserRole(e.target.value as "ADMIN" | "EMPLOYEE")}
                          className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs"
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="EMPLOYEE">EMPLOYEE</option>
                        </select>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleCreateSystemUser()}
                          disabled={
                            !activeToken ||
                            !createSystemUserName.trim() ||
                            createSystemUserLoading
                          }
                          className="h-8 cursor-pointer border-slate-300 bg-white px-3 text-xs text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed"
                        >
                          {createSystemUserLoading ? "Creating..." : "Create"}
                        </Button>
                      </div>
                    </div>
                  )}
                  {bulkActionType === "edit-system-user" && bulkSourceBmId && (
                    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/50 p-2">
                      <p className="text-xs font-medium text-slate-600">Edit System User</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={editSystemUserId}
                          onChange={(e) => {
                            const id = e.target.value
                            setEditSystemUserId(id)
                            const user = createBmSystemUsers.find((u) => u.id === id)
                            setEditSystemUserName(user?.name ?? "")
                          }}
                          className="h-8 flex-1 min-w-[180px] rounded-md border border-slate-300 bg-white px-2 text-xs"
                        >
                          <option value="">
                            {createBmSystemUsersLoading
                              ? "Loading..."
                              : createBmSystemUsers.length > 0
                              ? "Select system user"
                              : "No system users"}
                          </option>
                          {createBmSystemUsers.map((user) => (
                            <option key={user.id} value={user.id}>
                              {`${user.name} • ${user.role || "-"} • ${user.id}`}
                            </option>
                          ))}
                        </select>
                        <Input
                          value={editSystemUserName}
                          onChange={(e) => setEditSystemUserName(e.target.value)}
                          placeholder="New name"
                          className="h-8 flex-1 min-w-[120px] text-xs"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleEditSystemUser()}
                          disabled={
                            !activeToken ||
                            !editSystemUserId ||
                            !editSystemUserName.trim() ||
                            editSystemUserLoading
                          }
                          className="h-8 cursor-pointer border-slate-300 bg-white px-3 text-xs text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed"
                        >
                          {editSystemUserLoading ? "Updating..." : "Update"}
                        </Button>
                      </div>
                    </div>
                  )}
                  {bulkActionType === "share-other-bm" && (
                    <div className="space-y-2">
                      <Input
                        value={bulkTargetBmId}
                        onChange={(e) => setBulkTargetBmId(e.target.value)}
                        placeholder="Target BM ID"
                        className="h-9 text-xs"
                      />
                    </div>
                  )}
                  {bulkActionType !== "add-current-bm" &&
                    bulkActionType !== "remove-page-current-bm" &&
                    bulkActionType !== "share-other-bm" &&
                    bulkActionType !== "create-system-user" &&
                    bulkActionType !== "edit-system-user" &&
                    bulkActionType !== "manage-asset-groups" &&
                    bulkActionType !== "edit-page-info" && (
                    <div className="space-y-2">
                      <select
                        value={bulkTargetUserMode}
                        onChange={(e) => setBulkTargetUserMode(e.target.value as "system-user" | "manual")}
                        className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs shadow-sm"
                      >
                        <option value="system-user">Target from system users</option>
                        <option value="manual">Target by manual ID</option>
                      </select>
                      {bulkTargetUserMode === "system-user" ? (
                        <select
                          value={bulkTargetSystemUserId}
                          onChange={(e) => setBulkTargetSystemUserId(e.target.value)}
                          className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs shadow-sm"
                        >
                          <option value="">
                            {bulkBmSystemUsersLoading
                              ? "Loading system users..."
                              : bulkBmSystemUsers.length > 0
                              ? "Select target system user"
                              : "No system users in selected BM"}
                          </option>
                          {bulkBmSystemUsers.map((user, index) => (
                            <option key={`target-system-user-${index}`} value={user.id}>
                              {`${user.name} • ${user.role || "(no-role)"} • ${user.id}`}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          value={bulkTargetUserId}
                          onChange={(e) => setBulkTargetUserId(e.target.value)}
                          placeholder="Target User ID"
                          className="h-9 text-xs"
                        />
                      )}
                    </div>
                  )}
                  {(bulkActionType === "assign-user-current-bm" || bulkActionType === "share-other-bm") && (
                    <select
                      value={taskMode}
                      onChange={(e) => setTaskMode(e.target.value as "basic" | "full")}
                      className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs shadow-sm"
                    >
                      <option value="basic">{BASIC_LABEL}</option>
                      <option value="full">{FULL_LABEL}</option>
                    </select>
                  )}
                  {bulkActionType !== "create-system-user" &&
                    bulkActionType !== "edit-system-user" &&
                    bulkActionType !== "manage-asset-groups" &&
                    bulkActionType !== "edit-page-info" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void executeBulkAction()}
                        disabled={!pushedPageIdsInput.trim() || !bulkSourceBmId || allowedBulkActions.length === 0 || loadingData}
                        className="h-9 w-full cursor-pointer border-slate-300 bg-slate-50 px-3 text-xs text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed"
                      >
                        Run Action
                      </Button>
                      <p className="text-[11px] text-slate-500">
                        IDs are read line-by-line. Use Push to preview selection, then Run Action.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {bulkActionType === "manage-asset-groups" && bulkSourceBmId && activeToken && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="mb-4 text-lg font-semibold tracking-tight">Manage Asset Groups</h3>
                  <AssetGroupBlock
                    activeToken={activeToken}
                    businessId={bulkSourceBmId}
                    systemUsers={createBmSystemUsers}
                    pageIdsInput={pushedPageIdsInput}
                  />
                </div>
              )}

              {bulkActionType === "edit-page-info" && bulkSourceBmId && activeToken && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  {(() => {
                    const pagesInBm = new Set(businessPages.filter((bp) => bp.businessId === bulkSourceBmId).map((bp) => bp.id))
                    const editPageOptions = allManagedPages.filter((p) => pagesInBm.has(p.id))
                    if (editPageOptions.length === 0) {
                      return (
                        <>
                          <div
                            className="mb-4 flex cursor-pointer items-center justify-between gap-3"
                            onClick={() => setEditPageBlockCollapsed((c) => !c)}
                            onKeyDown={(e) => e.key === "Enter" && setEditPageBlockCollapsed((c) => !c)}
                            role="button"
                            tabIndex={0}
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              <h3 className="text-lg font-semibold tracking-tight">Manage Page Info</h3>
                              {editPageBlockCollapsed ? (
                                <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                              ) : (
                                <ChevronUp className="h-4 w-4 shrink-0 text-slate-500" />
                              )}
                            </div>
                          </div>
                          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                            No pages in this BM are in /me/accounts. Assign pages to your account first before editing.
                          </p>
                        </>
                      )
                    }
                    const filteredOptions = editPageSearchQuery.trim()
                      ? editPageOptions.filter(
                          (p) =>
                            p.name.toLowerCase().includes(editPageSearchQuery.trim().toLowerCase()) ||
                            p.id.includes(editPageSearchQuery.trim())
                        )
                      : editPageOptions
                    return (
                  <>
                  <div
                    className="mb-4 flex cursor-pointer items-center justify-between gap-3"
                    onClick={() => setEditPageBlockCollapsed((c) => !c)}
                    onKeyDown={(e) => e.key === "Enter" && setEditPageBlockCollapsed((c) => !c)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <h3 className="text-lg font-semibold tracking-tight">Manage Page Info</h3>
                      {editPageBlockCollapsed ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                      ) : (
                        <ChevronUp className="h-4 w-4 shrink-0 text-slate-500" />
                      )}
                    </div>
                    <div
                      className="relative w-56 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={editPageSearchQuery}
                        onChange={(e) => setEditPageSearchQuery(e.target.value)}
                        placeholder="Search by name or ID..."
                        className="h-9 pl-8 text-xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="max-h-80 overflow-y-auto rounded-md border border-slate-200 bg-white">
                        {filteredOptions.length === 0 ? (
                          <p className="p-3 text-center text-xs text-slate-500">No pages match</p>
                        ) : (
                          <ul className="divide-y divide-slate-100">
                            {filteredOptions.map((p) => (
                              <EditPageListItem
                                key={p.id}
                                page={p}
                                isSelected={editPageId === p.id}
                                isLoading={editPageInfoLoading && editPageId === p.id}
                                disabled={!activeToken || editPageInfoLoading}
                                onSelect={() => {
                                  setEditPageId(p.id)
                                  loadingPageIdRef.current = p.id
                                  void handleLoadEditPageInfo(p.id)
                                }}
                              />
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                      {!editPageBlockCollapsed && editPageId && (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-4">
                          <div>
                            <label className="text-[11px] text-slate-500">About</label>
                            <Input
                              value={editPageAbout}
                              onChange={(e) => setEditPageAbout(e.target.value)}
                              placeholder="About"
                              className="mt-0.5 h-8 w-full text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-500">Category</label>
                            <div className="mt-0.5 min-h-8 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                              {editPageCategoryList.length > 0
                                ? editPageCategoryList.map((c) => c.name).join(", ")
                                : "—"}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[11px] text-slate-500">Address</label>
                            <div className="mt-0.5 flex gap-2">
                              <Input
                                value={editPageAddress}
                                onChange={(e) => handleAddressInputChange(e.target.value)}
                                onPaste={(e) => {
                                  const text = e.clipboardData.getData("text")
                                  e.preventDefault()
                                  handleAddressInputChange(text)
                                }}
                                placeholder="Street, city, zip, country"
                                className="h-8 flex-1 text-xs"
                              />
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={async () => {
                                  try {
                                    const text = await navigator.clipboard.readText()
                                    handleAddressInputChange(text)
                                    toast.success("Address pasted and split")
                                  } catch {
                                    toast.error("Failed to read clipboard")
                                  }
                                }}
                                className="h-8 w-8 shrink-0 cursor-pointer border-emerald-300 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                title="Paste"
                              >
                                <ClipboardPaste className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => {
                                  setEditPageAddress("")
                                  setEditPageStreet("")
                                  setEditPageCity("")
                                  setEditPageZip("")
                                  setEditPageCountry("USA")
                                  toast.success("Address cleared")
                                }}
                                className="h-8 w-8 shrink-0 cursor-pointer border-red-300 bg-red-50 text-red-600 hover:bg-red-100"
                                title="Clear"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div>
                                <label className="text-[10px] text-slate-400">Street</label>
                                <Input
                                  value={editPageStreet}
                                  onChange={(e) => handleAddressPartChange("street", e.target.value)}
                                  placeholder="Street"
                                  className="mt-0.5 h-8 text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400">City</label>
                                <Input
                                  value={editPageCity}
                                  onChange={(e) => handleAddressPartChange("city", e.target.value)}
                                  placeholder="City"
                                  className="mt-0.5 h-8 text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400">Zip</label>
                                <Input
                                  value={editPageZip}
                                  onChange={(e) => handleAddressPartChange("zip", e.target.value)}
                                  placeholder="Zip"
                                  className="mt-0.5 h-8 text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400">Country</label>
                                <Input
                                  value={editPageCountry}
                                  onChange={(e) => handleAddressPartChange("country", e.target.value)}
                                  placeholder="Country"
                                  className="mt-0.5 h-8 text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="text-[11px] text-slate-500">Description</label>
                            <Input
                              value={editPageDescription}
                              onChange={(e) => setEditPageDescription(e.target.value)}
                              placeholder="Description"
                              className="mt-0.5 h-8 w-full text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-500">Website</label>
                            <Input
                              value={editPageWebsite}
                              onChange={(e) => handleWebsiteInputChange(e.target.value)}
                              placeholder="example.com or sub.example.com"
                              className="mt-0.5 h-8 w-full text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-500">Phone</label>
                            <div className="mt-0.5 flex items-center gap-2">
                              <select
                                value={editPagePhoneCode}
                                onChange={(e) => setEditPagePhoneCode(e.target.value)}
                                className="h-8 w-[110px] shrink-0 rounded-md border border-slate-300 bg-white px-2 text-xs"
                              >
                                {PHONE_COUNTRY_CODES.map((c) => (
                                  <option key={c.value} value={c.value}>
                                    {c.label}
                                  </option>
                                ))}
                              </select>
                              <Input
                                value={editPagePhone}
                                onChange={(e) => handlePhoneInputChange(e.target.value)}
                                placeholder="Phone number"
                                className="h-8 flex-1 text-xs"
                              />
                              <Button
                                size="icon"
                                variant="outline"
                                type="button"
                                onClick={handleRandPhone}
                                className="h-8 w-8 shrink-0 cursor-pointer border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100"
                                title="Random phone number"
                              >
                                <Dices className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-500">Email</label>
                            <div className="mt-0.5 flex gap-2">
                              <Input
                                value={editPageEmail}
                                onChange={(e) => handleEmailInputChange(e.target.value)}
                                placeholder="contact@example.com"
                                className="h-8 flex-1 text-xs"
                              />
                              <select
                                value={(() => {
                                  const domain = (editPageEmail.includes("@")
                                    ? editPageEmail.split("@").pop() ?? ""
                                    : editPageEmail
                                  ).toLowerCase()
                                  return EMAIL_ORIGINS.find((o) => o.toLowerCase() === domain) ?? ""
                                })()}
                                onChange={(e) => {
                                  const v = e.target.value
                                  setEditPageEmail(v ? `contact@${v}` : "")
                                }}
                                className="h-8 w-[140px] shrink-0 rounded-md border border-slate-300 bg-white px-2 text-xs"
                              >
                                <option value="">Select origin</option>
                                {EMAIL_ORIGINS.map((origin) => (
                                  <option key={origin} value={origin}>
                                    {origin}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {!editPageBlockCollapsed && editPageId && (
                      <div className="mt-4 flex justify-end">
                        <Button
                          size="sm"
                          onClick={() => void handleSaveEditPageInfo()}
                          disabled={editPageLoading || !activeToken || !hasEditPageChanges}
                          className="cursor-pointer bg-blue-600 px-4 text-xs text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {editPageLoading ? "Updating..." : "Update"}
                        </Button>
                      </div>
                    )}
                  </div>
                  </>)
                  })()}
                </div>
              )}

              <div className="space-y-3">
                <h3 className="text-lg font-semibold tracking-tight">Business Managers</h3>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full table-fixed text-sm">
                    <thead className="bg-slate-50">
                      <tr className="text-left font-semibold">
                        <th className="w-[64px] p-3">#</th>
                        <th className="w-[210px] p-3">BM ID</th>
                        <th className="p-3">BM Name</th>
                        <th className="w-[220px] p-3">Role</th>
                        <th className="w-[120px] p-3">Total Pages</th>
                      </tr>
                    </thead>
                    <tbody>
                      {businessRows.map((bm, index) => (
                        <tr key={bm.id} className="cursor-pointer border-t hover:bg-slate-50/60">
                          <td className="p-3">{index + 1}</td>
                          <td className="w-[210px] p-3">
                            <div className="flex w-full items-center justify-between gap-1">
                              <span className="font-mono">{bm.id}</span>
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => copyToClipboard(bm.id)}
                                className="h-7 w-7 cursor-pointer border-slate-300 bg-white hover:bg-slate-50"
                                title="Copy BM id"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                          <td className="p-3">{bm.name}</td>
                          <td className="p-3">
                            {(bm.permitted_roles ?? [])
                              .map((role) => {
                                const normalized = String(role).toLowerCase()
                                return normalized.charAt(0).toUpperCase() + normalized.slice(1)
                              })
                              .join(", ") || "-"}
                          </td>
                          <td className="p-3">{bm.pages.length}</td>
                        </tr>
                      ))}
                      {!loadingData && businessRows.length === 0 && (
                        <tr className="border-t">
                          <td className="p-3 text-slate-500" colSpan={5}>
                            No BM found for this access token.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold tracking-tight">Pages Outside BM</h3>
                    {outsidePages.length > 0 && (
                      <p className="text-xs text-slate-600">
                        pages: {outsidePages.length} selected:{" "}
                        {outsideSelectedPageIds.length}
                      </p>
                    )}
                  </div>
                  {outsidePages.length > 0 && (
                    <div className="flex items-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const outsideSelectedIds = outsidePages
                            .filter((page) => outsideSelectedPageIds.includes(page.id))
                            .map((page) => page.id)
                          if (outsideSelectedIds.length === 0) {
                            toast.error("No pages selected")
                            return
                          }
                          await copyToClipboard(outsideSelectedIds.join("\n"))
                        }}
                        disabled={outsideSelectedPageIds.length === 0}
                        className="h-8 cursor-pointer rounded-r-none border-slate-300 bg-white px-3 text-xs hover:bg-slate-50 disabled:cursor-not-allowed"
                      >
                        <Copy className="mr-1 h-3.5 w-3.5" />
                        Copy Selected
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setOutsideSelectedPageIds([])}
                        disabled={outsideSelectedPageIds.length === 0}
                        className="-ml-px h-8 cursor-pointer rounded-l-none border-red-200 bg-white px-3 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:text-red-300"
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        Clear Selected
                      </Button>
                    </div>
                  )}
                </div>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="max-h-[360px] overflow-y-auto">
                    <table className="w-full table-fixed text-sm">
                      <thead className="bg-slate-50">
                        <tr className="text-left font-semibold">
                          <th className="sticky top-0 z-10 w-[64px] bg-slate-50 p-3">#</th>
                          <th className="sticky top-0 z-10 w-[210px] bg-slate-50 p-3">Page ID</th>
                          <th className="sticky top-0 z-10 bg-slate-50 p-3">Page Name</th>
                          <th className="sticky top-0 z-10 w-[180px] bg-slate-50 p-3">Category</th>
                          <th className="sticky top-0 z-10 w-[72px] bg-slate-50 p-3 text-right">
                            {outsidePages.length > 0 && (
                              <input
                                type="checkbox"
                                checked={outsidePages.every((page) => outsideSelectedPageIds.includes(page.id))}
                                onChange={(e) => {
                                  const outsidePageIds = outsidePages.map((page) => page.id)
                                  if (e.target.checked) {
                                    setOutsideSelectedPageIds(outsidePageIds)
                                  } else {
                                    setOutsideSelectedPageIds([])
                                  }
                                }}
                                className="h-4 w-4 cursor-pointer accent-slate-600"
                                aria-label="Select all pages outside BM"
                              />
                            )}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {outsidePages.map((page, index) => (
                          <PageTableRow
                            key={`${page.id}-${index}`}
                            index={index}
                            page={page}
                            checked={outsideSelectedPageIds.includes(page.id)}
                            rowClassName="border-t bg-emerald-50/40 hover:bg-emerald-50/70"
                            copyIconSize="sm"
                            onRowClick={() => {
                              const checked = outsideSelectedPageIds.includes(page.id)
                              setOutsideSelectedPageIds((prev) =>
                                checked ? prev.filter((id) => id !== page.id) : [...prev, page.id]
                              )
                            }}
                            onCheckboxChange={(checked) => {
                              setOutsideSelectedPageIds((prev) =>
                                checked ? [...new Set([...prev, page.id])] : prev.filter((id) => id !== page.id)
                              )
                            }}
                          />
                        ))}
                        {!loadingData && outsidePages.length === 0 && (
                          <tr className="border-t">
                            <td className="p-3 text-slate-500" colSpan={5}>
                              No pages outside BM.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {businessRows.length > 0 && (
                <div className="space-y-8">
                  {businessRows.map((bm) => {
                    const rolesLower = (bm.permitted_roles ?? []).map((role) => String(role).toLowerCase())
                    const canSeeAllPages = rolesLower.includes("admin")

                    return (
                  <div key={`bm-table-${bm.id}`} className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold tracking-tight">{bm.name}</h3>
                        {canSeeAllPages && bm.pages.length > 0 ? (
                          <p className="text-xs text-slate-600">
                            role: {rolesLower.join(", ") || "-"}{" "}
                            pages: {bm.pages.length} assigned: {bm.assignedPages.length} selected:{" "}
                            {(bmAllSelectedPageIds[bm.id] ?? []).length}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-600">
                            role: {rolesLower.join(", ") || "-"} assigned: {bm.assignedPages.length} selected:{" "}
                            {(bmAssignedSelectedPageIds[bm.id] ?? []).length}
                          </p>
                        )}
                        </div>
                      {canSeeAllPages && bm.pages.length > 0 && (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              const bmSelectedIds = bm.pages
                                .filter((page) => (bmAllSelectedPageIds[bm.id] ?? []).includes(page.id))
                                .map((page) => page.id)
                              if (bmSelectedIds.length === 0) {
                                toast.error("No pages selected")
                                return
                              }
                              await copyToClipboard(bmSelectedIds.join("\n"))
                            }}
                            disabled={(bmAllSelectedPageIds[bm.id] ?? []).length === 0}
                            className="h-8 cursor-pointer border-slate-300 bg-white px-3 text-xs hover:bg-slate-50 disabled:cursor-not-allowed"
                          >
                            <Copy className="mr-1 h-3.5 w-3.5" />
                            Copy Selected
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const bmSelectedIds = bm.pages
                                .filter((page) => (bmAllSelectedPageIds[bm.id] ?? []).includes(page.id))
                                .filter((page) => !bm.assignedPages.some((assigned) => assigned.id === page.id))
                                .map((page) => page.id)
                              if (bmSelectedIds.length === 0) return
                              if (!activeViewerId || !activeToken) {
                                toast.error("Missing account user context")
                                return
                              }
                              void assignByUserToken(
                                bmSelectedIds,
                                bm.id,
                                activeViewerId,
                                activeToken,
                                taskMode
                              )
                            }}
                            disabled={
                              bm.pages.filter((page) => (bmAllSelectedPageIds[bm.id] ?? []).includes(page.id))
                                .filter((page) => !bm.assignedPages.some((assigned) => assigned.id === page.id))
                                .length === 0 || loadingData
                            }
                            className="h-8 cursor-pointer rounded-r-none border-emerald-200 bg-white px-3 text-xs text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 disabled:cursor-not-allowed disabled:text-emerald-300"
                          >
                            Assign Selected
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setBmAllSelectedPageIds((prev) => ({ ...prev, [bm.id]: [] }))}
                            disabled={(bmAllSelectedPageIds[bm.id] ?? []).length === 0}
                            className="-ml-px h-8 cursor-pointer rounded-l-none border-red-200 bg-white px-3 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:text-red-300"
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            Clear Selected
                          </Button>
                        </div>
                      )}
                      {!canSeeAllPages && bm.assignedPages.length > 0 && (
                        <div className="flex items-center justify-end gap-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              const assignedSelectedIds = bm.assignedPages
                                .filter((page) => (bmAssignedSelectedPageIds[bm.id] ?? []).includes(page.id))
                                .map((page) => page.id)
                              if (assignedSelectedIds.length === 0) {
                                toast.error("No pages selected")
                                return
                              }
                              await copyToClipboard(assignedSelectedIds.join("\n"))
                            }}
                            disabled={(bmAssignedSelectedPageIds[bm.id] ?? []).length === 0}
                            className="h-8 cursor-pointer border-slate-300 bg-white px-3 text-xs hover:bg-slate-50 disabled:cursor-not-allowed"
                          >
                            <Copy className="mr-1 h-3.5 w-3.5" />
                            Copy Selected
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const assignedSelectedIds = bm.assignedPages
                                .filter((page) => (bmAssignedSelectedPageIds[bm.id] ?? []).includes(page.id))
                                .map((page) => page.id)
                              if (assignedSelectedIds.length === 0) return
                              if (!activeViewerId || !activeToken) {
                                toast.error("Missing account user context")
                                return
                              }
                              void deleteByUserToken(assignedSelectedIds, activeViewerId, activeToken)
                            }}
                            disabled={(bmAssignedSelectedPageIds[bm.id] ?? []).length === 0 || loadingData}
                            className="h-8 cursor-pointer rounded-r-none border-red-200 bg-white px-3 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:text-red-300"
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            Delete Selected
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setBmAssignedSelectedPageIds((prev) => ({ ...prev, [bm.id]: [] }))}
                            disabled={(bmAssignedSelectedPageIds[bm.id] ?? []).length === 0}
                            className="-ml-px h-8 cursor-pointer rounded-l-none border-red-200 bg-white px-3 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:text-red-300"
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            Clear Selected
                          </Button>
                        </div>
                      )}
                    </div>
                    {canSeeAllPages && (
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                        <div className="max-h-[440px] overflow-y-auto">
                        <table className="w-full table-fixed text-sm">
                            <thead className="bg-slate-50">
                              <tr className="text-left font-semibold">
                              <th className="sticky top-0 z-10 w-[64px] bg-slate-50 p-3">#</th>
                              <th className="sticky top-0 z-10 w-[210px] bg-slate-50 p-3">Page ID</th>
                              <th className="sticky top-0 z-10 bg-slate-50 p-3">Page Name</th>
                              <th className="sticky top-0 z-10 w-[180px] bg-slate-50 p-3">Category</th>
                              <th className="sticky top-0 z-10 w-[72px] bg-slate-50 p-3 text-right">
                                  {bm.pages.length > 0 && (
                                    <input
                                      type="checkbox"
                                      checked={
                                        bm.pages.length > 0 &&
                                        bm.pages.every((page) =>
                                          (bmAllSelectedPageIds[bm.id] ?? []).includes(page.id)
                                        )
                                      }
                                      onChange={(e) => {
                                        const bmPageIds = bm.pages.map((page) => page.id)
                                        if (e.target.checked) {
                                          setBmAllSelectedPageIds((prev) => ({ ...prev, [bm.id]: bmPageIds }))
                                        } else {
                                          setBmAllSelectedPageIds((prev) => ({ ...prev, [bm.id]: [] }))
                                        }
                                      }}
                                      className="h-4 w-4 cursor-pointer accent-slate-600"
                                      aria-label={`Select all pages in ${bm.name}`}
                                    />
                                  )}
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {bm.pages.length === 0 && (
                                <tr className="border-t">
                                  <td className="p-3 text-slate-500" colSpan={5}>
                                    No pages in this BM.
                                  </td>
                                </tr>
                              )}
                              {[...bm.pages]
                                .sort((a, b) => {
                                  const aAssigned = bm.assignedPages.some((assigned) => assigned.id === a.id) ? 1 : 0
                                  const bAssigned = bm.assignedPages.some((assigned) => assigned.id === b.id) ? 1 : 0
                                  return bAssigned - aAssigned
                                })
                                .map((row, index) => (
                                <PageTableRow
                                  key={`${row.businessId}-${row.id}-${index}`}
                                  index={index}
                                  page={row}
                                  checked={(bmAllSelectedPageIds[bm.id] ?? []).includes(row.id)}
                                  rowClassName={`border-t ${
                                    bm.assignedPages.some((assigned) => assigned.id === row.id)
                                      ? "bg-emerald-50/40 hover:bg-emerald-50/70"
                                      : "hover:bg-slate-50/60"
                                  }`}
                                  copyIconSize="sm"
                                  onRowClick={() => {
                                    const checked = (bmAllSelectedPageIds[bm.id] ?? []).includes(row.id)
                                    setBmAllSelectedPageIds((prev) => ({
                                      ...prev,
                                      [bm.id]: checked
                                        ? (prev[bm.id] ?? []).filter((id) => id !== row.id)
                                        : [...new Set([...(prev[bm.id] ?? []), row.id])],
                                    }))
                                  }}
                                  onCheckboxChange={(checked) => {
                                    setBmAllSelectedPageIds((prev) => ({
                                      ...prev,
                                      [bm.id]: checked
                                        ? [...new Set([...(prev[bm.id] ?? []), row.id])]
                                        : (prev[bm.id] ?? []).filter((id) => id !== row.id),
                                    }))
                                  }}
                                />
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    {(!canSeeAllPages || bm.assignedPages.length > 0) && (
                    <div className="space-y-2 pt-2">
                      {canSeeAllPages && (
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs text-slate-600">
                            assigned pages: {bm.assignedPages.length} selected:{" "}
                            {(bmAssignedSelectedPageIds[bm.id] ?? []).length}
                          </p>
                          {bm.assignedPages.length > 0 && (
                            <div className="flex items-center gap-3">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  const assignedSelectedIds = bm.assignedPages
                                    .filter((page) => (bmAssignedSelectedPageIds[bm.id] ?? []).includes(page.id))
                                    .map((page) => page.id)
                                  if (assignedSelectedIds.length === 0) {
                                    toast.error("No pages selected")
                                    return
                                  }
                                  await copyToClipboard(assignedSelectedIds.join("\n"))
                                }}
                                disabled={(bmAssignedSelectedPageIds[bm.id] ?? []).length === 0}
                                className="h-8 cursor-pointer border-slate-300 bg-white px-3 text-xs hover:bg-slate-50 disabled:cursor-not-allowed"
                              >
                                <Copy className="mr-1 h-3.5 w-3.5" />
                                Copy Selected
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const assignedSelectedIds = bm.assignedPages
                                    .filter((page) => (bmAssignedSelectedPageIds[bm.id] ?? []).includes(page.id))
                                    .map((page) => page.id)
                                  if (assignedSelectedIds.length === 0) return
                                  if (!activeViewerId || !activeToken) {
                                    toast.error("Missing account user context")
                                    return
                                  }
                                  void deleteByUserToken(assignedSelectedIds, activeViewerId, activeToken)
                                }}
                                disabled={(bmAssignedSelectedPageIds[bm.id] ?? []).length === 0 || loadingData}
                                className="h-8 cursor-pointer rounded-r-none border-red-200 bg-white px-3 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:text-red-300"
                              >
                                <Trash2 className="mr-1 h-3.5 w-3.5" />
                                Delete Selected
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setBmAssignedSelectedPageIds((prev) => ({ ...prev, [bm.id]: [] }))}
                                disabled={(bmAssignedSelectedPageIds[bm.id] ?? []).length === 0}
                                className="-ml-px h-8 cursor-pointer rounded-l-none border-red-200 bg-white px-3 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:text-red-300"
                              >
                                <Trash2 className="mr-1 h-3.5 w-3.5" />
                                Clear Selected
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <div className="max-h-[660px] overflow-y-auto">
                        <table className="w-full table-fixed text-sm">
                          <thead className="bg-slate-50">
                            <tr className="text-left font-semibold">
                              <th className="sticky top-0 z-10 w-[64px] bg-slate-50 p-3">#</th>
                              <th className="sticky top-0 z-10 w-[210px] bg-slate-50 p-3">Assigned Page ID</th>
                              <th className="sticky top-0 z-10 bg-slate-50 p-3">Assigned Page Name</th>
                              <th className="sticky top-0 z-10 w-[180px] bg-slate-50 p-3">Category</th>
                              <th className="sticky top-0 z-10 w-[72px] bg-slate-50 p-3 text-right">
                                {bm.assignedPages.length > 0 && (
                                  <input
                                    type="checkbox"
                                    checked={
                                      bm.assignedPages.length > 0 &&
                                      bm.assignedPages.every((page) =>
                                        (bmAssignedSelectedPageIds[bm.id] ?? []).includes(page.id)
                                      )
                                    }
                                    onChange={(e) => {
                                      const assignedIds = bm.assignedPages.map((page) => page.id)
                                      if (e.target.checked) {
                                        setBmAssignedSelectedPageIds((prev) => ({ ...prev, [bm.id]: assignedIds }))
                                      } else {
                                        setBmAssignedSelectedPageIds((prev) => ({ ...prev, [bm.id]: [] }))
                                      }
                                    }}
                                    className="h-4 w-4 cursor-pointer accent-slate-600"
                                    aria-label={`Select all assigned pages in ${bm.name}`}
                                  />
                                )}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {bm.assignedPages.length === 0 && (
                              <tr className="border-t">
                                <td className="p-3 text-slate-500" colSpan={5}>
                                  No assigned pages in this BM.
                                </td>
                              </tr>
                            )}
                            {bm.assignedPages.map((row, index) => (
                              <PageTableRow
                                key={`assigned-${bm.id}-${row.id}-${index}`}
                                index={index}
                                page={row}
                                checked={(bmAssignedSelectedPageIds[bm.id] ?? []).includes(row.id)}
                                copyTitle="Copy assigned page id"
                                copyIconSize="sm"
                                ariaLabel={`Select assigned page ${row.name}`}
                                onRowClick={() => {
                                  const checked = (bmAssignedSelectedPageIds[bm.id] ?? []).includes(row.id)
                                  setBmAssignedSelectedPageIds((prev) => ({
                                    ...prev,
                                    [bm.id]: checked
                                      ? (prev[bm.id] ?? []).filter((id) => id !== row.id)
                                      : [...new Set([...(prev[bm.id] ?? []), row.id])],
                                  }))
                                }}
                                onCheckboxChange={(checked) => {
                                  setBmAssignedSelectedPageIds((prev) => ({
                                    ...prev,
                                    [bm.id]: checked
                                      ? [...new Set([...(prev[bm.id] ?? []), row.id])]
                                      : (prev[bm.id] ?? []).filter((id) => id !== row.id),
                                  }))
                                }}
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    </div>
                    )}
                    </div>
                )})}
                </div>
              )}
            </>
          )}

        </CardContent>
      </Card>
  )
}
