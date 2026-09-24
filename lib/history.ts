const KEY = "pingspot:recent"
const LIMIT = 8

export interface RecentLookup {
  query: string
  ip: string
  countryCode?: string
  place?: string
}

export function loadRecent(): RecentLookup[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]")
    return Array.isArray(parsed) ? parsed.filter((r) => r && typeof r.query === "string").slice(0, LIMIT) : []
  } catch {
    return []
  }
}

export function saveRecent(list: RecentLookup[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, LIMIT)))
  } catch {
    // Private mode or storage full: history is a convenience, so ignore
  }
}

export function pushRecent(list: RecentLookup[], entry: RecentLookup) {
  return [entry, ...list.filter((r) => r.query !== entry.query)].slice(0, LIMIT)
}
