"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
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
import { ALL_PERMISSIONS, type Faction, type PermissionKey } from "@/types";

interface RoleWithPerms {
  id: string;
  faction_id: string;
  name: string;
  is_system: boolean;
  permissions: string[];
}

export function AdminRolesClient() {
  const { confirm } = useConfirm();
  const [roles, setRoles] = useState<RoleWithPerms[]>([]);
  const [factions, setFactions] = useState<Faction[]>([]);
  const [selectedFaction, setSelectedFaction] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState<PermissionKey[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const metaRes = await fetch("/api/meta");
    if (metaRes.ok) {
      const meta = await metaRes.json();
      setFactions(meta.factions);
      if (!selectedFaction && meta.factions[0]) {
        setSelectedFaction(meta.factions[0].id);
      }
    }
  }

  async function loadRoles(factionId: string) {
    const res = await fetch(`/api/roles?faction_id=${factionId}`);
    if (res.ok) setRoles(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (selectedFaction) loadRoles(selectedFaction);
  }, [selectedFaction]);

  function togglePermission(key: PermissionKey) {
    setPermissions((prev) =>
      prev.includes(key)
        ? prev.filter((p) => p !== key)
        : [...prev, key]
    );
  }

  function startEdit(role: RoleWithPerms) {
    setEditingId(role.id);
    setName(role.name);
    setPermissions(role.permissions as PermissionKey[]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/roles", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        editingId
          ? { id: editingId, name, permissions }
          : { faction_id: selectedFaction, name, permissions }
      ),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Erreur");
      return;
    }

    setEditingId(null);
    setName("");
    setPermissions([]);
    loadRoles(selectedFaction);
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Supprimer ce rôle ?",
      description: "Les joueurs avec ce rôle devront être réassignés.",
      confirmLabel: "Supprimer",
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/roles?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) alert(data.error);
    loadRoles(selectedFaction);
  }

  const factionRoles = roles.filter((r) => r.faction_id === selectedFaction);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Label>Faction :</Label>
        <Select value={selectedFaction} onValueChange={setSelectedFaction}>
          <SelectTrigger className="w-[200px]">
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {editingId ? "Modifier le rôle" : "Créer un rôle custom"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nom du rôle</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={!!editingId && roles.find((r) => r.id === editingId)?.is_system}
              />
            </div>

            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {ALL_PERMISSIONS.map((p) => (
                  <label
                    key={p.key}
                    className="flex items-center gap-2 rounded-md border border-border p-3 text-sm"
                  >
                    <Checkbox
                      checked={permissions.includes(p.key)}
                      onCheckedChange={() => togglePermission(p.key)}
                    />
                    {p.label}
                  </label>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2">
              <Button type="submit">
                {editingId ? "Enregistrer" : "Créer"}
              </Button>
              {editingId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setName("");
                    setPermissions([]);
                  }}
                >
                  Annuler
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rôles de la faction</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {factionRoles.map((role) => (
            <div
              key={role.id}
              className="rounded-lg border border-border p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{role.name}</span>
                  {role.is_system && (
                    <Badge variant="secondary">Système</Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startEdit(role)}
                  >
                    Modifier permissions
                  </Button>
                  {!role.is_system && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(role.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {role.permissions.map((p) => (
                  <Badge key={p} variant="outline" className="text-xs">
                    {ALL_PERMISSIONS.find((ap) => ap.key === p)?.label ?? p}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
