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
    url.searchParams.set("fields", "id,name,category")
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
    url.searchParams.set("fields", "id,name,category")
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
    const url = new URL(`https://graph.facebook.com/${businessId}/system_users`)
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

  async getPageAccessToken(token: string, pageId: string): Promise<string> {
    const url = new URL(`https://graph.facebook.com/v25.0/${encodeURIComponent(pageId)}`)
    url.searchParams.set("fields", "access_token")
    url.searchParams.set("access_token", token)

    const res = await fetch(url.toString())
    if (!res.ok) {
      throw new Error("Failed to fetch page access token")
    }

    const data = await res.json() as { access_token?: string; error?: { message?: string } }
    if (data.error?.message) {
      throw new Error(data.error.message)
    }
    if (!data.access_token) {
      throw new Error("Missing page access token")
    }

    return data.access_token
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

  async getBusinessAssignedPageIdsForUser(
    token: string,
    businessId: string,
    userId: string
  ): Promise<string[]> {
    const url = new URL(`https://graph.facebook.com/${businessId}/assigned_users`)
    url.searchParams.set("fields", "id,assets.limit(500){id}")
    url.searchParams.set("access_token", token)
    url.searchParams.set("limit", LIMIT.toString())

    const res = await fetch(url.toString())
    if (!res.ok) return []

    const data = await res.json() as {
      data?: Array<{
        id?: string
        assets?: { data?: Array<{ id?: string }> }
      }>
      error?: { message?: string }
    }
    if (data.error?.message) return []

    const matched = (data.data ?? []).find((item) => item.id === userId)
    if (!matched) return []

    return (matched.assets?.data ?? [])
      .map((asset) => asset.id)
      .filter((id): id is string => Boolean(id))
  },

  async getAssignedPageIdsByPageAssignedUsersBatch(
    token: string,
    userId: string,
    pageIds: string[]
  ): Promise<string[]> {
    if (pageIds.length === 0) return []

    const batch = pageIds.map((pageId) => ({
      method: "GET",
      relative_url: `v25.0/${encodeURIComponent(pageId)}/assigned_users?fields=id&limit=500`,
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
        const hasUser = (parsed?.data ?? []).some((entry) => entry.id === userId)
        if (hasUser) assigned.push(pageId)
      } catch {
        // Ignore broken item body
      }
    }

    return assigned
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
      relative_url: `v25.0/${encodeURIComponent(pageId)}/assigned_users`,
      body: `user=${encodeURIComponent(userId)}`,
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

  async removeSystemUserFromPagesByPageAssignedUsersBatchLegacy(
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
    taskMode: "basic" | "manager" | "ads-only" | "post" = "manager"
  ): Promise<{ successPageIds: string[]; failed: Array<{ pageId: string; message: string }> }> {
    if (pageIds.length === 0) return { successPageIds: [], failed: [] }

    const tasks =
      taskMode === "ads-only"
        ? ["ADVERTISE", "ANALYZE"]
        : taskMode === "post"
          ? ["CREATE_CONTENT"]
          : taskMode === "basic"
            ? ["CREATE_CONTENT", "MODERATE", "ADVERTISE", "ANALYZE"]
            : ["MANAGE", "CREATE_CONTENT", "MODERATE", "ADVERTISE", "ANALYZE"]
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
    taskMode: "basic" | "manager" = "basic"
  ): Promise<{ successPageIds: string[]; failed: Array<{ pageId: string; message: string }> }> {
    if (pageIds.length === 0) return { successPageIds: [], failed: [] }

    const permittedTasks =
      taskMode === "manager"
        ? ["MANAGE", "CREATE_CONTENT", "MODERATE", "ADVERTISE", "ANALYZE"]
        : ["MODERATE", "ADVERTISE", "ANALYZE"]

    const failed: Array<{ pageId: string; message: string }> = []
    const successPageIds: string[] = []

    await Promise.all(
      pageIds.map(async (pageId) => {
        try {
          const url = new URL(`https://graph.facebook.com/v25.0/${encodeURIComponent(pageId)}/agencies`)
          let pageAccessToken = ""
          try {
            pageAccessToken = await this.getPageAccessToken(token, pageId)
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