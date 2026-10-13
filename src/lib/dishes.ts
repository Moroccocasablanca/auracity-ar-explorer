// Standard 3D illustrations for menu items, so every venue looks good from day one.
// The owner can replace any of them with their own photo (see AdminTools).
const RULES: [RegExp, string][] = [
  [/cappuccin|latte|macchiat|moka|cioccolat/i, "cappuccino"],
  [/caff[eè]|espresso|ristretto|decaf|orzo|ginseng/i, "coffee"],
  [/brioche|cornett|croissant|cornetto|sfogliat|krapfen|ciambell|merend/i, "croissant"],
  [/pizza|focaccia|calzone|margherita|diavola|napoli/i, "pizza"],
  [/panin|toast|tramezz|piadin|kebab|farcit|sandwich|wrap/i, "panino"],
  [/burger|hamburger|cheeseburger/i, "burger"],
  [/insalat|verdur|caprese|bowl|poke|ortagg|contorn/i, "salad"],
  [/gelat|coppa|cono|sorbett|granita|ghiacci|stracciatella/i, "gelato"],
  [/tiramis|panna cotta|dolce|torta|tort|budino|cheesecake|bonet|semifredd|dessert|crostata|macaron|pasticc/i, "dessert"],
  [/vino|barolo|barbera|dolcetto|nebbiolo|arneis|prosecco|spumante|calice|bollicin|spritz|aperol|cocktail|negroni|campari/i, "wine"],
  [/birra|beer|bionda|ipa|lager|stout|weiss|pinta|boccale/i, "beer"],
  [/past|tagliatell|tajarin|agnolott|ravioli|gnocch|risott|spaghett|lasagn|penne|rigaton|fettuccin|carbonar|ragù|ragu|minestr|zupp|polenta/i, "pasta"],
];

/** The picture for a dish: the owner's own photo if there is one, otherwise our standard 3D illustration. */
export function dishImage(item: { name: string; img?: string | undefined }): string {
  if (item.img) return item.img;
  for (const [re, file] of RULES) if (re.test(item.name)) return `/dishes/${file}.png`;
  return "/dishes/pasta.png"; // neutral main-course illustration
}
