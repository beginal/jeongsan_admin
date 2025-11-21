import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminLayoutClient } from "@/components/admin-v2/AdminLayoutClient";

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payloadBase64.padEnd(
      payloadBase64.length + ((4 - (payloadBase64.length % 4)) % 4),
      "="
    );
    const decoded = Buffer.from(padded, "base64").toString("binary");
    const json = decodeURIComponent(
      decoded
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(json);
    if (typeof payload.exp !== "number") return false;
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  } catch {
    return false;
  }
}

export default async function AdminV2Layout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get("admin_v2_token")?.value;
  const riderToken = cookieStore.get("rider_v2_token")?.value;

  if (!adminToken) {
    if (riderToken) {
      redirect("/rider");
    }
    redirect("/login?redirect=/");
  }

  if (isTokenExpired(adminToken)) {
    redirect("/login?session=expired&redirect=/");
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
