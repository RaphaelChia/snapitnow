"use client";

import { useSession } from "next-auth/react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminSessionsPane } from "./components/admin-sessions-pane";
import { AdminPaymentsPane } from "./components/admin-payments-pane";
import { AdminAuditPane } from "./components/admin-audit-pane";
import { AdminDiscountsPane } from "./components/admin-discounts-pane";

export function AdminDashboard() {
  const { data: session } = useSession();

  if (!session?.user?.isAdmin) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
            <CardDescription>
              You are signed in, but this account does not have admin access.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin Portal</h1>
        <p className="text-sm text-muted-foreground">
          Manage sessions, monitor payments, control discounts, and review audit trails.
        </p>
      </div>

      <Tabs defaultValue="sessions" className="w-full">
        <TabsList className=" justify-start gap-1">
          <TabsTrigger value="sessions" className="px-3">
            Sessions
          </TabsTrigger>
          <TabsTrigger value="payments" className="px-3">
            Payments
          </TabsTrigger>
          <TabsTrigger value="discounts" className="px-3">
            Discounts
          </TabsTrigger>
          <TabsTrigger value="audit" className="px-3">
            Audit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions">
          <AdminSessionsPane />
        </TabsContent>

        <TabsContent value="payments">
          <AdminPaymentsPane />
        </TabsContent>

        <TabsContent value="discounts">
          <AdminDiscountsPane />
        </TabsContent>

        <TabsContent value="audit">
          <AdminAuditPane />
        </TabsContent>
      </Tabs>
    </main>
  );
}
