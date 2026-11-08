import { createFileRoute } from "@tanstack/react-router";
import { ArView } from "@/components/ar/ArView";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AURACITY — Bra in realtà aumentata" },
      {
        name: "description",
        content: "Scopri Bra in realtà aumentata: monumenti, panchine e alberi che parlano, locali, eventi, farmacia di turno e una guida AI sempre con te.",
      },
      { property: "og:title", content: "AURACITY — Bra in realtà aumentata" },
      {
        property: "og:description",
        content: "Scopri Bra in realtà aumentata: monumenti, panchine e alberi che parlano, locali, eventi, farmacia di turno e una guida AI sempre con te.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ArView,
});
