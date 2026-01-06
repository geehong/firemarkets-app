import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Using simple SVG icons to avoid dependency issues if lucide-react isn't installed
const ChevronRight = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="m9 18 6-6-6-6" />
    </svg>
)

const MoreHorizontal = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
        <circle cx="5" cy="12" r="1" />
    </svg>
)

const Breadcrumb = React.forwardRef<
    HTMLElement,
    React.ComponentPropsWithoutRef<"nav"> & {
        separator?: React.ReactNode;
    }
>(({ ...props }, ref) => <nav ref={ref} aria-label="breadcrumb" {...props} />);
Breadcrumb.displayName = "Breadcrumb";

const BreadcrumbList = React.forwardRef<
    HTMLOListElement,
    React.ComponentPropsWithoutRef<"ol">
>(({ className, ...props }, ref) => (
    <ol
        ref={ref}
        className={cn(
            "flex flex-wrap items-center gap-1.5 break-words text-sm text-gray-500 dark:text-gray-400 sm:gap-2.5",
            className
        )}
        {...props}
    />
));
BreadcrumbList.displayName = "BreadcrumbList";

const BreadcrumbItem = React.forwardRef<
    HTMLLIElement,
    React.ComponentPropsWithoutRef<"li">
>(({ className, ...props }, ref) => (
    <li
        ref={ref}
        className={cn("inline-flex items-center gap-1.5", className)}
        {...props}
    />
));
BreadcrumbItem.displayName = "BreadcrumbItem";

const BreadcrumbLink = React.forwardRef<
    HTMLAnchorElement,
    React.ComponentPropsWithoutRef<"a"> & {
        asChild?: boolean;
        href?: string;
    }
>(({ asChild, className, href, ...props }, ref) => {
    if (asChild) {
        return <React.Fragment ref={ref as any} {...props} />;
    }

    if (href) {
        return (
            <Link
                ref={ref}
                href={href}
                className={cn(
                    "transition-colors hover:text-gray-900 dark:hover:text-gray-50",
                    className
                )}
                {...props}
            />
        );
    }

    return (
        <a
            ref={ref}
            className={cn(
                "transition-colors hover:text-gray-900 dark:hover:text-gray-50",
                className
            )}
            {...props}
        />
    );
});
BreadcrumbLink.displayName = "BreadcrumbLink";

const BreadcrumbPage = React.forwardRef<
    HTMLSpanElement,
    React.ComponentPropsWithoutRef<"span">
>(({ className, ...props }, ref) => (
    <span
        ref={ref}
        role="link"
        aria-disabled="true"
        aria-current="page"
        className={cn("font-normal text-gray-900 dark:text-gray-50", className)}
        {...props}
    />
));
BreadcrumbPage.displayName = "BreadcrumbPage";

const BreadcrumbSeparator = ({
    children,
    className,
    ...props
}: React.ComponentProps<"li">) => (
    <li
        role="presentation"
        aria-hidden="true"
        className={cn("[&>svg]:size-3.5", className)}
        {...props}
    >
        {children ?? <ChevronRight />}
    </li>
);
BreadcrumbSeparator.displayName = "BreadcrumbSeparator";

const BreadcrumbEllipsis = ({
    className,
    ...props
}: React.ComponentProps<"span">) => (
    <span
        role="presentation"
        aria-hidden="true"
        className={cn("flex h-9 w-9 items-center justify-center", className)}
        {...props}
    >
        <MoreHorizontal className="h-4 w-4" />
        <span className="sr-only">More</span>
    </span>
);
BreadcrumbEllipsis.displayName = "BreadcrumbEllipsis";

export {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbPage,
    BreadcrumbSeparator,
    BreadcrumbEllipsis,
};
