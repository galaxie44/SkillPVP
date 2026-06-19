"use client";

import { useRef, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Camera, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { TacheCardPicker } from "@/components/metiers/TacheCardPicker";
import { useAppData } from "@/contexts/AppDataContext";
import { useToast } from "@/contexts/ToastContext";
import {
  formatCooldown,
} from "@/lib/metiers";
import { useTacheCooldown } from "@/hooks/useTacheCooldown";
import type { SessionUser } from "@/types";

interface ProfileClientProps {
  user: SessionUser;
}

export function ProfileClient({ user: initialUser }: ProfileClientProps) {
  const searchParams = useSearchParams();
  const { metiers } = useAppData();
  const forceChange = searchParams.get("changePassword") === "1";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const [user, setUser] = useState(initialUser);
  const [metierLoading, setMetierLoading] = useState(false);
  const [tacheAllowedAt, setTacheAllowedAt] = useState<string | null>(
    initialUser.member?.tache_change_allowed_at ?? null
  );
  const tacheCooldown = useTacheCooldown(tacheAllowedAt);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [avatarLoading, setAvatarLoading] = useState(false);

  async function handleMetierSelect(metierId: string | null) {
    if (!user.member) return;
    setMetierLoading(true);
    setError("");

    const res = await fetch("/api/profile/metier", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metier_id: metierId }),
    });

    const data = await res.json();
    setMetierLoading(false);

    if (!res.ok) {
      const msg = data.error ?? "Erreur";
      setError(msg);
      toast({ message: msg, variant: "error" });
      return;
    }

    setTacheAllowedAt(
      data.member?.tache_change_allowed_at ??
        data.tache_change_allowed_at ??
        null
    );
    setUser((u) => ({
      ...u,
      member: u.member
        ? {
            ...u.member,
            metier_id: metierId,
            metier: data.member?.metier,
            tache_change_allowed_at:
              data.member?.tache_change_allowed_at ??
              data.tache_change_allowed_at,
          }
        : u.member,
    }));
    toast({ message: "Tâche mise à jour", variant: "success" });
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("avatar", file);

    const res = await fetch("/api/profile/avatar", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setAvatarLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Erreur upload");
      return;
    }

    setUser((u) => ({ ...u, avatar_url: data.avatar_url }));
    setMessage("Photo de profil mise à jour");
  }

  async function handleRemoveAvatar() {
    setAvatarLoading(true);
    const res = await fetch("/api/profile/avatar", { method: "DELETE" });
    setAvatarLoading(false);

    if (res.ok) {
      setUser((u) => ({ ...u, avatar_url: null }));
      setMessage("Photo supprimée");
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    const res = await fetch("/api/profile/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Erreur");
      return;
    }

    setMessage("Mot de passe modifié avec succès");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mon profil</CardTitle>
          <CardDescription>{user.username}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="relative">
              <UserAvatar
                username={user.username}
                avatarUrl={user.avatar_url}
                size="lg"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarLoading}
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
              >
                <Camera className="h-4 w-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div className="flex-1 space-y-2 text-center sm:text-left">
              <p className="text-sm text-muted-foreground">
                Clique sur l&apos;icône appareil photo pour changer ta photo de profil (max 2 Mo).
              </p>
              {user.avatar_url && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveAvatar}
                  disabled={avatarLoading}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer la photo
                </Button>
              )}
            </div>
          </div>

          {user.member && (
            <div className="space-y-2 rounded-md bg-muted/50 p-4 text-sm">
              <p>
                <span className="text-muted-foreground">Pseudo MC :</span>{" "}
                <strong>{user.member.minecraft_pseudo}</strong>
              </p>
              <p>
                <span className="text-muted-foreground">Faction :</span>{" "}
                {user.member.faction?.name}
              </p>
              <p>
                <span className="text-muted-foreground">Rôle :</span>{" "}
                <Badge variant="outline">{user.member.role?.name}</Badge>
              </p>
            </div>
          )}
          {!user.member && !user.is_super_admin && (
            <p className="text-sm text-muted-foreground">
              Aucun membre de faction lié à ce compte.
            </p>
          )}
        </CardContent>
      </Card>

      {user.member && metiers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ma tâche</CardTitle>
            <CardDescription>
              Choisis sur quoi tu travailles pour ta faction
              {tacheCooldown > 0 && (
                <span className="mt-1 block text-amber-600">
                  Prochain changement possible dans {formatCooldown(tacheCooldown)}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TacheCardPicker
              metiers={metiers}
              selectedId={user.member.metier_id}
              onSelect={handleMetierSelect}
              disabled={metierLoading || tacheCooldown > 0}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Apparence</CardTitle>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Changer le mot de passe</CardTitle>
          {forceChange && (
            <CardDescription className="text-primary">
              Vous devez changer votre mot de passe avant de continuer.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label>Mot de passe actuel</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Nouveau mot de passe</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label>Confirmer</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && (
              <p className="text-sm text-green-600 dark:text-green-500">{message}</p>
            )}
            <Button type="submit">Enregistrer</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
