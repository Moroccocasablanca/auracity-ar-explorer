// Tells whether the natural voice of some text is already prepared (kept on the server), so the app can play it at once
// instead of making a child wait. Same keys as /api/tts.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/tts-ready")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const fs = await import("node:fs");
        const path = await import("node:path");
        const crypto = await import("node:crypto");
        let body: { parts?: string[]; voice?: string; lang?: string };
        try { body = await request.json(); } catch { return Response.json({ ready: false }, { status: 400 }); }
        const parts = (Array.isArray(body.parts) ? body.parts : []).slice(0, 12);
        if (!parts.length) return Response.json({ ready: false });
        const voice = ["female", "male", "young"].includes(body.voice ?? "") ? body.voice : "male";
        const lang = body.lang ?? "it";
        const dir = path.join(process.env["DATA_DIR"] ?? process.cwd(), ".voice-cache");
        const ready = parts.every((p) => {
          const text = String(p).replace(/\s+/g, " ").trim().slice(0, 700);
          return fs.existsSync(path.join(dir, `${crypto.createHash("sha256").update(`v2|${voice}|${lang}|${text}`).digest("hex")}.wav`));
        });
        return Response.json({ ready }, { headers: { "cache-control": "no-store" } });
      },
    },
  },
});
