import { cn } from "@/lib/utils"

/** Radar-ping mark: a location dot with two expanding rings. Same drawing as app/icon.svg. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-5" aria-hidden>
        <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
        <path d="M7.76 16.24a6 6 0 0 1 0-8.48M16.24 7.76a6 6 0 0 1 0 8.48" />
        <path d="M4.93 19.07a10 10 0 0 1 0-14.14M19.07 4.93a10 10 0 0 1 0 14.14" opacity=".55" />
      </svg>
    </span>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="leading-none">
        <span className="block font-display text-[17px] font-semibold tracking-tight">PingSpot</span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">IP &amp; domain locator</span>
      </span>
    </span>
  )
}
