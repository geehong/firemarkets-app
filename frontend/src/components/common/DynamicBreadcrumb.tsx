'use client'

import React from 'react'
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/common/Breadcrumb'
import { usePathname } from 'next/navigation'

export default function DynamicBreadcrumb() {
    const pathname = usePathname()
    const paths = pathname ? pathname.split('/').filter(p => p) : []

    // Skip breadcrumb on dashboard/home
    if (paths.length === 0) return null

    return (
        <Breadcrumb>
            <BreadcrumbList>
                <BreadcrumbItem>
                    <BreadcrumbLink href="/">Home</BreadcrumbLink>
                </BreadcrumbItem>
                {paths.map((path, index) => {
                    const href = `/${paths.slice(0, index + 1).join('/')}`
                    const isLast = index === paths.length - 1

                    // Format path: remove - and capitalize first letter of each word
                    const label = path
                        .replace(/-/g, ' ')
                        .replace(/\b\w/g, c => c.toUpperCase())

                    return (
                        <React.Fragment key={path}>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                {isLast ? (
                                    <BreadcrumbPage>{label}</BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink href={href}>{label}</BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                        </React.Fragment>
                    )
                })}
            </BreadcrumbList>
        </Breadcrumb>
    )
}
