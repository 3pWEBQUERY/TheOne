import type { Metadata } from "next";
import { ShoppingBoard } from "@/components/shopping/shopping-board";
import { getShopping } from "@/lib/queries";

export const metadata: Metadata = { title: "Einkauf" };

export default async function ShoppingPage(props: PageProps<"/shopping">) {
  const sp = await props.searchParams;
  const { active, suggestions } = await getShopping();
  return (
    <ShoppingBoard
      items={active}
      suggestions={suggestions}
      initialOpenId={typeof sp.open === "string" ? sp.open : undefined}
    />
  );
}
