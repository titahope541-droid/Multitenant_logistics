/**
 * Seed demo packages for a tenant (development tooling).
 *
 * Creates packages THROUGH THE SERVICE LAYER so every record is real:
 * server-minted tracking IDs, initial PENDING status events, and
 * location-history rows — exactly what the UI produces. Never insert
 * package documents by hand.
 *
 * Usage:
 *   MONGODB_URI=mongodb://... \
 *   DEMO_TENANT_SLUG=swift \
 *   DEMO_PACKAGE_COUNT=8 \
 *   npx tsx scripts/seed-demo-packages.ts
 *
 * Requires: the tenant exists (seed-demo-tenant.ts or the /admin wizard)
 * and has its single tenant admin. Adds new packages each run.
 *
 * Quiets service logging by default (LOG_LEVEL=error) so the summary
 * below is the output you read; pass LOG_LEVEL=info to see everything.
 */

import "dotenv/config";

process.env.LOG_LEVEL ??= "error";

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("refusing to run with NODE_ENV=production");
  }
  const uri = process.env.MONGODB_URI;
  const slug = process.env.DEMO_TENANT_SLUG ?? "swift";
  const count = Number(process.env.DEMO_PACKAGE_COUNT ?? 5);

  if (!uri) throw new Error("MONGODB_URI is not set (check your .env)");
  if (!Number.isInteger(count) || count < 1 || count > 50) {
    throw new Error("DEMO_PACKAGE_COUNT must be an integer between 1 and 50");
  }

  // Imported AFTER LOG_LEVEL is set so the logger honours it.
  const mongoose = await import("mongoose");
  const { TenantModel } = await import("../src/db/models/tenant.model");
  const { UserModel } = await import("../src/db/models/user.model");
  const packageService = await import("../src/server/services/package.service");
  const { PACKAGE_STATUSES } = await import("../src/types/domain");

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  try {
    const tenant = await TenantModel.findOne({ slug }).lean();
    if (!tenant) throw new Error(`tenant "${slug}" not found — run seed-demo-tenant.ts first`);
    if (tenant.status !== "ACTIVE") throw new Error(`tenant "${slug}" is ${tenant.status} — restore it first`);

    const admin = await UserModel.findOne({ tenantId: tenant._id, role: "TENANT_ADMIN" }).lean();
    if (!admin) throw new Error(`tenant "${slug}" has no tenant admin`);

    const auth = {
      user: {
        id: String(admin._id),
        name: admin.name,
        email: admin.email,
        role: "TENANT_ADMIN" as const,
        tenantId: String(tenant._id),
      },
      sessionId: "seed-script",
    };

    /** Varied-but-deterministic demo content. */
    const routes = [
      ["Lagos", "Abuja"],
      ["Douala", "Yaoundé"],
      ["Nairobi", "Kisumu"],
      ["Accra", "Kumasi"],
      ["Dakar", "Thiès"],
    ] as const;
    const sizes = ["small parcel", "medium carton", "large crate", "pallet"];
    const methods = ["Cash on Delivery", "Bank Transfer", "Mobile Money", "Card"];

    console.log(`seed-demo-packages: creating ${count} package(s) for "${tenant.companyName}"…`);

    for (let index = 0; index < count; index += 1) {
      const [origin, destination] = routes[index % routes.length]!;
      const created = await packageService.createPackage(auth, {
        packageName: `Demo shipment ${index + 1} — ${origin} to ${destination}`,
        description: "Seeded demo package for testing lists, tracking, and realtime.",
        sender: {
          name: `Sender ${index + 1}`,
          phone: `08000000${String(index + 10)}`,
          email: `sender${index + 1}@example.com`,
          address: `${origin} origin depot`,
        },
        receiver: {
          name: `Receiver ${index + 1}`,
          phone: `08010000${String(index + 10)}`,
          email: `receiver${index + 1}@example.com`,
          address: `${destination} delivery address`,
        },
        specifications: {
          size: sizes[index % sizes.length]!,
          weight: Number((0.5 + index * 1.25).toFixed(2)),
        },
        payment: {
          paymentMethod: methods[index % methods.length]!,
          paymentStatus: index % 2 === 0 ? ("UNPAID" as const) : ("PAID" as const),
          shippingCost: 1500 + index * 250,
        },
        delivery: { estimatedDeliveryDate: new Date(Date.now() + (index + 2) * 86_400_000) },
        currentLocation: {
          latitude: 5.5 + index * 0.1,
          longitude: 8.5 + index * 0.1,
          locationName: `${origin} hub`,
        },
      });

      // Advance through the five statuses at varying depths so lists,
      // filters, timelines, and the public tracking page all have range.
      const steps = PACKAGE_STATUSES.slice(1, 1 + (index % 5));
      for (const status of steps) {
        await packageService.changeStatus(auth, created.package.id, {
          status,
          note: `seeded transition to ${status}`,
        });
      }
      if (index % 2 === 1) {
        await packageService.updateLocation(auth, created.package.id, {
          latitude: 6 + index * 0.05,
          longitude: 9 + index * 0.05,
          locationName: `${destination} transit point`,
        });
      }

      const final = await packageService.getPackageDetails(auth, created.package.id);
      console.log(
        `  · ${created.trackingId}  →  ${final.status}  (${final.statusHistory.length} status events, ${final.locationHistory.length} locations)`,
      );
    }

    console.log("seed-demo-packages: done.");
  } finally {
    await mongoose.disconnect();
  }
}

void main().catch((error) => {
  console.error(`seed-demo-packages: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
