import { redirect } from "next/navigation";
import { getPrincipal } from "@/server/auth/session";
import { Workbench } from "@/components/workbench";

export default async function HomePage() {
  const principal = await getPrincipal();
  if (!principal) redirect("/sign-in");
  return <Workbench />;
}
