"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "@/components/providers/language-provider";

interface JoinCodeCardProps {
  organizationId: string;
  initialJoinCode: string | null;
}

export function JoinCodeCard({ organizationId, initialJoinCode }: JoinCodeCardProps) {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState(initialJoinCode);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const t = useTranslations();

  async function generateJoinCode() {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/organizations/${organizationId}/join-code`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to generate join code");
        return;
      }

      setJoinCode(data.joinCode);
      router.refresh();
    } catch (error) {
      alert("Failed to generate join code");
    } finally {
      setIsLoading(false);
    }
  }

  function copyToClipboard() {
    if (joinCode) {
      navigator.clipboard.writeText(joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.settings.inviteMembers}</CardTitle>
        <CardDescription>{t.settings.joinCodeDescription}</CardDescription>
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
                title={copied ? t.settings.codeCopied : t.settings.copyCode}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {copied && <p className="text-sm text-green-600 dark:text-green-400">{t.settings.codeCopied}</p>}
            <div className="space-y-2">
              <Button variant="outline" size="sm" onClick={generateJoinCode} disabled={isLoading}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {isLoading ? t.common.loading : t.settings.regenerateCode}
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <Button onClick={generateJoinCode} disabled={isLoading}>
              {isLoading ? t.common.loading : t.settings.joinCode}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
