"use client"

import { useState } from "react"
import { useCreateSession } from "@/hooks/use-sessions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { FilterMode } from "@/lib/db/types"

const ROLL_PRESETS = [8, 12, 24, 36] as const

export function CreateSessionDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const createMutation = useCreateSession()

  const [title, setTitle] = useState("")
  const [rollPreset, setRollPreset] = useState<number>(12)
  const [filterMode, setFilterMode] = useState<FilterMode>("fixed")
  const [password, setPassword] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    createMutation.mutate(
      {
        title: title.trim(),
        roll_preset: rollPreset,
        filter_mode: filterMode,
        password: password || null,
      },
      {
        onSuccess: () => {
          setTitle("")
          setRollPreset(12)
          setFilterMode("fixed")
          setPassword("")
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create session</DialogTitle>
          <DialogDescription>
            Configure your photo session. You can activate it after payment.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Session title</Label>
            <Input
              id="title"
              placeholder="e.g. Sarah's Wedding"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={100}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Shots per guest</Label>
            <div className="grid grid-cols-4 gap-2">
              {ROLL_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setRollPreset(preset)}
                  className={`flex h-10 items-center justify-center rounded-md border text-sm font-medium transition-colors ${
                    rollPreset === preset
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Filter mode</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["fixed", "preset"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFilterMode(mode)}
                  className={`flex h-10 items-center justify-center rounded-md border text-sm font-medium transition-colors ${
                    filterMode === mode
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted"
                  }`}
                >
                  {mode === "fixed" ? "Fixed filter" : "Guest picks"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">
              Session password{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="password"
              type="text"
              placeholder="Leave blank for open access"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={64}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create session"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
