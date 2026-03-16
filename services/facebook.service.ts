import { getRolesByMode } from "@/lib/facebook-permissions"
import { FacebookBusiness, FacebookPage, FacebookUser } from "@/types/facebook"

const LIMIT = 200

export const facebookService = {
  async getMe(token: string): Promise<FacebookUser> {
    const url = new URL("https://graph.facebook.com/me")
    url.searchParams.set("fields", "id,name")
    url.searchParams.set("access_token", token)

    const res = await fetch(url.toString())
    if (!res.ok) {
      throw new Error("Failed to fetch Facebook user")
    }

    const data = await res.json() as FacebookUser & { error?: { message?: string } }
    if (data.error?.message) {
      throw new Error(data.error.message)
    }

    return { id: data.id, name: data.name }
  },

  async getPages(token: string): Promise<FacebookPage[]> {
    const url = new URL("https://graph.facebook.com/me/accounts")
    url.searchParams.set("fields", "id,name,access_token,category")
    url.searchParams.set("access_token", token)
    url.searchParams.set("limit", LIMIT.toString())

    const res = await fetch(url.toString())
    if (!res.ok) {
      throw new Error("Failed to fetch Facebook pages")
    }

    const data = await res.json() as { data?: FacebookPage[]; error?: { message?: string } }
    if (data.error?.message) {
      throw new Error(data.error.message)
    }

    return data.data ?? []
  },

  async getBusinesses(token: string): Promise<FacebookBusiness[]> {
    const url = new URL("https://graph.facebook.com/me/businesses")
    url.searchParams.set("fields", "id,name,permitted_roles")
    url.searchParams.set("access_token", token)
    url.searchParams.set("limit", LIMIT.toString())

    const res = await fetch(url.toString())
    if (!res.ok) {
      throw new Error("Failed to fetch businesses")
    }

    const data = await res.json() as { data?: FacebookBusiness[]; error?: { message?: string } }
    if (data.error?.message) {
      throw new Error(data.error.message)
    }

    return data.data ?? []
  },

  async getBusinessPages(token: string, businessId: string): Promise<FacebookPage[]> {
    const url = new URL(`https://graph.facebook.com/${businessId}/owned_pages`)
    url.searchParams.set("fields", "id,name,category,access_token")
    url.searchParams.set("access_token", token)
    url.searchParams.set("limit", LIMIT.toString())

    const res = await fetch(url.toString())
    if (!res.ok) {
      throw new Error("Failed to fetch business pages")
    }

    const data = await res.json() as { data?: FacebookPage[]; error?: { message?: string } }
    if (data.error?.message) {
      throw new Error(data.error.message)
    }

    return data.data ?? []
  },

  async getBusinessClientPages(token: string, businessId: string): Promise<FacebookPage[]> {
    const url = new URL(`https://graph.facebook.com/${businessId}/client_pages`)
    url.searchParams.set("fields", "id,name,category,access_token")
    url.searchParams.set("access_token", token)
    url.searchParams.set("limit", LIMIT.toString())

    const res = await fetch(url.toString())
    if (!res.ok) {
      throw new Error("Failed to fetch business client pages")
    }

    const data = await res.json() as { data?: FacebookPage[]; error?: { message?: string } }
    if (data.error?.message) {
      throw new Error(data.error.message)
    }

    return data.data ?? []
  },

  async getBusinessSystemUsers(
    token: string,
    businessId: string
  ): Promise<Array<{ id: string; name: string; role?: string }>> {
    const url = new URL(`https://graph.facebook.com/v25.0/${businessId}/system_users`)
    url.searchParams.set("fields", "id,name,role")
    url.searchParams.set("access_token", token)
    url.searchParams.set("limit", LIMIT.toString())

    const res = await fetch(url.toString())
    if (!res.ok) {
      throw new Error("Failed to fetch business system users")
    }

    const data = await res.json() as {
      data?: Array<{ id?: string; name?: string; role?: string }>
      error?: { message?: string }
    }
    if (data.error?.message) {
      throw new Error(data.error.message)
    }

    return (data.data ?? [])
      .filter((item) => item.id && item.name)
      .map((item) => ({
        id: item.id as string,
        name: item.name as string,
        role: item.role,
      }))
  },

  async createBusinessSystemUser(
    token: string,
    businessId: string,
    name: string,
    role: "ADMIN" | "EMPLOYEE"
  ): Promise<{ id: string }> {
    const url = `https://graph.facebook.com/v25.0/${encodeURIComponent(businessId)}/system_users`
    const body = new FormData()
    body.append("name", name.trim())
    body.append("role", role)
    body.append("access_token", token)

    const res = await fetch(url, {
      method: "POST",
      body,
    })

    const data = await res.json() as { id?: string; error?: { message?: string } }
    if (data.error?.message) {
      throw new Error(data.error.message)
    }
    if (!data.id) {
      throw new Error("Failed to create system user: no id returned")
    }

    return { id: data.id }
  },

  async updateBusinessSystemUser(
    token: string,
    businessId: string,
    systemUserId: string,
    name: string
  ): Promise<void> {
    const url = `https://graph.facebook.com/v25.0/${encodeURIComponent(businessId)}/system_users`
    const body = new FormData()
    body.append("system_user_id", systemUserId.trim())
    body.append("name", name.trim())
    body.append("access_token", token)

    const res = await fetch(url, {
      method: "POST",
      body,
    })

    const data = await res.json() as { success?: boolean; error?: { message?: string } }
    if (data.error?.message) {
      throw new Error(data.error.message)
    }
  },

  async getBusinessAssetGroups(
    token: string,
    businessId: string
  ): Promise<Array<{ id: string; name: string }>> {
    const fetchAll = async (edge: string) => {
      const items: Array<{ id: string; name: string }> = []
      let url: string | null = `https://graph.facebook.com/v25.0/${businessId}/${edge}?access_token=${encodeURIComponent(token)}&limit=${LIMIT}`
      while (url) {
        const res = await fetch(url)
        if (!res.ok) break
        const data = await res.json() as {
          data?: Array<{ id?: string; name?: string }>
          paging?: { next?: string }
          error?: { message?: string }
        }
        if (data.error?.message) break
        const list = (data.data ?? []).filter((item) => item.id)
        for (const item of list) {
          const id = item.id as string
          items.push({ id, name: (item.name as string) || id })
        }
        url = data.paging?.next ?? null
      }
      return items
    }

    const [owned, client] = await Promise.all([
      fetchAll("business_asset_groups"),
      fetchAll("client_asset_groups").catch(() => []),
    ])

    const seen = new Set<string>()
    const merged: Array<{ id: string; name: string }> = []
    for (const item of [...owned, ...client]) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      merged.push(item)
    }
    return merged
  },

  async updateBusinessAssetGroup(
    token: string,
    assetGroupId: string,
    name: string
  ): Promise<void> {
    const url = new URL(`https://graph.facebook.com/v25.0/${encodeURIComponent(assetGroupId)}`)
    url.searchParams.set("name", name.trim())
    url.searchParams.set("access_token", token)

    const res = await fetch(url.toString(), {
      method: "POST",
    })

    const data = await res.json() as { success?: boolean; error?: { message?: string } }
    if (data.error?.message) {
      throw new Error(data.error.message)
    }
  },

  async deleteBusinessAssetGroup(token: string, assetGroupId: string): Promise<void> {
    const url = new URL(`https://graph.facebook.com/v25.0/${encodeURIComponent(assetGroupId)}`)
    url.searchParams.set("access_token", token)

    const res = await fetch(url.toString(), {
      method: "DELETE",
    })

    const data = await res.json() as { success?: boolean; error?: { message?: string } }
    if (data.error?.message) {
      throw new Error(data.error.message)
    }
  },

  async getAssetGroupAssignedUsers(
    token: string,
    assetGroupId: string,
    businessId: string
  ): Promise<Array<{ id: string; name: string; page_roles?: string[] }>> {
    const url = new URL(`https://graph.facebook.com/v25.0/${assetGroupId}/assigned_users`)
    url.searchParams.set("business", businessId)
    url.searchParams.set("fields", "id,name,page_roles")
    url.searchParams.set("access_token", token)
    url.searchParams.set("limit", LIMIT.toString())

    const res = await fetch(url.toString())
    if (!res.ok) {
      throw new Error("Failed to fetch asset group assigned users")
    }

    const data = await res.json() as {
      data?: Array<{ id?: string; name?: string; page_roles?: string[] }>
      error?: { message?: string }
    }
    if (data.error?.message) {
      throw new Error(data.error.message)
    }

    return (data.data ?? [])
      .filter((item) => item.id)
      .map((item) => ({
        id: item.id as string,
        name: (item.name as string) || item.id || "",
        page_roles: item.page_roles,
      }))
  },

  async assignUserToAssetGroup(
    token: string,
    assetGroupId: string,
    businessId: string,
    userId: string,
    pageRoles: string[] = getRolesByMode("basic")
  ): Promise<void> {
    const url = new URL(`https://graph.facebook.com/v25.0/${encodeURIComponent(assetGroupId)}/assigned_users`)
    url.searchParams.set("business", businessId)
    url.searchParams.set("user", userId)
    url.searchParams.set("page_roles", JSON.stringify(pageRoles))
    url.searchParams.set("access_token", token)

    const res = await fetch(url.toString(), {
      method: "POST",
    })

    const data = await res.json() as { success?: boolean; error?: { message?: string } }
    if (data.error?.message) {
      throw new Error(data.error.message)
    }
  },

  async removeUserFromAssetGroup(
    token: string,
    assetGroupId: string,
    businessId: string,
    userId: string
  ): Promise<void> {
    const url = new URL(`https://graph.facebook.com/v25.0/${encodeURIComponent(assetGroupId)}/assigned_users`)
    url.searchParams.set("business", businessId)
    url.searchParams.set("user", userId)
    url.searchParams.set("access_token", token)

    const res = await fetch(url.toString(), {
      method: "DELETE",
    })

    const data = await res.json() as { success?: boolean; error?: { message?: string } }
    if (data.error?.message) {
      throw new Error(data.error.message)
    }
  },

  async getAssetGroupContainedPagesCount(
    token: string,
    assetGroupId: string
  ): Promise<number> {
    const url = new URL(`https://graph.facebook.com/v25.0/${assetGroupId}/contained_pages`)
    url.searchParams.set("access_token", token)
    url.searchParams.set("summary", "1")
    url.searchParams.set("limit", "0")

    const res = await fetch(url.toString())
    if (!res.ok) return 0

    const data = await res.json() as {
      summary?: { total_count?: number }
      error?: { message?: string }
    }
    if (data.error?.message) return 0
    return data.summary?.total_count ?? 0
  },

  async getAssetGroupContainedPages(
    token: string,
    assetGroupId: string
  ): Promise<Array<{ id: string; name?: string }>> {
    const url = new URL(`https://graph.facebook.com/v25.0/${assetGroupId}/contained_pages`)
    url.searchParams.set("fields", "id,name")
    url.searchParams.set("access_token", token)
    url.searchParams.set("limit", LIMIT.toString())

    const res = await fetch(url.toString())
    if (!res.ok) {
      throw new Error("Failed to fetch asset group contained pages")
    }

    const data = await res.json() as {
      data?: Array<{ id?: string; name?: string }>
      error?: { message?: string }
    }
    if (data.error?.message) {
      throw new Error(data.error.message)
    }

    return (data.data ?? [])
      .filter((item) => item.id)
      .map((item) => ({ id: item.id as string, name: item.name }))
  },

  async addPageToAssetGroup(
    token: string,
    assetGroupId: string,
    pageId: string
  ): Promise<void> {
    const url = new URL(`https://graph.facebook.com/v25.0/${assetGroupId}/contained_pages`)
    url.searchParams.set("asset_id", pageId)
    url.searchParams.set("access_token", token)

    const res = await fetch(url.toString(), {
      method: "POST",
    })

    const data = await res.json() as { success?: boolean; error?: { message?: string } }
    if (data.error?.message) {
      throw new Error(data.error.message)
    }
  },

  async removePageFromAssetGroup(
    token: string,
    assetGroupId: string,
    pageId: string
  ): Promise<void> {
    const url = new URL(`https://graph.facebook.com/v25.0/${assetGroupId}/contained_pages`)
    url.searchParams.set("asset_id", pageId)
    url.searchParams.set("access_token", token)

    const res = await fetch(url.toString(), {
      method: "DELETE",
    })

    const data = await res.json() as { success?: boolean; error?: { message?: string } }
    if (data.error?.message) {
      throw new Error(data.error.message)
    }
  },

  async getPageTokenFromMeAccounts(token: string, pageId: string): Promise<string> {
    const pages = await this.getPages(token)
    const page = pages.find((p) => p.id === pageId)
    if (!page?.access_token) {
      throw new Error(
        `Page ${pageId} not found in /me/accounts. Assign the page to this account first.`
      )
    }
    return page.access_token
  },

  async getPageInfo(
    token: string,
    pageId: string,
    pageAccessToken?: string
  ): Promise<{
    id: string
    name?: string
    about?: string
    description?: string
    category_list?: Array<{ id: string; name: string }>
    website?: string
    phone?: string
    location?: { street?: string; city?: string; zip?: string; country?: string }
    emails?: string[]
  }> {
    const pageToken = pageAccessToken ?? (await this.getPageTokenFromMeAccounts(token, pageId))
    const url = new URL(`https://graph.facebook.com/v25.0/${encodeURIComponent(pageId)}`)
    url.searchParams.set("fields", "id,name,about,description,category_list,website,phone,location,emails")
    url.searchParams.set("access_token", pageToken)

    const res = await fetch(url.toString())
    if (!res.ok) throw new Error("Failed to fetch page info")

    const data = await res.json() as {
      id?: string
      name?: string
      about?: string
      description?: string
      category_list?: Array<{ id: string; name: string }>
      website?: string
      phone?: string
      location?: { street?: string; city?: string; zip?: string; country?: string }
      emails?: string[]
      error?: { message?: string }
    }
    if (data.error?.message) throw new Error(data.error.message)

    const loc = data.location
    let flatLoc: { street?: string; city?: string; zip?: string; country?: string } | undefined
    if (loc && typeof loc === "object") {
      if ("street" in loc || "city" in loc || "zip" in loc || "country" in loc) {
        flatLoc = loc as { street?: string; city?: string; zip?: string; country?: string }
      } else if ("location" in loc && loc.location && typeof loc.location === "object") {
        flatLoc = (loc as { location: { street?: string; city?: string; zip?: string; country?: string } })
          .location
      }
    }

    let emails: string[] | undefined
    if (Array.isArray(data.emails)) {
      emails = data.emails.filter((e): e is string => typeof e === "string")
    } else if (data.emails != null && data.emails !== "") {
      emails = [String(data.emails)]
    }

    let categoryList: Array<{ id: string; name: string }> | undefined
    if (Array.isArray(data.category_list)) {
      categoryList = data.category_list
        .filter((c): c is { id: string; name: string } => c && typeof c.id === "string" && typeof c.name === "string")
        .map((c) => ({ id: c.id, name: c.name }))
    }

    return {
      id: data.id ?? pageId,
      name: data.name,
      about: data.about,
      description: data.description,
      category_list: categoryList,
      website: data.website,
      phone: data.phone,
      location: flatLoc,
      emails,
    }
  },

  async updatePageInfo(
    token: string,
    pageId: string,
    updates: {
      about?: string
      description?: string
      category?: string
      website?: string
      phone?: string
      location?: { street?: string; city?: string; zip?: string; country?: string }
      email?: string
    },
    pageAccessToken?: string
  ): Promise<void> {
    const pageToken = pageAccessToken ?? (await this.getPageTokenFromMeAccounts(token, pageId))
    const url = `https://graph.facebook.com/v25.0/${encodeURIComponent(pageId)}`
    const body = new FormData()
    body.append("access_token", pageToken)
    if (updates.about !== undefined) body.append("about", updates.about)
    if (updates.description !== undefined) body.append("description", updates.description)
    if (updates.category !== undefined) body.append("category", updates.category)
    if (updates.website !== undefined) body.append("website", updates.website)
    if (updates.phone !== undefined) body.append("phone", updates.phone)
    if (updates.email !== undefined) body.append("email", updates.email)
    if (updates.location !== undefined) {
      const loc = updates.location
      if (loc.street !== undefined) body.append("location[street]", loc.street)
      if (loc.city !== undefined) body.append("location[city]", loc.city)
      if (loc.zip !== undefined) body.append("location[zip]", loc.zip)
      if (loc.country !== undefined) body.append("location[country]", loc.country)
    }

    const res = await fetch(url, { method: "POST", body })
    const data = await res.json() as { success?: boolean; error?: { message?: string } }
    if (data.error?.message) throw new Error(data.error.message)
  },

  async getBusinessRolesForUser(token: string, businessId: string, userId: string): Promise<string[]> {
    const url = new URL(`https://graph.facebook.com/${businessId}/assigned_users`)
    url.searchParams.set("fields", "id,role,tasks")
    url.searchParams.set("access_token", token)
    url.searchParams.set("limit", LIMIT.toString())

    const res = await fetch(url.toString())
    if (!res.ok) {
      return []
    }

    const data = await res.json() as {
      data?: Array<{ id?: string; role?: string; tasks?: string[] }>
      error?: { message?: string }
    }
    if (data.error?.message) {
      return []
    }

    const matched = (data.data ?? []).find((item) => item.id === userId)
    if (!matched) return []

    const roles = new Set<string>()
    if (matched.role) roles.add(matched.role)
    for (const task of matched.tasks ?? []) {
      if (task) roles.add(task)
    }

    return Array.from(roles)
  },

  async getAssignedPageIdsInBusinessBatch(
    token: string,
    businessId: string,
    userId: string,
    pageIds: string[]
  ): Promise<string[]> {
    if (pageIds.length === 0) return []

    const batch = pageIds.map((pageId) => ({
      method: "GET",
      relative_url: `v25.0/${encodeURIComponent(businessId)}/assigned_users?user=${encodeURIComponent(userId)}&asset=${encodeURIComponent(pageId)}&fields=id`,
    }))

    const body = new URLSearchParams()
    body.set("access_token", token)
    body.set("batch", JSON.stringify(batch))

    const res = await fetch("https://graph.facebook.com", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    })
    if (!res.ok) return []

    const data = await res.json() as Array<{ code?: number; body?: string }>
    const assigned: string[] = []

    for (let i = 0; i < pageIds.length; i += 1) {
      const pageId = pageIds[i]
      const item = data?.[i]
      if (!item || (item.code ?? 500) >= 400) continue

      try {
        const parsed = item.body
          ? (JSON.parse(item.body) as { data?: Array<{ id?: string }> })
          : undefined
        const hasInBusiness = (parsed?.data ?? []).some((entry) => entry.id === userId)
        if (hasInBusiness) assigned.push(pageId)
      } catch {
        // Ignore invalid response item.
      }
    }

    return assigned
  },

  async removeSystemUserFromPagesBatch(
    pageIds: string[],
    businessId: string,
    userId: string,
    token: string
  ): Promise<{ successPageIds: string[]; failed: Array<{ pageId: string; message: string }> }> {
    if (pageIds.length === 0) return { successPageIds: [], failed: [] }

    const batch = pageIds.map((pageId) => ({
      method: "DELETE",
      relative_url: `v25.0/${businessId}/assigned_users?user=${encodeURIComponent(userId)}&asset=${encodeURIComponent(pageId)}`,
    }))

    const body = new URLSearchParams()
    body.set("access_token", token)
    body.set("batch", JSON.stringify(batch))

    const res = await fetch("https://graph.facebook.com", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    })

    if (!res.ok) throw new Error("Failed to remove user permissions by batch request")

    const data = await res.json() as Array<{
      code?: number
      body?: string
    }>
    const failed: Array<{ pageId: string; message: string }> = []
    const successPageIds: string[] = []

    for (let i = 0; i < pageIds.length; i += 1) {
      const pageId = pageIds[i]
      const item = data?.[i]
      const code = item?.code ?? 500
      if (code >= 400) {
        let message = "Failed to remove permission"
        try {
          const parsed = item?.body ? JSON.parse(item.body) as { error?: { message?: string } } : undefined
          message = parsed?.error?.message || message
        } catch {
          // Keep fallback message when body is not valid JSON.
        }
        failed.push({ pageId, message })
      } else {
        successPageIds.push(pageId)
      }
    }

    return { successPageIds, failed }
  },

  async removeSystemUserFromPagesByPageAssignedUsersBatch(
    pageIds: string[],
    userId: string,
    token: string
  ): Promise<{ successPageIds: string[]; failed: Array<{ pageId: string; message: string }> }> {
    if (pageIds.length === 0) return { successPageIds: [], failed: [] }

    const batch = pageIds.map((pageId) => ({
      method: "DELETE",
      relative_url: `v25.0/${encodeURIComponent(pageId)}/assigned_users?user=${encodeURIComponent(userId)}`,
    }))

    const body = new URLSearchParams()
    body.set("access_token", token)
    body.set("batch", JSON.stringify(batch))

    const res = await fetch("https://graph.facebook.com", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    })

    if (!res.ok) throw new Error("Failed to remove user permissions by batch request")

    const data = await res.json() as Array<{
      code?: number
      body?: string
    }>
    const failed: Array<{ pageId: string; message: string }> = []
    const successPageIds: string[] = []

    for (let i = 0; i < pageIds.length; i += 1) {
      const pageId = pageIds[i]
      const item = data?.[i]
      const code = item?.code ?? 500
      if (code >= 400) {
        let message = "Failed to remove permission"
        try {
          const parsed = item?.body ? JSON.parse(item.body) as { error?: { message?: string } } : undefined
          message = parsed?.error?.message || message
        } catch {
          // Keep fallback message when body is not valid JSON.
        }
        failed.push({ pageId, message })
      } else {
        successPageIds.push(pageId)
      }
    }

    return { successPageIds, failed }
  },

  async assignUserToPagesByBusinessAssignedUsersBatch(
    pageIds: string[],
    businessId: string,
    userId: string,
    token: string,
    taskMode: "basic" | "full" = "basic"
  ): Promise<{ successPageIds: string[]; failed: Array<{ pageId: string; message: string }> }> {
    if (pageIds.length === 0) return { successPageIds: [], failed: [] }

    const tasks = getRolesByMode(taskMode)
    const failed: Array<{ pageId: string; message: string }> = []
    const successPageIds: string[] = []

    await Promise.all(
      pageIds.map(async (pageId) => {
        try {
          const url = new URL(`https://graph.facebook.com/v25.0/${encodeURIComponent(pageId)}/assigned_users`)
          url.searchParams.set("access_token", token)
          const body = new FormData()
          body.append("user", userId)
          body.append("tasks", JSON.stringify(tasks))
          body.append("business", businessId)

          const res = await fetch(url.toString(), {
            method: "POST",
            body,
          })

          const data = await res.json() as { success?: boolean; error?: { message?: string } }
          if (!res.ok || data.error?.message) {
            failed.push({ pageId, message: data.error?.message || "Failed to assign permission" })
            return
          }

          successPageIds.push(pageId)
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Failed to assign permission"
          failed.push({ pageId, message })
        }
      })
    )

    return { successPageIds, failed }
  },

  async addPagesToBusinessOwnedPagesBatch(
    pageIds: string[],
    businessId: string,
    token: string
  ): Promise<{ successPageIds: string[]; failed: Array<{ pageId: string; message: string }> }> {
    if (pageIds.length === 0) return { successPageIds: [], failed: [] }

    const batch = pageIds.map((pageId) => ({
      method: "POST",
      relative_url: `v25.0/${encodeURIComponent(businessId)}/owned_pages`,
      body: `page_id=${encodeURIComponent(pageId)}`,
    }))

    const body = new URLSearchParams()
    body.set("access_token", token)
    body.set("batch", JSON.stringify(batch))

    const res = await fetch("https://graph.facebook.com", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    })

    if (!res.ok) throw new Error("Failed to add pages to business by batch request")

    const data = await res.json() as Array<{ code?: number; body?: string }>
    const failed: Array<{ pageId: string; message: string }> = []
    const successPageIds: string[] = []

    for (let i = 0; i < pageIds.length; i += 1) {
      const pageId = pageIds[i]
      const item = data?.[i]
      const code = item?.code ?? 500
      if (code >= 400) {
        let message = "Failed to add page into business"
        try {
          const parsed = item?.body ? JSON.parse(item.body) as { error?: { message?: string } } : undefined
          message = parsed?.error?.message || message
        } catch {
          // Keep fallback message when body is not valid JSON.
        }
        failed.push({ pageId, message })
      } else {
        successPageIds.push(pageId)
      }
    }

    return { successPageIds, failed }
  },

  async removePagesFromBusinessBatch(
    pageIds: string[],
    businessId: string,
    token: string
  ): Promise<{ successPageIds: string[]; failed: Array<{ pageId: string; message: string }> }> {
    if (pageIds.length === 0) return { successPageIds: [], failed: [] }

    const failed: Array<{ pageId: string; message: string }> = []
    const successPageIds: string[] = []

    await Promise.all(
      pageIds.map(async (pageId) => {
        try {
          const url = new URL(`https://graph.facebook.com/v25.0/${encodeURIComponent(businessId)}/pages`)
          const body = new URLSearchParams()
          body.set("page_id", pageId)
          body.set("access_token", token)

          const res = await fetch(url.toString(), {
            method: "DELETE",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body,
          })

          const data = await res.json() as { success?: boolean; error?: { message?: string } }
          if (!res.ok || data.error?.message) {
            failed.push({
              pageId,
              message: data.error?.message || "Failed to remove page from business",
            })
            return
          }

          successPageIds.push(pageId)
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : "Failed to remove page from business"
          failed.push({ pageId, message })
        }
      })
    )

    return { successPageIds, failed }
  },

  async sharePagesToBusinessByAgencies(
    pageIds: string[],
    targetBusinessId: string,
    token: string,
    taskMode: "basic" | "full" = "basic"
  ): Promise<{ successPageIds: string[]; failed: Array<{ pageId: string; message: string }> }> {
    if (pageIds.length === 0) return { successPageIds: [], failed: [] }

    const permittedTasks = getRolesByMode(taskMode)

    const failed: Array<{ pageId: string; message: string }> = []
    const successPageIds: string[] = []

    await Promise.all(
      pageIds.map(async (pageId) => {
        try {
          const url = new URL(`https://graph.facebook.com/v25.0/${encodeURIComponent(pageId)}/agencies`)
          let pageAccessToken = ""
          try {
            pageAccessToken = await this.getPageTokenFromMeAccounts(token, pageId)
          } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Cannot resolve page access token"
            failed.push({ pageId, message })
            return
          }

          const body = new FormData()
          body.append("business", targetBusinessId)
          body.append("permitted_tasks", JSON.stringify(permittedTasks))
          body.append("access_token", pageAccessToken)

          const res = await fetch(url.toString(), {
            method: "POST",
            body,
          })

          const data = await res.json() as { success?: boolean; error?: { message?: string } }
          if (!res.ok || data.error?.message) {
            failed.push({
              pageId,
              message: data.error?.message || "Failed to share page to target business",
            })
            return
          }

          successPageIds.push(pageId)
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : "Failed to share page to target business"
          failed.push({ pageId, message })
        }
      })
    )

    return { successPageIds, failed }
  }
}