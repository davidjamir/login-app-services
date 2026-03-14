const SESSION_KEY = "admin_session"
const SESSION_DURATION_MS = 60 * 60 * 1000 // 1 hour

type SessionData = { password: string; expiresAt: number }

export function saveSession(password: string): void {
  if (typeof window === "undefined") return
  const data: SessionData = {
    password,
    expiresAt: Date.now() + SESSION_DURATION_MS,
  }
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(data))
  } catch {
    // localStorage may be disabled
  }
}

export function loadSession(): string | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as SessionData
    if (data.expiresAt <= Date.now()) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return data.password
  } catch {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore
  }
}

export function isSessionExpired(): boolean {
  if (typeof window === "undefined") return true
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return true
    const data = JSON.parse(raw) as SessionData
    if (data.expiresAt <= Date.now()) {
      localStorage.removeItem(SESSION_KEY)
      return true
    }
    return false
  } catch {
    return true
  }
}
