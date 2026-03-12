export {}

declare global {
  interface Window {
    fbAsyncInit: () => void
    FB: FacebookSDK
  }
}

interface FacebookSDK {
  init: (options: {
    appId?: string
    cookie?: boolean
    xfbml?: boolean
    version?: string
  }) => void

  login: (
    callback: (response: FacebookLoginResponse) => void,
    options?: { scope?: string }
  ) => void

  getLoginStatus: (
    callback: (response: FacebookLoginResponse) => void
  ) => void

  api: <T = unknown>(
    path: string,
    params: Record<string, unknown>,
    callback: (response: T) => void
  ) => void

  XFBML: {
    parse: (element?: HTMLElement) => void
  }
}

interface FacebookLoginResponse {
  status: "connected" | "not_authorized" | "unknown"
  authResponse?: {
    accessToken: string
    expiresIn: number
    userID: string
  }
}

export interface FacebookUser {
  id: string
  name: string
}

export interface SystemUser {
  _id?: string
  id: string
  name: string
  token?: string
  appName?: string
  businessId?: string
  businessName?: string
  roleCode?: string
  role?: "admin" | "employee" | string
  description?: string
  createdAt?: string | Date
  updatedAt?: string | Date
}

export interface FacebookPage {
  id: string
  name: string
  access_token: string
  category?: string
}

export interface FacebookBusiness {
  id: string
  name: string
  permitted_roles?: string[]
}

export interface FacebookAuthResponse {
  status: "connected" | "not_authorized" | "unknown"
  authResponse?: {
    accessToken: string
    expiresIn: number
    userID: string
  }
}