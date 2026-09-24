export type IPVersion = "IPv4" | "IPv6"

export interface IPInfo {
  ip: string
  version: IPVersion
  city?: string
  region?: string
  postal?: string
  country?: string
  countryCode?: string
  continent?: string
  latitude?: number
  longitude?: number
  timezone?: string
  isp?: string
  org?: string
  asn?: string
  domain?: string
  /** Name of the service that answered, shown next to the results */
  source: string
}

export interface LookupResult {
  query: string
  /** Set when the query was a hostname that had to be resolved first */
  hostname?: string
  info: IPInfo
}

export class LookupError extends Error {}

const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/
const HOSTNAME = /^(?=.{1,253}$)([a-z\d]([a-z\d-]{0,61}[a-z\d])?\.)+[a-z]{2,63}$/i

export function isIPv4(value: string) {
  return IPV4.test(value)
}

export function isIPv6(value: string) {
  if (!value.includes(":")) return false
  try {
    // The URL parser implements the full IPv6 grammar (compression, embedded IPv4, …)
    new URL(`http://[${value}]/`)
    return /^[\da-f:.]+$/i.test(value)
  } catch {
    return false
  }
}

export function ipVersion(value: string): IPVersion | null {
  if (isIPv4(value)) return "IPv4"
  if (isIPv6(value)) return "IPv6"
  return null
}

/** Accepts pasted URLs like "https://example.com/path" and "[2001:db8::1]" as well as bare values. */
export function normalizeQuery(raw: string) {
  let value = raw.trim()
  if (!value) return ""
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(value)) {
    try {
      value = new URL(value).hostname
    } catch {
      // not a URL after all; validate as typed
    }
  }
  value = value.replace(/^\[(.*)\]$/, "$1")
  // Strip a port from "host:port" / "1.2.3.4:80" (IPv6 has more than one colon)
  if ((value.match(/:/g) ?? []).length === 1) value = value.split(":")[0]
  return value.replace(/\.$/, "").toLowerCase()
}

export function isHostname(value: string) {
  return HOSTNAME.test(value)
}

/** Returns a reason when the address can't have a public geolocation, otherwise null. */
export function reservedRange(ip: string): string | null {
  if (isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number)
    if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return "a private network address"
    if (a === 127) return "a loopback address"
    if (a === 169 && b === 254) return "a link-local address"
    if (a === 100 && b >= 64 && b <= 127) return "a carrier-grade NAT address"
    if (a === 0) return "a reserved \"this network\" address"
    if (a >= 224 && a <= 239) return "a multicast address"
    if (a >= 240) return "a reserved address"
    return null
  }
  const v = ip.toLowerCase()
  if (v === "::1") return "a loopback address"
  if (v === "::") return "the unspecified address"
  if (/^f[cd]/.test(v)) return "a private (unique local) address"
  if (/^fe[89ab]/.test(v)) return "a link-local address"
  if (v.startsWith("ff")) return "a multicast address"
  if (v.startsWith("2001:db8") || v.startsWith("2001:0db8")) return "a documentation address"
  return null
}

const TIMEOUT_MS = 8000

async function getJSON(url: string, signal?: AbortSignal, init?: RequestInit) {
  const timeout = AbortSignal.timeout(TIMEOUT_MS)
  // AbortSignal.any is missing on older Safari; fall back to the caller's signal alone
  const combined = signal ? (typeof AbortSignal.any === "function" ? AbortSignal.any([signal, timeout]) : signal) : timeout
  const response = await fetch(url, { ...init, signal: combined })
  if (!response.ok) throw new Error(`${new URL(url).host} responded ${response.status}`)
  return response.json()
}

const text = (value: unknown) => {
  if (value == null) return undefined
  const s = String(value).trim()
  return s && s !== "-" && s !== "0" ? s : undefined
}

const num = (value: unknown) => {
  const n = typeof value === "string" ? Number.parseFloat(value) : value
  return typeof n === "number" && Number.isFinite(n) ? n : undefined
}

const asn = (value: unknown) => {
  const s = text(value)
  if (!s) return undefined
  return /^as/i.test(s) ? s.toUpperCase() : `AS${s}`
}

type Provider = (ip: string | undefined, signal?: AbortSignal) => Promise<IPInfo>

// ipwho.is (the free, CORS-enabled endpoint of ipwhois.io; ipwhois.app refuses browser requests)
const ipwhois: Provider = async (ip, signal) => {
  const d = await getJSON(`https://ipwho.is/${ip ?? ""}`, signal)
  if (!d.success) throw new LookupError(d.message || "Lookup failed")
  return {
    ip: d.ip,
    version: d.type === "IPv6" ? "IPv6" : "IPv4",
    city: text(d.city),
    region: text(d.region),
    postal: text(d.postal),
    country: text(d.country),
    countryCode: text(d.country_code),
    continent: text(d.continent),
    latitude: num(d.latitude),
    longitude: num(d.longitude),
    timezone: text(d.timezone?.id),
    isp: text(d.connection?.isp),
    org: text(d.connection?.org),
    asn: asn(d.connection?.asn),
    domain: text(d.connection?.domain),
    source: "ipwho.is",
  }
}

const freeipapi: Provider = async (ip, signal) => {
  const d = await getJSON(`https://free.freeipapi.com/api/v1/json/${ip ?? ""}`, signal)
  if (!d.ipAddress) throw new Error("freeipapi returned no address")
  return {
    ip: d.ipAddress,
    version: d.ipVersion === 6 ? "IPv6" : "IPv4",
    city: text(d.cityName),
    region: text(d.regionName),
    postal: text(d.zipCode),
    country: text(d.countryName),
    countryCode: text(d.countryCode),
    continent: text(d.continent),
    latitude: num(d.latitude),
    longitude: num(d.longitude),
    // The API lists every zone of the country, so only trust a single entry
    timezone: Array.isArray(d.timeZones) && d.timeZones.length === 1 ? d.timeZones[0] : undefined,
    isp: text(d.asnOrganization),
    org: text(d.asnOrganization),
    asn: asn(d.asn),
    source: "freeipapi.com",
  }
}

const geojs: Provider = async (ip, signal) => {
  const d = await getJSON(ip ? `https://get.geojs.io/v1/ip/geo/${ip}.json` : "https://get.geojs.io/v1/ip/geo.json", signal)
  if (!d.ip) throw new Error("geojs returned no address")
  return {
    ip: d.ip,
    version: isIPv6(d.ip) ? "IPv6" : "IPv4",
    city: text(d.city),
    region: text(d.region),
    country: text(d.country),
    countryCode: text(d.country_code),
    latitude: num(d.latitude),
    longitude: num(d.longitude),
    timezone: text(d.timezone),
    isp: text(d.organization_name),
    org: text(d.organization_name),
    asn: asn(d.asn),
    source: "geojs.io",
  }
}

const PROVIDERS = [ipwhois, freeipapi, geojs]

/** Geolocates an IP (or the visitor's own address when ip is omitted), trying each provider in turn. */
export async function geolocate(ip?: string, signal?: AbortSignal): Promise<IPInfo> {
  let lastError: unknown
  for (const provider of PROVIDERS) {
    try {
      return await provider(ip, signal)
    } catch (error) {
      if (signal?.aborted) throw error
      // A definite answer such as "Invalid IP address" won't change with another provider
      if (error instanceof LookupError) throw error
      lastError = error
    }
  }
  console.error("All IP lookup providers failed", lastError)
  throw new LookupError("All IP lookup services are unavailable right now. Please try again in a moment.")
}

/** Resolves a hostname to its first A (or AAAA) record over DNS-over-HTTPS. */
export async function resolveHostname(hostname: string, signal?: AbortSignal): Promise<string> {
  for (const type of ["A", "AAAA"] as const) {
    const d = await getJSON(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=${type}`, signal, {
      headers: { accept: "application/dns-json" },
    })
    if (d.Status === 3) throw new LookupError(`${hostname} does not exist (NXDOMAIN).`)
    const record = (d.Answer ?? []).find((a: { type: number; data: string }) => a.type === (type === "A" ? 1 : 28))
    if (record) return record.data
  }
  throw new LookupError(`${hostname} has no A or AAAA records.`)
}

/** The visitor's public IPv4 and IPv6 addresses (either may be missing). */
export async function ownAddresses(signal?: AbortSignal) {
  const get = (url: string) =>
    getJSON(url, signal)
      .then((d) => (typeof d.ip === "string" ? (d.ip as string) : undefined))
      .catch(() => undefined)
  const [v4, v64] = await Promise.all([get("https://api.ipify.org?format=json"), get("https://api64.ipify.org?format=json")])
  return { ipv4: v4, ipv6: v64 && isIPv6(v64) ? v64 : undefined }
}

export async function lookup(rawQuery: string, signal?: AbortSignal): Promise<LookupResult> {
  const query = normalizeQuery(rawQuery)
  if (!query) {
    return { query: "", info: await geolocate(undefined, signal) }
  }

  let ip = query
  let hostname: string | undefined
  if (!ipVersion(query)) {
    if (!isHostname(query)) {
      throw new LookupError(`"${rawQuery.trim()}" isn't a valid IPv4 address, IPv6 address or domain name.`)
    }
    hostname = query
    ip = await resolveHostname(query, signal)
  }

  const reserved = reservedRange(ip)
  if (reserved) {
    throw new LookupError(`${ip} is ${reserved}, so it has no public location.`)
  }

  return { query, hostname, info: await geolocate(ip, signal) }
}

/** 🇺🇸 from "US" */
export function flagEmoji(countryCode?: string) {
  if (!countryCode || !/^[a-z]{2}$/i.test(countryCode)) return ""
  return String.fromCodePoint(...[...countryCode.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
}
