import { AppProviders } from "@/components/app-context";
import { TabBar } from "@/components/tab-bar";
import { requireAuth } from "@/lib/auth";
import { vapidPublicKey } from "@/lib/push";
import { getActiveShoppingCount, getOpenTodoCount } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  const [todoCount, shoppingCount] = await Promise.all([getOpenTodoCount(), getActiveShoppingCount()]);

  return (
    <AppProviders config={{ vapidPublicKey: vapidPublicKey() }}>
      <TabBar badges={{ "/todos": todoCount, "/shopping": shoppingCount }} />
      <main className="lg:pl-64">{children}</main>
    </AppProviders>
  );
}
