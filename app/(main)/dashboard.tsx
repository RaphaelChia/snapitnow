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

function SessionCard({ session }: { session: Session }) {
  const deleteMutation = useDeleteSession();

  return (
    <Link href={`/sessions/${session.id}`} className="block">
      <Card className="transition-shadow hover:shadow-md">
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
                {session.status}
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
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
        <Camera className="size-8 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">No sessions yet</h2>
        <p className="text-sm text-muted-foreground">
          Create your first photo session to get started.
        </p>
      </div>
      <Button size="lg" className="mt-2 h-11 gap-2" onClick={onCreateClick}>
        <Plus className="size-4" />
        Create session
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
        <h1 className="text-lg font-semibold tracking-tight">Sessions</h1>
        {sessions && sessions.length > 0 && (
          <Button
            size="default"
            className="gap-1.5"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="size-3.5" />
            New
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
