import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { CardScoreApp } from "@/tools/card-score/CardScoreApp";
import { routeOf } from "@/tools/card-score/routes";

interface CardScoreRouteProps {
  readonly params: Promise<{ path?: string[] }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("CardScore");
  return { title: t("title") };
}

/**
 * Every address of the card score tool. The screens are one client page, so that moving between
 * them works without the network; this only refuses the addresses that are none of them.
 */
export default async function CardScoreRoute({ params }: CardScoreRouteProps) {
  const { path = [] } = await params;
  if (routeOf(path) === null) notFound();
  return (
    <Suspense>
      <CardScoreApp />
    </Suspense>
  );
}
