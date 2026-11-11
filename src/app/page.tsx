import { StoreView } from "@/components/store-view";
import { getPublicStore, NORMA } from "@/lib/store";

export default async function Home() {
  const store = await getPublicStore(NORMA);
  return <StoreView store={store} />;
}
