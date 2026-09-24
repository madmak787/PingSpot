import type React from "react"
import type { Metadata, Viewport } from "next"
import { Fredoka, Inter, JetBrains_Mono } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-fredoka",
})

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-jetbrains",
})

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
      <body className={`${inter.variable} ${fredoka.variable} ${mono.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster position="bottom-center" />
        </ThemeProvider>
      </body>
    </html>
  )
}
