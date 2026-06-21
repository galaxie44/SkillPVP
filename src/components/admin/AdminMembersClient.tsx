"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2, Key, Copy, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserAvatar } from "@/components/ui/user-avatar";
import type {
  Faction,
  FactionMemberWithRelations,
  Metier,
} from "@/types";
import { sanitizeUsername } from "@/lib/utils";
import { TacheCardPicker } from "@/components/metiers/TacheCardPicker";
import { getMetierIcon, METIER_COLORS } from "@/lib/metiers";
import { useLiveMembers } from "@/hooks/useLiveMembers";
import { LiveIndicator } from "@/components/dashboard/LiveIndicator";
import { useAppData } from "@/contexts/AppDataContext";
import { useConfirm } from "@/contexts/ConfirmContext";

interface Role {
  id: string;
  faction_id: string;
  name: string;
}

interface AdminMembersClientProps {
  isSuperAdmin: boolean;
  canCreatePlayers: boolean;
  defaultFactionId: string | null;
}

export function AdminMembersClient({
  isSuperAdmin,
  canCreatePlayers,
  defaultFactionId,
}: AdminMembersClientProps) {
  const { factions, metiers, refreshMembers } = useAppData();
  const { confirm } = useConfirm();
  const { members: allMembers, isLive } = useLiveMembers();

  const members = isSuperAdmin
    ? allMembers
    : defaultFactionId
      ? allMembers.filter((m) => m.faction_id === defaultFactionId)
      : allMembers;
  const [roles, setRoles] = useState<Role[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<FactionMemberWithRelations | null>(null);
  const [error, setError] = useState("");
  const [credentials, setCredentials] = useState<{
    username: string;
    password: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    faction_id: "",
    minecraft_pseudo: "",
    role_id: "",
    metier_id: "",
    createAccount: false,
  });

  useEffect(() => {
    if (factions.length > 0 && !form.faction_id) {
      const defaultId = defaultFactionId || factions[0]?.id || "";
      setForm((f) => ({ ...f, faction_id: defaultId }));
    }
  }, [factions, defaultFactionId, form.faction_id]);

  useEffect(() => {
    if (!form.faction_id) return;

    fetch(`/api/roles?faction_id=${form.faction_id}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Role[]) => {
        setRoles(data);
        setForm((f) => {
          const roleStillValid = data.some((r) => r.id === f.role_id);
          const membre = data.find((r) => r.name === "Membre");
          return {
            ...f,
            role_id: roleStillValid
              ? f.role_id
              : membre?.id ?? data[0]?.id ?? "",
          };
        });
      });
  }, [form.faction_id]);

  function updatePseudo(pseudo: string) {
    setForm((f) => ({ ...f, minecraft_pseudo: pseudo }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCredentials(null);

    const base = {
      faction_id: form.faction_id,
      minecraft_pseudo: form.minecraft_pseudo,
      role_id: form.role_id,
      metier_id: form.metier_id || null,
    };

    let body: Record<string, unknown>;

    if (editingId) {
      body = { id: editingId, ...base };
      if (form.createAccount && !editingMember?.user_id) {
        body.create_account = true;
      }
    } else {
      body = { ...base };
    }

    const res = await fetch("/api/members", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Erreur");
      return;
    }

    if (data.plainPassword) {
      setCredentials({
        username: data.createdUsername ?? sanitizeUsername(form.minecraft_pseudo),
        password: data.plainPassword,
      });
    }

    resetForm();
    await refreshMembers(true);
  }

  function resetForm() {
    setEditingId(null);
    setEditingMember(null);
    setForm({
      faction_id: defaultFactionId || factions[0]?.id || "",
      minecraft_pseudo: "",
      role_id: roles[0]?.id ?? "",
      metier_id: "",
      createAccount: false,
    });
  }

  function startEdit(m: FactionMemberWithRelations) {
    setEditingId(m.id);
    setEditingMember(m);
    setForm({
      faction_id: m.faction_id,
      minecraft_pseudo: m.minecraft_pseudo,
      role_id: m.role_id,
      metier_id: m.metier_id ?? "",
      createAccount: !m.user_id,
    });
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Supprimer ce joueur ?",
      description: "Le compte et le membre de faction seront supprimés.",
      confirmLabel: "Supprimer",
      destructive: true,
    });
    if (!ok) return;
    await fetch(`/api/members?id=${id}`, { method: "DELETE" });
    await refreshMembers(true);
  }

  async function handleResetPassword(id: string) {
    const res = await fetch("/api/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, reset_password: true }),
    });
    const data = await res.json();
    if (res.ok && data.plainPassword) {
      setCredentials({
        username: data.createdUsername ?? data.user?.username ?? "",
        password: data.plainPassword,
      });
    }
    await refreshMembers(true);
  }

  async function handleToggleActive(id: string, isActive: boolean) {
    await fetch("/api/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, user_is_active: !isActive }),
    });
    await refreshMembers(true);
  }

  async function copyCredentials() {
    if (!credentials) return;
    await navigator.clipboard.writeText(
      `Login: ${credentials.username}\nMot de passe: ${credentials.password}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const canChangeFaction = isSuperAdmin;
  const showPlayerForm = canCreatePlayers || editingId;

  return (
    <div className="space-y-8">
      <LiveIndicator isLive={isLive} className="justify-end" />

      {credentials && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Key className="h-5 w-5" />
              Identifiants de connexion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              <span className="text-muted-foreground">Login :</span>{" "}
              <strong>{credentials.username}</strong>
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Mot de passe :</span>{" "}
              <strong className="font-mono">{credentials.password}</strong>
            </p>
            <p className="text-xs text-muted-foreground">
              Communique ces identifiants au joueur. Il devra changer son mot de passe à la première connexion.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={copyCredentials}>
              {copied ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {copied ? "Copié" : "Copier"}
            </Button>
          </CardContent>
        </Card>
      )}

      {showPlayerForm && (
      <Card className="glass-card bg-transparent">
        <CardHeader>
          <CardTitle>
            {editingId ? "Modifier un joueur" : "Ajouter un joueur"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>Faction</Label>
                {canChangeFaction ? (
                  <Select
                    value={form.faction_id}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, faction_id: v, role_id: "" }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {factions.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex h-10 items-center rounded-md border border-border bg-muted/30 px-3 text-sm">
                    {factions.find((f) => f.id === form.faction_id)?.name ??
                      "—"}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Pseudo Minecraft</Label>
                <Input
                  value={form.minecraft_pseudo}
                  onChange={(e) => updatePseudo(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Rôle</Label>
                <Select
                  value={form.role_id}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, role_id: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {editingId && (
              <TacheCardPicker
                metiers={metiers}
                selectedId={form.metier_id || null}
                onSelect={(id) =>
                  setForm((f) => ({ ...f, metier_id: id ?? "" }))
                }
                description="Tâche assignée à ce joueur (le joueur peut aussi la choisir lui-même)"
              />
            )}

            {!editingId && (
              <p className="text-sm text-muted-foreground">
                La tâche sera choisie par le joueur après sa première connexion.
              </p>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2">
              <Button type="submit">
                {editingId ? "Enregistrer" : "Ajouter le joueur"}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Annuler
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
      )}

      <Card className="glass-card bg-transparent">
        <CardHeader>
          <CardTitle>Joueurs ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left">Joueur</th>
                  <th className="px-4 py-3 text-left">Faction</th>
                  <th className="px-4 py-3 text-left">Tâche</th>
                  <th className="px-4 py-3 text-left">Rôle</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <UserAvatar
                          username={m.user?.username ?? m.minecraft_pseudo}
                          size="sm"
                        />
                        <div>
                          <p className="font-medium">{m.minecraft_pseudo}</p>
                          <p className="text-xs text-muted-foreground">
                            {m.user?.username ?? "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{m.faction?.name}</td>
                    <td className="px-4 py-3">
                      {m.metier ? (
                        <Badge
                          variant="secondary"
                          className="gap-1"
                        >
                          {(() => {
                            const Icon = getMetierIcon(m.metier.name);
                            const color =
                              METIER_COLORS[m.metier.name] ?? "#6b7280";
                            return (
                              <>
                                <Icon
                                  className="h-3 w-3"
                                  style={{ color }}
                                />
                                {m.metier.name}
                              </>
                            );
                          })()}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{m.role?.name}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {m.user ? (
                        <Badge variant={m.user.is_active ? "default" : "outline"}>
                          {m.user.is_active ? "Actif" : "Désactivé"}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-destructive text-destructive"
                        >
                          Sans compte
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Modifier"
                          onClick={() => startEdit(m)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {m.user && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Réinitialiser le mot de passe"
                              onClick={() => handleResetPassword(m.id)}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              title={
                                m.user.is_active ? "Désactiver" : "Activer"
                              }
                              onClick={() =>
                                handleToggleActive(m.id, m.user!.is_active)
                              }
                            >
                              <span className="text-xs font-bold">
                                {m.user.is_active ? "OFF" : "ON"}
                              </span>
                            </Button>
                          </>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Supprimer"
                          onClick={() => handleDelete(m.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
