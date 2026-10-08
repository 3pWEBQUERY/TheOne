import type { Metadata } from "next";
import { ShoppingBoard } from "@/components/shopping/shopping-board";
import { getShopping } from "@/lib/queries";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Einkauf" };

export default async function ShoppingPage(props: PageProps<"/shopping">) {
  const sp = await props.searchParams;
  const user = await requireUser();
  const { active, suggestions } = await getShopping(user.id);
  return (
    <ShoppingBoard
      items={active}
      suggestions={suggestions}
      initialOpenId={typeof sp.open === "string" ? sp.open : undefined}
    />
  );
}
