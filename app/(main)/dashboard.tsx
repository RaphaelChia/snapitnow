"use client";

import { useHostSessions, useDeleteSession } from "@/hooks/use-sessions";
import { Camera, Plus, Trash2, Users, Film, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateSessionDialog } from "./create-session-dialog";
import { useState } from "react";
import Link from "next/link";
import type { Session } from "@/lib/db/types";

const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
  draft: "secondary",
  active: "default",
  expired: "destructive",
};

const statusLabel: Record<string, string> = {
  draft: "Getting ready",
  active: "Live",
  expired: "Ended",
};

function SessionCard({ session }: { session: Session }) {
  const deleteMutation = useDeleteSession();

  return (
    <Link href={`/sessions/${session.id}`} className="block">
      <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
        <CardContent>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate">{session.title}</CardTitle>
              <CardDescription>
                Created {new Date(session.created_at).toLocaleDateString()}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={statusVariant[session.status] ?? "secondary"}>
                {statusLabel[session.status] ?? session.status}
              </Badge>
              <ChevronRight className="size-4 text-muted-foreground" />
            </div>
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Film className="size-3" />
              {session.roll_preset} shots
            </span>
            <span className="flex items-center gap-1">
              <Users className="size-3" />
              {session.filter_mode === "preset"
                ? "Guest picks"
                : "Fixed filter"}
            </span>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button
            variant="destructive"
            size="sm"
            disabled={deleteMutation.isPending || session.status === "active"}
            onClick={(e) => {
              e.preventDefault();
              deleteMutation.mutate(session.id);
            }}
          >
            <Trash2 className="size-3" />
            Delete
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-4 py-20 text-center">
      <div className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-romance-secondary to-accent shadow-romance">
        <Camera className="size-10 text-primary" />
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-xl font-semibold">No wedding memories yet</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Start your first wedding memory and invite guests to capture moments together.
        </p>
      </div>
      <Button size="lg" className="mt-2 gap-2" onClick={onCreateClick}>
        <Plus className="size-4" />
        Start a wedding memory
      </Button>
    </div>
  );
}

export function Dashboard() {
  const { data: sessions, isLoading, error } = useHostSessions();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Your Wedding Memories</h1>
        {sessions && sessions.length > 0 && (
          <Button
            size="default"
            className="gap-2"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="size-4" />
            New memory
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">
          Failed to load sessions. Please try again.
        </p>
      )}

      {sessions && sessions.length === 0 && (
        <EmptyState onCreateClick={() => setDialogOpen(true)} />
      )}

      {sessions && sessions.length > 0 && (
        <div className="flex flex-col gap-3">
          {sessions.map((s) => (
            <SessionCard key={s.id} session={s} />
          ))}
        </div>
      )}

      <CreateSessionDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </main>
  );
}
