"use client";

/**
 * TenantActions — compact three-dot menu for a tenant row.
 * Links cover the authorized platform views; lifecycle actions
 * (suspend / archive / restore) open an explicit confirmation dialog.
 * After a lifecycle change the route refreshes so server data stays truth.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ApiClientError } from "@/services/api-client";
import * as tenants from "@/services/tenants";
import type { TenantStatus } from "@/types/domain";

type LifecycleAction = "suspend" | "archive" | "restore";

const DIALOG_COPY: Record<LifecycleAction, { title: string; description: string; confirm: string }> = {
  suspend: {
    title: "Suspend this tenant?",
    description:
      "The tenant's public website and tracking go dark, and its admin is signed out and blocked from logging in. All data is retained.",
    confirm: "Suspend tenant",
  },
  archive: {
    title: "Archive this tenant?",
    description:
      "The tenant is hidden from normal lists and its public website, tracking, and admin access are disabled. All data is retained and it can be restored.",
    confirm: "Archive tenant",
  },
  restore: {
    title: "Restore this tenant?",
    description:
      "The tenant returns to active: its website, tracking, and admin login come back. Nothing is recreated — status is the only change.",
    confirm: "Restore tenant",
  },
};

export function TenantActions({
  tenantId,
  tenantName,
  status,
}: {
  tenantId: string;
  tenantName: string;
  status: TenantStatus;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<LifecycleAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const items: ActionMenuItem[] = [
    { label: "Manage", href: `/admin/tenants/${tenantId}` },
    { label: "Open dashboard", href: `/admin/tenants/${tenantId}?tab=packages` },
    { label: "Preview website", href: `/admin/tenants/${tenantId}/preview` },
  ];
  if (status === "ACTIVE") {
    items.push({ label: "Suspend", danger: true, onSelect: () => setDialog("suspend") });
    items.push({ label: "Archive", danger: true, onSelect: () => setDialog("archive") });
  } else {
    items.push({ label: "Restore", onSelect: () => setDialog("restore") });
  }

  async function run(action: LifecycleAction) {
    setBusy(true);
    setError(null);
    try {
      if (action === "suspend") await tenants.suspendTenant(tenantId);
      else if (action === "archive") await tenants.archiveTenant(tenantId);
      else await tenants.restoreTenant(tenantId);
      setDialog(null);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : "The action failed.");
    } finally {
      setBusy(false);
    }
  }

  const copy = dialog ? DIALOG_COPY[dialog] : null;

  return (
    <>
      <ActionMenu items={items} ariaLabel={`Actions for ${tenantName}`} />
      {copy ? (
        <ConfirmDialog
          open
          title={copy.title}
          description={copy.description}
          confirmLabel={copy.confirm}
          tone={dialog === "restore" ? "primary" : "danger"}
          busy={busy}
          error={error}
          onConfirm={() => dialog && void run(dialog)}
          onCancel={() => {
            setDialog(null);
            setError(null);
          }}
        />
      ) : null}
    </>
  );
}
