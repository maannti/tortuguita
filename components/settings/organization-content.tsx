"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JoinCodeCard } from "@/components/organization/join-code-card";
import { useTranslations } from "@/components/providers/language-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { User, Home, Plus, Users, Pencil, Trash2, LogOut, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";

interface UserMember {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  createdAt: string;
}

interface Organization {
  id: string;
  name: string;
  isPersonal: boolean;
  joinCode: string | null;
  role: string;
  memberCount: number;
  joinedAt?: string;
}

interface OrganizationContentProps {
  organization: {
    id: string;
    name: string;
    joinCode: string | null;
    isPersonal: boolean;
    createdAt: string;
  };
  users: UserMember[];
  currentUserId: string;
  currentUserRole: string;
  allOrganizations: Organization[];
}

export function OrganizationContent({
  organization,
  users,
  currentUserId,
  currentUserRole,
  allOrganizations,
}: OrganizationContentProps) {
  const t = useTranslations();
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(organization.name);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isSwitching, setIsSwitching] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isOwner = currentUserRole === "owner";
  const canDelete = isOwner && allOrganizations.length > 1;
  const canLeave = !isOwner && allOrganizations.length > 1;

  const handleSwitchOrganization = async (orgId: string) => {
    if (orgId === organization.id) return;

    setIsSwitching(orgId);
    try {
      await updateSession({ currentOrganizationId: orgId });
      router.refresh();
    } catch (error) {
      console.error("Failed to switch organization:", error);
    } finally {
      setIsSwitching(null);
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSaveName = async () => {
    if (!editName.trim() || editName === organization.name) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/organizations/${organization.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });

      if (response.ok) {
        router.refresh();
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Failed to update organization name:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/organizations/${organization.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Find another org to switch to
        const nextOrg = allOrganizations.find((org) => org.id !== organization.id);
        if (nextOrg) {
          await updateSession({ currentOrganizationId: nextOrg.id });
        }
        router.refresh();
        setDeleteDialogOpen(false);
      } else {
        const data = await response.json();
        setError(data.error || t.errors.somethingWentWrong);
      }
    } catch (error) {
      setError(t.errors.somethingWentWrong);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLeave = async () => {
    setIsLeaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/organizations/${organization.id}/leave`, {
        method: "POST",
      });

      if (response.ok) {
        // Find another org to switch to
        const nextOrg = allOrganizations.find((org) => org.id !== organization.id);
        if (nextOrg) {
          await updateSession({ currentOrganizationId: nextOrg.id });
        }
        router.refresh();
        setLeaveDialogOpen(false);
      } else {
        const data = await response.json();
        setError(data.error || t.errors.somethingWentWrong);
      }
    } catch (error) {
      setError(t.errors.somethingWentWrong);
    } finally {
      setIsLeaving(false);
    }
  };

  const handleCreate = async () => {
    if (!newOrgName.trim()) return;

    setIsCreating(true);
    setError(null);
    try {
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newOrgName.trim(), isPersonal: false }),
      });

      if (response.ok) {
        setNewOrgName("");
        setCreateDialogOpen(false);
        router.refresh();
      } else {
        const data = await response.json();
        setError(data.error || t.errors.somethingWentWrong);
      }
    } catch (error) {
      setError(t.errors.somethingWentWrong);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;

    setIsJoining(true);
    setError(null);
    try {
      const response = await fetch("/api/organizations/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: joinCode.trim() }),
      });

      if (response.ok) {
        setJoinCode("");
        setJoinDialogOpen(false);
        router.refresh();
      } else {
        const data = await response.json();
        setError(data.error || t.errors.invalidJoinCode);
      }
    } catch (error) {
      setError(t.errors.somethingWentWrong);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.settings.organizationSettings}</h1>
        <p className="text-muted-foreground">{t.settings.organizationDescription}</p>
      </div>

      {/* All Organizations List */}
      <Card>
        <CardHeader>
          <CardTitle>{t.settings.yourOrganizations}</CardTitle>
          <CardDescription>{t.settings.yourOrganizationsDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {allOrganizations.map((org) => (
            <button
              key={org.id}
              onClick={() => handleSwitchOrganization(org.id)}
              disabled={isSwitching !== null}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border w-full text-left transition-colors",
                org.id === organization.id
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-primary/50 hover:bg-muted/50",
                isSwitching === org.id && "opacity-50"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                  org.id === organization.id ? "bg-primary text-primary-foreground" : "bg-muted"
                )}
              >
                {org.isPersonal ? <User className="h-5 w-5" /> : <Home className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{org.name}</p>
                <p className="text-xs text-muted-foreground">
                  {org.memberCount} {org.memberCount === 1 ? t.settings.member : t.settings.members} •{" "}
                  {org.role === "owner" ? t.settings.owner : t.settings.memberRole}
                </p>
              </div>
              {org.id === organization.id && (
                <span className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded-full">
                  {t.settings.current}
                </span>
              )}
            </button>
          ))}

          {/* Add Organization Buttons */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setCreateDialogOpen(true)} className="flex-1 gap-1">
              <Plus className="h-4 w-4" />
              {t.settings.createOrganization}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setJoinDialogOpen(true)} className="flex-1 gap-1">
              <Users className="h-4 w-4" />
              {t.settings.joinOrganization}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Organization Details */}
      <Card>
        <CardHeader>
          <CardTitle>{t.settings.organizationDetails}</CardTitle>
          <CardDescription>{t.settings.organizationInfo}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Organization Name */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Home className="h-6 w-6 text-primary" />
            </div>
            {isEditing ? (
              <div className="flex flex-1 gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={isSaving}
                  autoFocus
                  className="flex-1"
                />
                <Button size="icon" variant="ghost" onClick={handleSaveName} disabled={isSaving}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setEditName(organization.name);
                    setIsEditing(false);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex-1 min-w-0">
                <p className="text-lg font-semibold truncate">{organization.name}</p>
                <p className="text-sm text-muted-foreground">{t.settings.organizationName}</p>
              </div>
            )}
            {!isEditing && isOwner && (
              <div className="flex flex-col gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                {canDelete && (
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteDialogOpen(true)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border bg-card text-center">
              <div className="flex justify-center mb-2">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold">{users.length}</p>
              <p className="text-sm text-muted-foreground">{t.settings.members}</p>
            </div>
            <div className="p-4 rounded-lg border bg-card text-center">
              <div className="flex justify-center mb-2">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold">{isOwner ? t.settings.owner : t.settings.memberRole}</p>
              <p className="text-sm text-muted-foreground">{t.settings.yourRole}</p>
            </div>
          </div>

          {/* Actions */}
          {canLeave && (
            <div className="flex gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => setLeaveDialogOpen(true)} className="gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50">
                <LogOut className="h-4 w-4" />
                {t.settings.leaveOrganization}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Join Code - only for shared organizations */}
      {!organization.isPersonal && (
        <JoinCodeCard organizationId={organization.id} initialJoinCode={organization.joinCode} />
      )}

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle>{t.settings.members}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between py-3 border-b last:border-b-0">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={user.image || ""} alt={user.name || ""} />
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 bg-muted rounded-full">
                    {user.role === "owner" ? t.settings.owner : t.settings.memberRole}
                  </span>
                  {user.id === currentUserId && (
                    <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                      {t.common.you}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.settings.deleteOrganization}</DialogTitle>
            <DialogDescription>{t.settings.deleteOrganizationConfirm}</DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? t.common.deleting : t.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Confirmation Dialog */}
      <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.settings.leaveOrganization}</DialogTitle>
            <DialogDescription>{t.settings.leaveOrganizationConfirm}</DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaveDialogOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button variant="destructive" onClick={handleLeave} disabled={isLeaving}>
              {isLeaving ? t.common.leaving : t.settings.leave}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Organization Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.settings.createOrganization}</DialogTitle>
            <DialogDescription>{t.settings.createOrganizationDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder={t.settings.organizationName}
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleCreate} disabled={isCreating || !newOrgName.trim()}>
              {isCreating ? t.common.creating : t.common.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Join Organization Dialog */}
      <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.settings.joinOrganization}</DialogTitle>
            <DialogDescription>{t.settings.joinOrganizationDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder={t.settings.joinCode}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinDialogOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleJoin} disabled={isJoining || !joinCode.trim()}>
              {isJoining ? t.common.joining : t.settings.join}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
