// Server-only: streamed call to Lovable AI Gateway (Responses API) returning the final text.
export async function streamResponseText(body: Record<string, unknown>): Promise<{ ok: true; text: string } | { ok: false; status: number }> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return { ok: false, status: 401 };
  const response = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({ ...body, stream: true, store: false }),
  });
  if (!response.ok || !response.body) return { ok: false, status: response.status };
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const evt = JSON.parse(payload) as { type?: string; delta?: string };
        if (evt.type === "response.output_text.delta" && evt.delta) out += evt.delta;
      } catch {
        /* partial frame */
      }
    }
  }
  return { ok: true, text: out };
}
