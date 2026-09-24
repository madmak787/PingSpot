"use client"

import { useEffect, useRef } from "react"
import type { Map as LeafletMap, LayerGroup } from "leaflet"
import "leaflet/dist/leaflet.css"

interface MapComponentProps {
  latitude: number
  longitude: number
  label: string
  sublabel?: string
}

// Standard OSM tiles; dark mode inverts them in globals.css, since free dark tile sets need an API key
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

// IP geolocation is approximate: city level at best, so show the area rather than a precise point
const ACCURACY_RADIUS_M = 8000
const ZOOM = 10

const escapeHTML = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)

export default function MapComponent({ latitude, longitude, label, sublabel }: MapComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markersRef = useRef<LayerGroup | null>(null)
  const leafletRef = useRef<typeof import("leaflet") | null>(null)

  // Create the map once; later prop changes only move the marker
  useEffect(() => {
    let cancelled = false
    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return
      leafletRef.current = L
      const map = L.map(containerRef.current, { zoomControl: true, scrollWheelZoom: false, worldCopyJump: true })
      map.attributionControl.setPrefix(false)
      // Scroll-zoom only after the user interacts, so the page can still scroll past the map
      map.once("focus click", () => map.scrollWheelZoom.enable())
      markersRef.current = L.layerGroup().addTo(map)
      mapRef.current = map
      L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(map)
      placeMarker(latitude, longitude, label, sublabel)
    })
    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      markersRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    placeMarker(latitude, longitude, label, sublabel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude, label, sublabel])

  function placeMarker(lat: number, lng: number, title: string, subtitle?: string) {
    const L = leafletRef.current
    const map = mapRef.current
    const group = markersRef.current
    if (!L || !map || !group) return
    group.clearLayers()

    // Colours come from the .pingspot-accuracy CSS rule so they follow the theme tokens
    L.circle([lat, lng], { radius: ACCURACY_RADIUS_M, weight: 1.5, fillOpacity: 0.12, className: "pingspot-accuracy" }).addTo(
      group,
    )

    const icon = L.divIcon({
      className: "pingspot-marker",
      html: '<span class="pingspot-marker-pulse"></span><span class="pingspot-marker-dot"></span>',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
      popupAnchor: [0, -12],
    })
    L.marker([lat, lng], { icon, keyboard: false })
      .addTo(group)
      .bindPopup(
        `<div class="pingspot-popup"><strong>${escapeHTML(title)}</strong>${
          subtitle ? `<span>${escapeHTML(subtitle)}</span>` : ""
        }<small>${lat.toFixed(4)}, ${lng.toFixed(4)}</small></div>`,
        { closeButton: false },
      )

    map.setView([lat, lng], ZOOM, { animate: false })
  }

  return (
    <div
      ref={containerRef}
      className="pingspot-map size-full"
      role="region"
      aria-label={`Map centred on ${label}`}
    />
  )
}
