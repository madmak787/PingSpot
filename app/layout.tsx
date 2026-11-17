import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"


export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://tool.khanamir.me/pingspot"),
  title: {
    default: "PingSpot — What's my IP? IP & domain location lookup",
    template: "%s · PingSpot",
  },
  description:
    "See your public IPv4 and IPv6 address, then look up the location, ISP, ASN and timezone of any IP address or domain on a live map. Free, fast, no sign-up.",
  openGraph: {
    title: "PingSpot — IP & domain location lookup",
    description: "Find the location, ISP and network of any IP address or domain, shown on a map.",
    images: ["thumbnail.png"],
    type: "website",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfcfd" },
    { media: "(prefers-color-scheme: dark)", color: "#18181b" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster position="bottom-center" />
        </ThemeProvider>
      </body>
    </html>
  )
}
