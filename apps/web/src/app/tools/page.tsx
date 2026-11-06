import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ToolboxPage } from "@/features/toolbox/ToolboxPage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Toolbox");
  return { title: t("title") };
}

export default function ToolboxRoute() {
  return <ToolboxPage />;
}
