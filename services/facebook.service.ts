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
  }
}