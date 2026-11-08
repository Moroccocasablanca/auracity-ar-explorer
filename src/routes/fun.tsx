import { lazy, Suspense } from "react";
import { ClientOnly, createFileRoute } from "@tanstack/react-router";

// The face-tracking engine and the model are big: they are loaded only when someone opens the funny camera.
const FunCam = lazy(() => import("@/components/fun/FunCam"));

export const Route = createFileRoute("/fun")({
  head: () => ({
    meta: [
      { title: "Effetti divertenti — AURACITY" },
      { name: "description", content: "La fotocamera di AURACITY con effetti che fanno ridere: occhioni, clown, arcobaleno, fuoco, disco." },
    ],
  }),
  component: FunPage,
});

function FunPage() {
  return (
    <ClientOnly fallback={<div className="fixed inset-0 bg-black" />}>
      <Suspense fallback={<div className="fixed inset-0 bg-black" />}>
        <FunCam />
      </Suspense>
    </ClientOnly>
  );
}
