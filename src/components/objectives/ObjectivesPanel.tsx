"use client";

import { useEffect, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { getMetierIcon, METIER_COLORS, getObjectiveMetiers } from "@/lib/metiers";
import {
  getObjectiveLabel,
  isMetierLevelObjective,
  canManageObjective,
} from "@/lib/objectives-client";
import { formatQuantityWithChests } from "@/lib/minecraft";
import { useConfirm } from "@/contexts/ConfirmContext";
import { useToast } from "@/contexts/ToastContext";
import { useAppData } from "@/contexts/AppDataContext";
import type {
  FactionObjective,
  Metier,
  ObjectiveSubmission,
  ObjectiveType,
  SessionUser,
} from "@/types";
import { cn } from "@/lib/utils";

interface ObjectivesPanelProps {
  factionId: string;
  user: SessionUser;
  metiers: Metier[];
  canManage: boolean;
  isInFaction: boolean;
}

export function ObjectivesPanel({
  factionId,
  user,
  metiers,
  canManage,
  isInFaction,
}: ObjectivesPanelProps) {
  const {
    objectives: cachedObjectives,
    objectivesPending: cachedPending,
    objectivesFactionId,
    objectivesLoading,
    refreshObjectives,
  } = useAppData();

  const objectives =
    objectivesFactionId === factionId ? (cachedObjectives ?? []) : [];
  const pending =
    objectivesFactionId === factionId ? cachedPending : [];
  const loading =
    objectivesLoading ||
    (objectivesFactionId !== factionId && cachedObjectives === null);

  const { confirm } = useConfirm();
  const { toast } = useToast();

  const [createType, setCreateType] = useState<ObjectiveType>("item");
  const [form, setForm] = useState({
    item_name: "",
    target_quantity: "",
    metier_id: "",
    current_level: "0",
    is_shared: false,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    item_name: "",
    target_quantity: "",
    approved_quantity: "",
  });
  const [submitQty, setSubmitQty] = useState<Record<string, string>>({});
  const [levelDraft, setLevelDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const objectiveMetiers = getObjectiveMetiers(metiers);

  function canSubmitOn(obj: FactionObjective) {
    if (!user.member) return false;
    if (obj.is_shared) return true;
    return isInFaction;
  }

  function canManageObj(obj: FactionObjective) {
    return canManageObjective(user, obj);
  }

  function reloadObjectives() {
    return refreshObjectives(factionId, true);
  }

  useEffect(() => {
    if (objectivesFactionId !== factionId || cachedObjectives === null) {
      refreshObjectives(factionId);
    }
  }, [factionId, objectivesFactionId, cachedObjectives, refreshObjectives]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const shared = form.is_shared;
    const body =
      createType === "item"
        ? {
            objective_type: "item" as const,
            faction_id: factionId,
            item_name: form.item_name,
            target_quantity: parseInt(form.target_quantity, 10),
            is_shared: shared,
          }
        : {
            objective_type: "metier_level" as const,
            faction_id: factionId,
            metier_id: form.metier_id,
            target_quantity: parseInt(form.target_quantity, 10),
            approved_quantity: parseInt(form.current_level, 10) || 0,
            is_shared: shared,
          };

    const res = await fetch("/api/objectives", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Erreur");
      toast({ message: data.error ?? "Erreur", variant: "error" });
      return;
    }
    setForm({
      item_name: "",
      target_quantity: "",
      metier_id: "",
      current_level: "0",
      is_shared: false,
    });
    toast({
      message: shared
        ? "Objectif commun v1/v2 créé"
        : "Objectif créé",
      variant: "success",
    });
    await reloadObjectives();
  }

  async function handleUpdate(obj: FactionObjective) {
    const isMetier = isMetierLevelObjective(obj);
    const res = await fetch(`/api/objectives/${obj.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        isMetier
          ? {
              target_quantity: parseInt(editForm.target_quantity, 10),
              approved_quantity: parseInt(editForm.approved_quantity, 10),
            }
          : {
              item_name: editForm.item_name,
              target_quantity: parseInt(editForm.target_quantity, 10),
            }
      ),
    });
    if (res.ok) {
      setEditingId(null);
      toast({ message: "Objectif mis à jour", variant: "success" });
      await reloadObjectives();
    } else {
      const data = await res.json();
      toast({ message: data.error ?? "Erreur", variant: "error" });
    }
  }

  async function handleSetLevel(objectiveId: string) {
    const level = parseInt(levelDraft[objectiveId] ?? "", 10);
    if (Number.isNaN(level) || level < 0) return;

    const res = await fetch(`/api/objectives/${objectiveId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved_quantity: level }),
    });
    if (res.ok) {
      setLevelDraft((s) => ({ ...s, [objectiveId]: "" }));
      toast({ message: "Niveau mis à jour", variant: "success" });
      await reloadObjectives();
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Supprimer cet objectif ?",
      description: "Cette action est irréversible.",
      confirmLabel: "Supprimer",
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/objectives/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ message: "Objectif supprimé", variant: "success" });
      await reloadObjectives();
    }
  }

  async function handleSubmit(objectiveId: string) {
    const qty = parseInt(submitQty[objectiveId] ?? "0", 10);
    if (!qty || qty < 1) return;

    const res = await fetch("/api/objectives/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ objective_id: objectiveId, quantity: qty }),
    });
    const data = await res.json();
    if (res.ok) {
      setSubmitQty((s) => ({ ...s, [objectiveId]: "" }));
      toast({ message: "Contribution envoyée — en attente de validation", variant: "success" });
      await reloadObjectives();
    } else {
      setError(data.error ?? "Erreur");
      toast({ message: data.error ?? "Erreur", variant: "error" });
    }
  }

  async function handleReview(submissionId: string, action: "approve" | "reject") {
    const res = await fetch("/api/objectives/review", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submission_id: submissionId, action }),
    });
    if (res.ok) {
      toast({
        message: action === "approve" ? "Contribution validée" : "Contribution refusée",
        variant: action === "approve" ? "success" : "info",
      });
      await reloadObjectives();
    }
  }

  const myMemberId = user.member?.id;

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Chargement des objectifs…</p>
    );
  }

  return (
    <div className="space-y-6">
      {canManage && (
        <Card className="glass-card bg-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Nouvel objectif
            </CardTitle>
            <CardDescription>
              Objectif commun à toute la faction
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={createType === "item" ? "default" : "outline"}
                onClick={() => setCreateType("item")}
              >
                Item / ressource
              </Button>
              <Button
                type="button"
                size="sm"
                variant={createType === "metier_level" ? "default" : "outline"}
                onClick={() => setCreateType("metier_level")}
              >
                Niveau métier
              </Button>
            </div>

            <form
              onSubmit={handleCreate}
              className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
            >
              {createType === "item" ? (
                <>
                  <div className="space-y-2">
                    <Label>Item</Label>
                    <Input
                      value={form.item_name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, item_name: e.target.value }))
                      }
                      placeholder="ex. Diamant"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantité objectif</Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.target_quantity}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          target_quantity: e.target.value,
                        }))
                      }
                      required
                    />
                    {form.target_quantity && parseInt(form.target_quantity, 10) > 0 && (
                      <p className="text-xs text-muted-foreground">
                        ≈ {formatQuantityWithChests(parseInt(form.target_quantity, 10))}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Métier / tâche</Label>
                    <Select
                      value={form.metier_id}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, metier_id: v }))
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir…" />
                      </SelectTrigger>
                      <SelectContent>
                        {objectiveMetiers.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Niveau objectif</Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={form.target_quantity}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          target_quantity: e.target.value,
                        }))
                      }
                      placeholder="ex. 8"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Niveau actuel</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={form.current_level}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          current_level: e.target.value,
                        }))
                      }
                    />
                  </div>
                </>
              )}

              <div className="flex items-center gap-2 md:col-span-2 lg:col-span-4">
                <Checkbox
                  id="is_shared"
                  checked={form.is_shared}
                  onCheckedChange={(v) =>
                    setForm((f) => ({ ...f, is_shared: v === true }))
                  }
                />
                <Label htmlFor="is_shared" className="cursor-pointer font-normal">
                  Objectif commun v1 & v2 (progression synchronisée)
                </Label>
              </div>

              <div className="flex items-end">
                <Button type="submit" className="w-full">
                  Créer
                </Button>
              </div>
            </form>
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
      )}

      {pending.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <CardTitle>À valider ({pending.length})</CardTitle>
            <CardDescription>
              Contributions items déclarées par les joueurs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pending.map((sub) => {
              const isOwn =
                sub.member_id === myMemberId ||
                sub.member?.user_id === user.id;
              return (
              <div
                key={sub.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/50 p-3"
              >
                <div className="text-sm">
                  <strong>{sub.member?.minecraft_pseudo}</strong>
                  {" — "}
                  +{sub.quantity}{" "}
                  {(sub.objective as FactionObjective)?.item_name}
                  {isOwn && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (ta contribution)
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {isOwn ? (
                    <span className="text-xs text-muted-foreground">
                      Un autre admin doit valider
                    </span>
                  ) : (
                    <>
                  <Button
                    size="sm"
                    onClick={() => handleReview(sub.id, "approve")}
                  >
                    <Check className="mr-1 h-4 w-4" />
                    Accepter
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReview(sub.id, "reject")}
                  >
                    <X className="mr-1 h-4 w-4" />
                    Refuser
                  </Button>
                    </>
                  )}
                </div>
              </div>
            );
            })}
          </CardContent>
        </Card>
      )}

      <Card className="glass-card bg-transparent">
        <CardHeader>
          <CardTitle>Objectifs</CardTitle>
          <CardDescription>
            {canManage
              ? "Items (joueurs déclarent) et niveaux métier (mise à jour admin)"
              : "Tes objectifs et progression"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {objectives.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun objectif pour l&apos;instant.
            </p>
          ) : (
            objectives.map((obj) => {
              const isMetier = isMetierLevelObjective(obj);
              const label = getObjectiveLabel(obj);
              const pendingQty = obj.pending_quantity ?? 0;
              const approvedPct = Math.min(
                100,
                (obj.approved_quantity / obj.target_quantity) * 100
              );
              const pendingPct = Math.min(
                100 - approvedPct,
                (pendingQty / obj.target_quantity) * 100
              );
              const totalPct = Math.min(
                100,
                Math.round(approvedPct + pendingPct)
              );
              const complete = obj.approved_quantity >= obj.target_quantity;
              const isEditing = editingId === obj.id;
              const MetierIcon = obj.metier
                ? getMetierIcon(obj.metier.name)
                : null;
              const metierColor = obj.metier
                ? METIER_COLORS[obj.metier.name] ?? "#6b7280"
                : undefined;

              return (
                <div
                  key={obj.id}
                  className="rounded-xl border border-border p-4"
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      {isMetier && MetierIcon && (
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `${metierColor}22` }}
                        >
                          <MetierIcon
                            className="h-5 w-5"
                            style={{ color: metierColor }}
                          />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold">{label}</p>
                        <p className="text-sm text-muted-foreground">
                          Objectif de faction
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs">
                            {isMetier ? "Niveau métier" : "Item"}
                          </Badge>
                          {obj.is_shared && (
                            <Badge className="bg-sky-600 text-xs">Commun v1/v2</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {complete ? (
                        <Badge className="bg-green-600">Complet</Badge>
                      ) : (
                        <Badge variant="outline">{totalPct}%</Badge>
                      )}
                      {canManageObj(obj) && !isEditing && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingId(obj.id);
                              setEditForm({
                                item_name: obj.item_name ?? "",
                                target_quantity: String(obj.target_quantity),
                                approved_quantity: String(
                                  obj.approved_quantity
                                ),
                              });
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(obj.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {isEditing && canManageObj(obj) ? (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {!isMetier && (
                        <Input
                          value={editForm.item_name}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              item_name: e.target.value,
                            }))
                          }
                          className="w-full sm:max-w-[160px]"
                        />
                      )}
                      <Input
                        type="number"
                        value={editForm.target_quantity}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            target_quantity: e.target.value,
                          }))
                        }
                        className="w-full sm:max-w-[100px]"
                        placeholder="Objectif"
                      />
                      {isMetier && (
                        <Input
                          type="number"
                          value={editForm.approved_quantity}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              approved_quantity: e.target.value,
                            }))
                          }
                          className="w-full sm:max-w-[100px]"
                          placeholder="Niveau actuel"
                        />
                      )}
                      <Button size="sm" onClick={() => handleUpdate(obj)}>
                        OK
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingId(null)}
                      >
                        Annuler
                      </Button>
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        {isMetier ? (
                          <>
                            Niveau {obj.approved_quantity} / {obj.target_quantity}
                          </>
                        ) : (
                          <>
                            Quantité{" "}
                            {formatQuantityWithChests(obj.approved_quantity)} /{" "}
                            {formatQuantityWithChests(obj.target_quantity)}
                            {pendingQty > 0 && (
                              <span className="text-amber-600 dark:text-amber-400">
                                {" "}
                                (+{formatQuantityWithChests(pendingQty)} en attente)
                              </span>
                            )}
                          </>
                        )}
                      </span>
                      <span>{totalPct}%</span>
                    </div>
                    <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                      {isMetier ? (
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            complete ? "bg-green-500" : "bg-primary"
                          )}
                          style={{ width: `${approvedPct}%` }}
                        />
                      ) : (
                        <>
                          <div
                            className="h-full bg-green-500 transition-all"
                            style={{ width: `${approvedPct}%` }}
                            title={`Validé : ${obj.approved_quantity}`}
                          />
                          {pendingPct > 0 && (
                            <div
                              className="h-full bg-amber-400 transition-all"
                              style={{ width: `${pendingPct}%` }}
                              title={`En attente : ${pendingQty}`}
                            />
                          )}
                        </>
                      )}
                    </div>
                    {!isMetier && (obj.approved_quantity > 0 || pendingQty > 0) && (
                      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                          Validé
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
                          En attente
                        </span>
                      </div>
                    )}
                  </div>

                  {canManageObj(obj) && isMetier && !complete && !isEditing && (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <Input
                        type="number"
                        min={0}
                        max={obj.target_quantity}
                        placeholder={`Niveau actuel (${obj.approved_quantity})`}
                        value={levelDraft[obj.id] ?? ""}
                        onChange={(e) =>
                          setLevelDraft((s) => ({
                            ...s,
                            [obj.id]: e.target.value,
                          }))
                        }
                        className="w-full sm:max-w-[180px]"
                      />
                      <Button size="sm" onClick={() => handleSetLevel(obj.id)}>
                        Mettre à jour le niveau
                      </Button>
                    </div>
                  )}

                  {canSubmitOn(obj) && !complete && !isMetier && (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <Input
                        type="number"
                        min={1}
                        placeholder="Quantité ajoutée"
                        value={submitQty[obj.id] ?? ""}
                        onChange={(e) =>
                          setSubmitQty((s) => ({
                            ...s,
                            [obj.id]: e.target.value,
                          }))
                        }
                        className="max-w-[160px]"
                      />
                      <Button size="sm" onClick={() => handleSubmit(obj.id)}>
                        J&apos;ai ajouté
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
