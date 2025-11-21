export const dynamic = "force-dynamic";
export const dynamicParams = true;

import { notFound } from "next/navigation";

export default function AdminCatchAllPage() {
  // Any unknown path under the admin group will
  // use the admin layout and render the local not-found page
  // in the main content area.
  notFound();
}
