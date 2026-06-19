"use client";

import { useEffect, useState } from "react";
import { Copy, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/contexts/ConfirmContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FactionMemberWithRelations } from "@/types";

interface User {
  id: string;
  username: string;
  is_super_admin: boolean;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
}

export function AdminUsersClient() {
  const { confirm } = useConfirm();
  const [users, setUsers] = useState<User[]>([]);
  const [members, setMembers] = useState<FactionMemberWithRelations[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [generatePassword, setGeneratePassword] = useState(true);
  const [mustChange, setMustChange] = useState(true);
  const [linkMemberId, setLinkMemberId] = useState("");
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const [usersRes, membersRes] = await Promise.all([
      fetch("/api/users"),
      fetch("/api/members"),
    ]);
    if (usersRes.ok) setUsers(await usersRes.json());
    if (membersRes.ok) setMembers(await membersRes.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCreatedPassword(null);
    setLoading(true);

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        password: generatePassword ? undefined : password,
        generatePassword,
        must_change_password: mustChange,
        linkMemberId: linkMemberId || undefined,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Erreur");
      return;
    }

    setCreatedPassword(data.plainPassword);
    setUsername("");
    setPassword("");
    setLinkMemberId("");
    load();
  }

  async function handleReset(id: string) {
    const newPass = Math.random().toString(36).slice(-10) + "A1!";
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, newPassword: newPass }),
    });
    const data = await res.json();
    if (res.ok) {
      setCreatedPassword(data.plainPassword);
      alert(`Nouveau mot de passe pour ${data.user.username}: ${data.plainPassword}`);
    }
  }

  async function handleToggleActive(id: string, is_active: boolean) {
    await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active: !is_active }),
    });
    load();
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Supprimer ce compte ?",
      description: "Cette action est irréversible.",
      confirmLabel: "Supprimer",
      destructive: true,
    });
    if (!ok) return;
    await fetch(`/api/users?id=${id}`, { method: "DELETE" });
    load();
  }

  function copyPassword() {
    if (createdPassword) {
      navigator.clipboard.writeText(createdPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const unlinkedMembers = members.filter((m) => !m.user_id);

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Créer un compte</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nom d&apos;utilisateur</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Lier à un membre (optionnel)</Label>
                <Select
                  value={linkMemberId || "none"}
                  onValueChange={(v) =>
                    setLinkMemberId(v === "none" ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Aucun" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {unlinkedMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.minecraft_pseudo} ({m.faction?.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={generatePassword}
                  onCheckedChange={(c) => setGeneratePassword(!!c)}
                />
                Générer le mot de passe
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={mustChange}
                  onCheckedChange={(c) => setMustChange(!!c)}
                />
                Forcer changement au 1er login
              </label>
            </div>

            {!generatePassword && (
              <div className="space-y-2">
                <Label>Mot de passe</Label>
                <Input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={loading}>
              {loading ? "Création..." : "Créer le compte"}
            </Button>
          </form>

          {createdPassword && (
            <div className="mt-4 rounded-md border border-primary/30 bg-primary/10 p-4">
              <p className="text-sm font-medium text-primary">
                Mot de passe créé (copie-le maintenant, il ne sera plus affiché) :
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 rounded bg-background px-3 py-2 font-mono text-lg">
                  {createdPassword}
                </code>
                <Button size="icon" variant="outline" onClick={copyPassword}>
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comptes existants ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left">Username</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">
                      {u.username}
                      {u.is_super_admin && (
                        <Badge className="ml-2" variant="secondary">
                          Super Admin
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={u.is_active ? "default" : "outline"}>
                        {u.is_active ? "Actif" : "Désactivé"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {!u.is_super_admin && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReset(u.id)}
                          >
                            <RefreshCw className="mr-1 h-3 w-3" />
                            Reset mdp
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleToggleActive(u.id, u.is_active)
                            }
                          >
                            {u.is_active ? "Désactiver" : "Activer"}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(u.id)}
                          >
                            Supprimer
                          </Button>
                        </div>
                      )}
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
