"use client"

import { useEffect,useRef, useState } from "react"
import { facebookService } from "@/services/facebook.service"

export function useFacebookSDK(appId: string) {
  const [ready, setReady] = useState(false)
  const initialized = useRef(false)
  const version = process.env.NEXT_PUBLIC_FB_APP_VERSION!

  useEffect(() => {
    if (typeof window === "undefined") return
    if (initialized.current) return

    initialized.current = true

    const init = () => {
      facebookService.init(appId, version)
      if (window.FB?.XFBML) {
        window.FB.XFBML.parse()
      }

      setReady(true)
    }

    if (window.FB) {
      init()
      return
    }

    window.fbAsyncInit = init


    const script = document.createElement("script")
    script.id = "facebook-jssdk" // thêm id để tránh load trùng
    script.src = "https://connect.facebook.net/en_US/sdk.js"
    script.async = true
    script.defer = true
    script.crossOrigin = "anonymous"

    document.body.appendChild(script)
  }, [appId, version])

  return ready
}