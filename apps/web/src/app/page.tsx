import { MenuPage } from "@/features/menu/MenuPage";
import { readTheme } from "@/features/settings/read-theme";

export default async function Home() {
  return <MenuPage theme={await readTheme()} />;
}
