"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export function LandingRouteGuard({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const [isLoggedIn, setIsLoggedIn] = React.useState<boolean | null>(null)

    React.useEffect(() => {
        let mounted = true

        supabase.auth.getSession()
            .then(({ data: { session } }) => {
                if (mounted) setIsLoggedIn(!!session)
            })
            .catch(() => {
                if (mounted) setIsLoggedIn(false)
            })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (mounted) setIsLoggedIn(!!session)
        })

        return () => {
            mounted = false
            subscription.unsubscribe()
        }
    }, [])

    React.useEffect(() => {
        if (pathname === "/" && isLoggedIn) {
            router.replace("/app")
            router.refresh()
        }
    }, [isLoggedIn, pathname, router])

    if (pathname === "/" && isLoggedIn !== false) {
        return null
    }

    return children
}
