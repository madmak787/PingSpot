import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <Logo />
      <div>
        <p className="font-display text-7xl font-semibold text-primary">404</p>
        <h1 className="mt-3 text-xl font-semibold tracking-tight">No signal at this address</h1>
        <p className="mt-2 text-sm text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      </div>
      <Button asChild>
        <Link href="/">Back to PingSpot</Link>
      </Button>
    </div>
  )
}
