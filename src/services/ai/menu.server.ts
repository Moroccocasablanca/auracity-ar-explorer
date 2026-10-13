// Server-only: reads a venue's public web page and extracts today's menu + specials with AI.
import { streamResponseText } from "@/services/ai/gateway.server";

export type ExtractedMenu = {
  items: { name: string; price: number }[];
  specials_it: string;
  specials_en: string;
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["items", "specials_it", "specials_en"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "price"],
        properties: { name: { type: "string" }, price: { type: "number" } },
      },
    },
    specials_it: { type: "string" },
    specials_en: { type: "string" },
  },
};

function htmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 30000);
}

export async function extractMenuFromUrl(url: string, today: string): Promise<ExtractedMenu | null> {
  const page = await fetch(url, { headers: { "User-Agent": "AURACITY-menu-bot/1.0" } });
  if (!page.ok) {
    console.error("menu source status", page.status);
    return null;
  }
  const text = htmlToText(await page.text());
  if (text.length < 20) return null;

  const res = await streamResponseText({
    model: "openai/gpt-6-astra",
    reasoning: { effort: "low" },
    instructions:
      "You extract a restaurant or bar menu from web page text. Return only items with a clear price in euros (max 25 items). " +
      `Today is ${today}. In specials_it / specials_en write a one or two sentence summary of today's specials or daily dishes, in Italian and English; empty string if none are stated. Never invent dishes or prices.`,
    input: [{ role: "user", content: `Page text:\n"""${text}"""` }],
    text: { format: { type: "json_schema", name: "menu", strict: true, schema: SCHEMA } },
  });
  if (!res.ok) {
    console.error("menu gateway status", res.status);
    return null;
  }
  try {
    const parsed = JSON.parse(res.text) as ExtractedMenu;
    parsed.items = parsed.items
      .filter((i) => i.name && Number.isFinite(i.price) && i.price > 0 && i.price < 1000)
      .slice(0, 25);
    parsed.specials_it = parsed.specials_it.slice(0, 400);
    parsed.specials_en = parsed.specials_en.slice(0, 400);
    return parsed;
  } catch {
    return null;
  }
}
