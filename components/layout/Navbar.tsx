"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { NavbarMain } from "./NavbarMain"
import { NavbarLanding } from "./NavbarLanding"

export function Navbar() {
    const pathname = usePathname()
    const isApp = pathname?.startsWith("/app")

    if (isApp) {
        return <NavbarMain />
    }

    return <NavbarLanding />
}
