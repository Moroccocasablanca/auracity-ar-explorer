import { createFileRoute } from "@tanstack/react-router";
import { ArView } from "@/components/ArView";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AURACITY — AR view of Bra" },
      {
        name: "description",
        content: "Point your phone at Bra and see streets, monuments and shops as interactive augmented-reality nodes.",
      },
      { property: "og:title", content: "AURACITY — AR view of Bra" },
      {
        property: "og:description",
        content: "Point your phone at Bra and see streets, monuments and shops as interactive augmented-reality nodes.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ArView,
});
