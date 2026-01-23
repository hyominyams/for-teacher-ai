"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { NavbarMain } from "./NavbarMain"
import { NavbarLanding } from "./NavbarLanding"

export function Navbar() {
    const pathname = usePathname()

    // Hide navbar on auth related pages
    const isAuthPage = ["/login", "/signup", "/auth/callback"].includes(pathname || "")
    if (isAuthPage) return null

    const isApp = pathname?.startsWith("/app")

    if (isApp) {
        return <NavbarMain />
    }

    // Default to main landing navbar for other pages (resources, etc.)
    return <NavbarLanding />
}
