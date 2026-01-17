"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Copy, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"

interface JoinCodeCardProps {
  organizationId: string
  initialJoinCode: string | null
}

export function JoinCodeCard({ organizationId, initialJoinCode }: JoinCodeCardProps) {
  const router = useRouter()
  const [joinCode, setJoinCode] = useState(initialJoinCode)
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function generateJoinCode() {
    setIsLoading(true)

    try {
      const response = await fetch(`/api/organizations/${organizationId}/join-code`, {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || "Failed to generate join code")
        return
      }

      setJoinCode(data.joinCode)
      router.refresh()
    } catch (error) {
      alert("Failed to generate join code")
    } finally {
      setIsLoading(false)
    }
  }

  function copyToClipboard() {
    if (joinCode) {
      navigator.clipboard.writeText(joinCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite Members</CardTitle>
        <CardDescription>
          Share this code with others to invite them to your organization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {joinCode ? (
          <>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-muted rounded-md font-mono text-2xl font-bold text-center tracking-wider">
                {joinCode}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={copyToClipboard}
                title={copied ? "Copied!" : "Copy to clipboard"}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {copied && (
              <p className="text-sm text-green-600 dark:text-green-400">
                Copied to clipboard!
              </p>
            )}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                New members can use this code during signup to join your organization.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={generateJoinCode}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {isLoading ? "Generating..." : "Regenerate Code"}
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You haven't generated a join code yet. Click the button below to create one.
            </p>
            <Button onClick={generateJoinCode} disabled={isLoading}>
              {isLoading ? "Generating..." : "Generate Join Code"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
