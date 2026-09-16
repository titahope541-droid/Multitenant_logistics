import type { Metadata } from "next";
import { ChangePasswordForm } from "@/components/account/change-password-form";
import { Card, PageHeader, SectionCard } from "@/components/ui";
import { requirePageRole } from "@/server/middleware/page-auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Account" };

export default async function AdminAccountPage() {
  const auth = await requirePageRole("PLATFORM_ADMIN");

  const rows = [
    { label: "Name", value: auth.user.name },
    { label: "Email", value: auth.user.email },
    { label: "Role", value: "Platform admin" },
  ];

  return (
    <>
      <PageHeader
        title="Account"
        description="Your platform administrator profile and sign-in security."
      />

      <div className="grid max-w-4xl gap-5 lg:grid-cols-2">
        <Card>
          <div className="border-b border-hair px-5 py-4 sm:px-6">
            <h2 className="text-[15px] font-semibold text-slate">Profile</h2>
          </div>
          <dl className="divide-y divide-hair">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-4 px-5 py-3.5 sm:px-6"
              >
                <dt className="text-[13px] text-muted">{row.label}</dt>
                <dd className="truncate text-[13.5px] font-medium text-slate">{row.value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <SectionCard
          title="Change password"
          description="Updating your password signs out every other session."
        >
          <ChangePasswordForm />
        </SectionCard>
      </div>
    </>
  );
}
