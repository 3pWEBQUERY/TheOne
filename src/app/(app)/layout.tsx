import { AppProviders } from "@/components/app-context";
import { TabBar } from "@/components/tab-bar";
import { requireUser } from "@/lib/auth";
import { vapidPublicKey } from "@/lib/push";
import { getActiveShoppingCount, getOpenTodoCount } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [todoCount, shoppingCount] = await Promise.all([getOpenTodoCount(user.id), getActiveShoppingCount(user.id)]);

  return (
    <AppProviders config={{ vapidPublicKey: vapidPublicKey() }}>
      <TabBar badges={{ "/todos": todoCount, "/shopping": shoppingCount }} />
      <main className="lg:pl-64">{children}</main>
    </AppProviders>
  );
}
