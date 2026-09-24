"use client"

import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { toast } from "sonner"
import {
  AlertCircle,
  ArrowRight,
  Braces,
  Building2,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Globe2,
  History,
  Link2,
  Loader2,
  LocateFixed,
  MapPin,
  Network,
  RotateCw,
  Search,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Logo } from "@/components/logo"
import { ThemeToggleButton } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"
import { flagEmoji, lookup, normalizeQuery, ownAddresses, type LookupResult } from "@/lib/ip"
import { loadRecent, pushRecent, saveRecent, type RecentLookup } from "@/lib/history"

const MapComponent = dynamic(() => import("@/components/map-component"), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" />,
})

const EXAMPLES = ["8.8.8.8", "1.1.1.1", "github.com", "2606:4700:4700::1111"]

type Status = "loading" | "ready" | "error"

function readQueryFromURL() {
  return new URLSearchParams(window.location.search).get("q") ?? ""
}

function writeQueryToURL(query: string, mode: "push" | "replace") {
  const url = new URL(window.location.href)
  if (query) url.searchParams.set("q", query)
  else url.searchParams.delete("q")
  if (url.href === window.location.href) return
  window.history[mode === "push" ? "pushState" : "replaceState"](null, "", url)
}

async function copyText(value: string, what: string) {
  try {
    await navigator.clipboard.writeText(value)
    toast.success(`${what} copied`)
  } catch {
    toast.error("Couldn't access the clipboard")
  }
}

export function IPChecker() {
  const [input, setInput] = useState("")
  const [status, setStatus] = useState<Status>("loading")
  const [result, setResult] = useState<LookupResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeQuery, setActiveQuery] = useState("")
  const [recent, setRecent] = useState<RecentLookup[]>([])
  const [own, setOwn] = useState<{ ipv4?: string; ipv6?: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const requestRef = useRef<AbortController | null>(null)

  const run = useCallback(async (rawQuery: string, history: "push" | "replace" | "none" = "push") => {
    const query = normalizeQuery(rawQuery)
    // Only the latest request may update the UI
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller

    setActiveQuery(query)
    setStatus("loading")
    setError(null)
    if (history !== "none") writeQueryToURL(query, history)

    try {
      const data = await lookup(query, controller.signal)
      if (controller.signal.aborted) return
      setResult(data)
      setStatus("ready")
      if (data.query) {
        const place = [data.info.city, data.info.country].filter(Boolean).join(", ")
        setRecent((list) => {
          const next = pushRecent(list, { query: data.query, ip: data.info.ip, countryCode: data.info.countryCode, place })
          saveRecent(next)
          return next
        })
      }
    } catch (err) {
      if (controller.signal.aborted) return
      const timedOut = err instanceof DOMException && err.name === "TimeoutError"
      setError(
        timedOut
          ? "The lookup timed out. Check your connection and try again."
          : err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.",
      )
      setStatus("error")
    }
  }, [])

  // Initial load: honour ?q= links, otherwise show the visitor's own IP
  useEffect(() => {
    const initial = readQueryFromURL()
    setInput(initial)
    setRecent(loadRecent())
    run(initial, "replace")

    const controller = new AbortController()
    ownAddresses(controller.signal).then(setOwn)

    const onPopState = () => {
      const q = readQueryFromURL()
      setInput(q)
      run(q, "none")
    }
    window.addEventListener("popstate", onPopState)
    return () => {
      controller.abort()
      window.removeEventListener("popstate", onPopState)
    }
  }, [run])

  // "/" focuses the search box, like most search UIs
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return
      if (target.closest("input, textarea, [contenteditable=true]")) return
      e.preventDefault()
      inputRef.current?.focus()
      inputRef.current?.select()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (input.trim()) run(input)
  }

  const lookupValue = (value: string) => {
    setInput(value)
    run(value)
  }

  const showMine = () => {
    setInput("")
    run("")
  }

  const clearRecent = () => {
    setRecent([])
    saveRecent([])
  }

  const isOwn = status !== "error" && !activeQuery

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-1000 border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/70">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <button type="button" onClick={showMine} className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Logo />
          </button>
          <div className="flex items-center gap-1">
            <a
              href="https://tool.khanamir.me"
              className="hidden rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:inline-flex"
            >
              More tools
            </a>
            <ThemeToggleButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-12 pt-8 sm:px-6 sm:pt-12">
        <section className="mx-auto max-w-2xl text-center">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Where is that IP?
          </h1>
          <p className="mt-2 text-pretty text-muted-foreground">
            Look up the location, network and timezone of any IP address or domain.
          </p>

          <form onSubmit={submit} className="mt-6" role="search">
            <div className="flex items-center gap-2 rounded-xl border bg-card p-1.5 shadow-card focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/30">
              <Search className="ml-2 size-5 shrink-0 text-muted-foreground" aria-hidden />
              <label htmlFor="q" className="sr-only">
                IP address or domain
              </label>
              <input
                ref={inputRef}
                id="q"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setInput("")}
                placeholder="IP address or domain, e.g. 8.8.8.8"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                inputMode="url"
                className="h-10 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/80"
              />
              {input ? (
                <button
                  type="button"
                  onClick={() => {
                    setInput("")
                    inputRef.current?.focus()
                  }}
                  aria-label="Clear"
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              ) : (
                <kbd className="mr-1 hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground sm:inline">
                  /
                </kbd>
              )}
              <Button type="submit" disabled={!input.trim() || (status === "loading" && !!activeQuery)} className="h-10 px-4">
                {status === "loading" && activeQuery ? <Loader2 className="animate-spin" /> : <ArrowRight />}
                <span className="hidden sm:inline">Look up</span>
              </Button>
            </div>
          </form>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-sm">
            {recent.length > 0 ? (
              <>
                <span className="mr-1 inline-flex items-center gap-1 text-muted-foreground">
                  <History className="size-3.5" /> Recent
                </span>
                {recent.map((r) => (
                  <Chip key={r.query} onClick={() => lookupValue(r.query)} title={[r.ip !== r.query && r.ip, r.place].filter(Boolean).join(" · ")}>
                    {r.countryCode && <span aria-hidden>{flagEmoji(r.countryCode)}</span>}
                    {r.query}
                  </Chip>
                ))}
                <button type="button" onClick={clearRecent} className="ml-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
                  Clear
                </button>
              </>
            ) : (
              <>
                <span className="mr-1 text-muted-foreground">Try</span>
                {EXAMPLES.map((ex) => (
                  <Chip key={ex} onClick={() => lookupValue(ex)}>
                    {ex}
                  </Chip>
                ))}
              </>
            )}
          </div>
        </section>

        <OwnAddresses own={own} onLookup={lookupValue} active={isOwn} onShowMine={showMine} />

        {status === "error" ? (
          <ErrorPanel message={error} onRetry={() => run(activeQuery, "none")} onShowMine={activeQuery ? showMine : undefined} />
        ) : (
          <Results result={status === "ready" ? result : null} isOwn={isOwn} />
        )}
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-center text-xs text-muted-foreground sm:px-6 lg:flex-row lg:text-left">
          <p>
            Built by{" "}
            <a href="https://khanamir.me" className="font-medium text-foreground underline-offset-2 hover:underline">
              Mohd Amir Khan
            </a>
            . Lookups run in your browser; nothing is stored on a server.
          </p>
          <p>
            Data: ipwho.is, freeipapi.com, geojs.io · DNS: Cloudflare · Map: OpenStreetMap, CARTO
          </p>
        </div>
      </footer>
    </div>
  )
}

function Chip({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="inline-flex max-w-[16rem] items-center gap-1.5 truncate rounded-full border bg-card px-2.5 py-1 font-mono text-xs text-foreground/80 transition-colors hover:border-primary/40 hover:bg-brand-soft hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </button>
  )
}

function OwnAddresses({
  own,
  onLookup,
  onShowMine,
  active,
}: {
  own: { ipv4?: string; ipv6?: string } | null
  onLookup: (ip: string) => void
  onShowMine: () => void
  active: boolean
}) {
  const rows = [
    { label: "IPv4", value: own?.ipv4 },
    { label: "IPv6", value: own?.ipv6 },
  ]
  return (
    <section aria-label="Your addresses" className="mx-auto mt-8 flex max-w-3xl flex-col items-stretch gap-2 rounded-xl border bg-card/60 p-2 sm:flex-row sm:items-center">
      <button
        type="button"
        onClick={onShowMine}
        className={cn(
          "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          active ? "bg-brand-soft text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        <LocateFixed className="size-4" /> My IP
      </button>
      <div className="grid flex-1 gap-1 sm:grid-cols-2">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex min-w-0 items-center gap-2 rounded-lg px-3 py-1.5">
            <span className="w-9 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
            {own === null ? (
              <Skeleton className="h-4 w-32" />
            ) : value ? (
              <>
                <button
                  type="button"
                  onClick={() => onLookup(value)}
                  title={`Look up ${value}`}
                  className="min-w-0 truncate font-mono text-sm hover:text-primary"
                >
                  {value}
                </button>
                <CopyButton value={value} what={`${label} address`} className="ml-auto" />
              </>
            ) : (
              <span className="text-sm text-muted-foreground">Not detected</span>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function CopyButton({ value, what, className }: { value: string; what: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(t)
  }, [copied])
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => copyText(value, what).then(() => setCopied(true))}
          aria-label={`Copy ${what}`}
          className={cn(
            "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
        >
          {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
        </button>
      </TooltipTrigger>
      <TooltipContent>Copy {what}</TooltipContent>
    </Tooltip>
  )
}

function ErrorPanel({ message, onRetry, onShowMine }: { message: string | null; onRetry: () => void; onShowMine?: () => void }) {
  return (
    <div role="alert" className="mx-auto mt-8 max-w-xl rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
      <AlertCircle className="mx-auto size-8 text-destructive" />
      <p className="mt-3 font-medium">Lookup failed</p>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      <div className="mt-5 flex justify-center gap-2">
        <Button variant="outline" onClick={onRetry}>
          <RotateCw /> Try again
        </Button>
        {onShowMine && (
          <Button variant="ghost" onClick={onShowMine}>
            <LocateFixed /> Show my IP
          </Button>
        )}
      </div>
    </div>
  )
}

function Results({ result, isOwn }: { result: LookupResult | null; isOwn: boolean }) {
  const info = result?.info
  const hasCoords = info?.latitude != null && info?.longitude != null
  const place = info ? [info.city, info.region, info.country].filter(Boolean).join(", ") : ""

  const shareLink = () => {
    if (!result) return
    const url = new URL(window.location.href)
    url.searchParams.set("q", result.query || result.info.ip)
    copyText(url.toString(), "Link")
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-5" aria-busy={!info}>
      <div className="flex flex-col gap-6 lg:col-span-2">
        {/* Summary */}
        <section className="rounded-xl border bg-card p-5 shadow-card">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {!info ? (
              "Looking up…"
            ) : isOwn ? (
              "Your public IP address"
            ) : result?.hostname ? (
              <>
                <span className="normal-case tracking-normal text-foreground">{result.hostname}</span> resolves to
              </>
            ) : (
              "IP address"
            )}
          </p>
          <div className="mt-1.5 flex items-start gap-2">
            {info ? (
              <p className="min-w-0 break-all font-mono text-2xl font-semibold tracking-tight sm:text-[28px]">{info.ip}</p>
            ) : (
              <Skeleton className="h-9 w-56" />
            )}
            {info && <CopyButton value={info.ip} what="IP address" className="mt-1" />}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {info ? (
              <>
                <span className="rounded-md bg-brand-soft px-2 py-0.5 text-xs font-semibold text-primary">{info.version}</span>
                {place && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <span aria-hidden className="text-base leading-none">
                      {flagEmoji(info.countryCode)}
                    </span>
                    {place}
                  </span>
                )}
              </>
            ) : (
              <Skeleton className="h-5 w-44" />
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
            <Button variant="outline" size="sm" disabled={!info} onClick={() => info && copyText(JSON.stringify(result, null, 2), "JSON")}>
              <Braces /> Copy JSON
            </Button>
            <Button variant="outline" size="sm" disabled={!info} onClick={shareLink}>
              <Link2 /> Share link
            </Button>
          </div>
        </section>

        {/* Details */}
        <section className="rounded-xl border bg-card shadow-card">
          <DetailGroup icon={MapPin} title="Location">
            <Detail label="City" value={info?.city} loading={!info} />
            <Detail label="Region" value={info?.region} loading={!info} />
            <Detail label="Postal code" value={info?.postal} loading={!info} />
            <Detail
              label="Country"
              value={info?.country && `${info.country}${info.countryCode ? ` (${info.countryCode})` : ""}`}
              loading={!info}
            />
            <Detail label="Continent" value={info?.continent} loading={!info} />
            <Detail
              label="Coordinates"
              value={hasCoords ? `${info!.latitude!.toFixed(4)}, ${info!.longitude!.toFixed(4)}` : undefined}
              mono
              loading={!info}
              action={
                hasCoords && (
                  <a
                    href={`https://www.google.com/maps?q=${info!.latitude},${info!.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open in Google Maps"
                    title="Open in Google Maps"
                    className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                )
              }
            />
          </DetailGroup>
          <DetailGroup icon={Network} title="Network">
            <Detail label="ISP" value={info?.isp} loading={!info} />
            {info?.org !== info?.isp && <Detail label="Organization" value={info?.org} loading={!info} />}
            <Detail
              label="ASN"
              value={info?.asn}
              mono
              loading={!info}
              action={
                info?.asn && (
                  <a
                    href={`https://bgp.he.net/${info.asn}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`View ${info.asn} on bgp.he.net`}
                    title="View on bgp.he.net"
                    className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                )
              }
            />
            {info?.domain && <Detail label="Domain" value={info.domain} />}
          </DetailGroup>
          <DetailGroup icon={Clock} title="Time">
            <Detail label="Timezone" value={info?.timezone} loading={!info} />
            <Detail label="Local time" value={info?.timezone ? <LocalTime timeZone={info.timezone} /> : undefined} loading={!info} />
          </DetailGroup>
        </section>
      </div>

      {/* Map */}
      <section className="lg:col-span-3">
        <div className="overflow-hidden rounded-xl border bg-card shadow-card lg:sticky lg:top-20">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Globe2 className="size-4 text-primary" /> Map
            </h2>
            {info && <span className="text-xs text-muted-foreground">Approximate · data from {info.source}</span>}
          </div>
          <div className="relative isolate h-[360px] sm:h-[460px] lg:h-[560px]">
            {!info ? (
              <Skeleton className="size-full rounded-none" />
            ) : hasCoords ? (
              <MapComponent latitude={info.latitude!} longitude={info.longitude!} label={place || info.ip} sublabel={info.ip} />
            ) : (
              <div className="flex size-full flex-col items-center justify-center gap-2 bg-muted/40 text-sm text-muted-foreground">
                <Building2 className="size-6" />
                No coordinates available for this address
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

function DetailGroup({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="border-b px-5 py-4 last:border-b-0">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4 text-primary" /> {title}
      </h2>
      <dl className="divide-y divide-border/60">{children}</dl>
    </div>
  )
}

function Detail({
  label,
  value,
  mono,
  loading,
  action,
}: {
  label: string
  value?: React.ReactNode
  mono?: boolean
  loading?: boolean
  action?: React.ReactNode
}) {
  return (
    <div className="flex min-h-9 items-center gap-3 py-1.5 text-sm">
      <dt className="w-28 shrink-0 text-muted-foreground">{label}</dt>
      <dd className={cn("min-w-0 flex-1 wrap-break-word", mono && "font-mono text-[13px]")}>
        {loading ? <Skeleton className="h-4 w-3/4" /> : value || <span className="text-muted-foreground/60">—</span>}
      </dd>
      {!loading && action}
    </div>
  )
}

function LocalTime({ timeZone }: { timeZone: string }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  try {
    const time = new Intl.DateTimeFormat(undefined, { timeZone, weekday: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(now)
    const offset = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" })
      .formatToParts(now)
      .find((p) => p.type === "timeZoneName")?.value
    return (
      <span className="tabular-nums">
        {time} <span className="text-muted-foreground">{offset}</span>
      </span>
    )
  } catch {
    // Unknown zone name from a provider
    return null
  }
}
