"use client"

import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useAdminCreateDiscount,
  useAdminDeleteDiscount,
  useAdminDiscounts,
  useAdminUpdateDiscount,
} from "@/hooks/use-admin"
import {
  parseRollPresetString,
  type RollPreset,
  type RollPresetString,
} from "@/lib/domain/roll-presets"

type DiscountDraft = {
  rollPreset: RollPresetString
  discountPercent: string
  label: string
  active: "active" | "inactive"
}

function toOptionalRollPreset(
  value: "all" | DiscountDraft["rollPreset"]
): RollPreset | undefined {
  if (value === "all") return undefined
  return parseRollPresetString(value)
}

function toDraft(input: {
  roll_preset: number
  discount_percent: number
  label: string | null
  active: boolean
}): DiscountDraft {
  return {
    rollPreset: String(input.roll_preset) as RollPresetString,
    discountPercent: String(input.discount_percent),
    label: input.label ?? "",
    active: input.active ? "active" : "inactive",
  }
}

function getErrorMessage(error: unknown): string | null {
  if (!error) return null
  if (error instanceof Error) return error.message
  return "Something went wrong. Please try again."
}

export function AdminDiscountsPane() {
  const [filterRollPreset, setFilterRollPreset] = useState<"all" | RollPresetString>("all")
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all")

  const [createRollPreset, setCreateRollPreset] = useState<RollPresetString>("8")
  const [createDiscountPercent, setCreateDiscountPercent] = useState("0")
  const [createLabel, setCreateLabel] = useState("")
  const [createActive, setCreateActive] = useState<"active" | "inactive">("active")

  const [editingById, setEditingById] = useState<Record<string, DiscountDraft>>({})

  const discountFilters = useMemo(
    () => ({
      rollPreset: toOptionalRollPreset(filterRollPreset),
      active: filterActive,
      limit: 100,
    }),
    [filterRollPreset, filterActive]
  )

  const discountsQuery = useAdminDiscounts(discountFilters)
  const createDiscountMutation = useAdminCreateDiscount()
  const updateDiscountMutation = useAdminUpdateDiscount()
  const deleteDiscountMutation = useAdminDeleteDiscount()
  const isMutating =
    createDiscountMutation.isPending ||
    updateDiscountMutation.isPending ||
    deleteDiscountMutation.isPending

  function beginEdit(discount: {
    id: string
    roll_preset: number
    discount_percent: number
    label: string | null
    active: boolean
  }) {
    setEditingById((prev) => ({
      ...prev,
      [discount.id]: toDraft(discount),
    }))
  }

  function updateDraft(id: string, next: Partial<DiscountDraft>) {
    setEditingById((prev) => {
      const current = prev[id]
      if (!current) return prev
      return {
        ...prev,
        [id]: {
          ...current,
          ...next,
        },
      }
    })
  }

  function cancelEdit(id: string) {
    setEditingById((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  function handleCreate() {
    const percent = Number(createDiscountPercent)
    createDiscountMutation.mutate(
      {
        rollPreset: parseRollPresetString(createRollPreset),
        discountPercent: Number.isFinite(percent) ? percent : 0,
        label: createLabel.trim() || undefined,
        active: createActive === "active",
      },
      {
        onSuccess: () => {
          setCreateDiscountPercent("0")
          setCreateLabel("")
          setCreateActive("active")
        },
      }
    )
  }

  function handleSave(discountId: string) {
    const draft = editingById[discountId]
    if (!draft) return

    const percent = Number(draft.discountPercent)
    updateDiscountMutation.mutate(
      {
        id: discountId,
        rollPreset: parseRollPresetString(draft.rollPreset),
        discountPercent: Number.isFinite(percent) ? percent : 0,
        label: draft.label.trim() ? draft.label.trim() : null,
        active: draft.active === "active",
      },
      {
        onSuccess: () => cancelEdit(discountId),
      }
    )
  }

  const actionError =
    getErrorMessage(createDiscountMutation.error) ||
    getErrorMessage(updateDiscountMutation.error) ||
    getErrorMessage(deleteDiscountMutation.error)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Discounts</CardTitle>
        <CardDescription>
          Manage checkout discounts currently applied to activation pricing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 rounded-lg border border-border/60 p-3">
          <p className="text-sm font-medium">Create discount</p>
          <div className="grid gap-2 sm:grid-cols-4">
            <Select
              value={createRollPreset}
              onValueChange={(value) => setCreateRollPreset(value as RollPresetString)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Roll preset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="8">8 rolls</SelectItem>
                <SelectItem value="12">12 rolls</SelectItem>
                <SelectItem value="24">24 rolls</SelectItem>
                <SelectItem value="36">36 rolls</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={0}
              max={100}
              value={createDiscountPercent}
              onChange={(event) => setCreateDiscountPercent(event.target.value)}
              placeholder="Discount %"
            />
            <Input
              value={createLabel}
              onChange={(event) => setCreateLabel(event.target.value)}
              placeholder="Label (optional)"
            />
            <Select value={createActive} onValueChange={(value) => setCreateActive(value as "active" | "inactive")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleCreate} disabled={isMutating}>
            Create discount
          </Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Select
            value={filterRollPreset}
            onValueChange={(value) =>
              setFilterRollPreset(value as "all" | RollPresetString)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filter by roll preset" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roll presets</SelectItem>
              <SelectItem value="8">8 rolls</SelectItem>
              <SelectItem value="12">12 rolls</SelectItem>
              <SelectItem value="24">24 rolls</SelectItem>
              <SelectItem value="36">36 rolls</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterActive} onValueChange={(value) => setFilterActive(value as "all" | "active" | "inactive")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filter by active status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active only</SelectItem>
              <SelectItem value="inactive">Inactive only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {actionError && <p className="text-sm text-destructive">{actionError}</p>}

        <div className="space-y-2">
          {(discountsQuery.data ?? []).map((discount) => {
            const draft = editingById[discount.id]
            if (draft) {
              return (
                <div key={discount.id} className="space-y-2 rounded-lg border border-border/60 p-3 text-sm">
                  <div className="grid gap-2 sm:grid-cols-4">
                    <Select
                      value={draft.rollPreset}
                      onValueChange={(value) =>
                        updateDraft(discount.id, { rollPreset: value as RollPresetString })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="8">8 rolls</SelectItem>
                        <SelectItem value="12">12 rolls</SelectItem>
                        <SelectItem value="24">24 rolls</SelectItem>
                        <SelectItem value="36">36 rolls</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={draft.discountPercent}
                      onChange={(event) =>
                        updateDraft(discount.id, { discountPercent: event.target.value })
                      }
                    />
                    <Input
                      value={draft.label}
                      onChange={(event) => updateDraft(discount.id, { label: event.target.value })}
                      placeholder="Label (optional)"
                    />
                    <Select
                      value={draft.active}
                      onValueChange={(value) =>
                        updateDraft(discount.id, { active: value as "active" | "inactive" })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleSave(discount.id)} disabled={isMutating}>
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => cancelEdit(discount.id)}
                      disabled={isMutating}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )
            }

            return (
              <div key={discount.id} className="rounded-lg border border-border/60 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    {discount.roll_preset} rolls · {discount.discount_percent}% off
                  </p>
                  <Badge variant={discount.active ? "secondary" : "outline"}>
                    {discount.active ? "active" : "inactive"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  label: {discount.label ?? "none"} · created{" "}
                  {new Date(discount.created_at).toLocaleString()}
                </p>
                <div className="mt-2 flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => beginEdit(discount)}
                    disabled={isMutating}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => deleteDiscountMutation.mutate({ id: discount.id })}
                    disabled={isMutating}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            )
          })}

          {discountsQuery.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">No discounts found for this filter.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
