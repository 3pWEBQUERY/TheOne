export type Category = { id: string; label: string; keywords: string[] };

export const CATEGORIES: Category[] = [
  { id: "obst", label: "Obst & Gemüse", keywords: ["apfel", "äpfel", "banane", "birne", "orange", "zitrone", "limette", "traube", "erdbeer", "himbeer", "heidelbeer", "beere", "kiwi", "mango", "ananas", "melone", "pfirsich", "avocado", "tomate", "gurke", "salat", "paprika", "zwiebel", "knoblauch", "kartoffel", "karotte", "möhre", "brokkoli", "blumenkohl", "zucchini", "aubergine", "spinat", "pilz", "champignon", "lauch", "porree", "kohl", "ingwer", "petersilie", "basilikum", "kräuter", "rucola", "radieschen", "sellerie", "kürbis", "mais", "obst", "gemüse", "frühlingszwiebel", "süßkartoffel"] },
  { id: "backwaren", label: "Brot & Backwaren", keywords: ["brot", "brötchen", "semmel", "baguette", "toast", "croissant", "brezel", "laugen", "kuchen", "knäcke", "wrap", "tortilla", "bagel", "zwieback"] },
  { id: "milch", label: "Milch & Käse", keywords: ["milch", "käse", "joghurt", "quark", "butter", "sahne", "schmand", "frischkäse", "mozzarella", "parmesan", "gouda", "feta", "eier", "skyr", "kefir", "margarine", "creme fraiche", "crème", "hafermilch", "mandelmilch", "pudding"] },
  { id: "fleisch", label: "Fleisch & Fisch", keywords: ["fleisch", "hähnchen", "huhn", "pute", "rind", "schwein", "hack", "wurst", "salami", "schinken", "speck", "bacon", "steak", "schnitzel", "lachs", "thunfisch", "fisch", "garnele", "shrimps", "würstchen", "aufschnitt", "lyoner", "filet", "tofu"] },
  { id: "vorrat", label: "Vorrat & Konserven", keywords: ["nudel", "pasta", "spaghetti", "reis", "mehl", "zucker", "salz", "pfeffer", "öl", "olivenöl", "essig", "gewürz", "dose", "konserve", "tomatenmark", "passata", "linsen", "bohnen", "kichererbsen", "haferflocken", "müsli", "cornflakes", "honig", "marmelade", "nutella", "ketchup", "senf", "mayo", "brühe", "soße", "sauce", "hefe", "backpulver", "couscous", "quinoa", "erdnussbutter", "sojasoße"] },
  { id: "tiefkuehl", label: "Tiefkühl", keywords: ["tk", "tiefkühl", "pizza", "eis", "pommes", "fischstäbchen", "gefroren", "eiswürfel"] },
  { id: "snacks", label: "Snacks & Süßes", keywords: ["schokolade", "schoko", "chips", "keks", "kekse", "gummibär", "bonbon", "nüsse", "erdnüsse", "popcorn", "riegel", "süßigkeit", "cracker", "salzstangen", "kaugummi"] },
  { id: "getraenke", label: "Getränke", keywords: ["wasser", "sprudel", "saft", "cola", "limo", "bier", "wein", "sekt", "kaffee", "tee", "espresso", "kakao", "energy", "eistee", "smoothie", "schorle", "milchshake", "whisky", "vodka", "gin"] },
  { id: "drogerie", label: "Drogerie & Hygiene", keywords: ["shampoo", "duschgel", "seife", "zahnpasta", "zahnbürste", "deo", "creme", "lotion", "rasier", "toilettenpapier", "klopapier", "taschentuch", "tampon", "binde", "watte", "pflaster", "windel", "sonnencreme", "make-up", "parfum", "zahnseide", "medikament", "tabletten", "vitamin"] },
  { id: "haushalt", label: "Haushalt", keywords: ["spülmittel", "waschmittel", "weichspüler", "müllbeutel", "müllsack", "schwamm", "küchenrolle", "putzmittel", "reiniger", "alufolie", "frischhaltefolie", "backpapier", "batterie", "glühbirne", "kerze", "spülmaschinentabs", "tabs", "entkalker", "lappen"] },
  { id: "tier", label: "Tierbedarf", keywords: ["katzenfutter", "hundefutter", "katzenstreu", "leckerli", "tierfutter"] },
  { id: "sonstiges", label: "Sonstiges", keywords: [] },
];

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

export function detectCategory(name: string): string {
  const n = name.toLowerCase();
  let best: { id: string; len: number } | null = null;
  for (const c of CATEGORIES) {
    for (const k of c.keywords) {
      if (n.includes(k) && (!best || k.length > best.len)) best = { id: c.id, len: k.length };
    }
  }
  return best?.id ?? "sonstiges";
}

const QTY_PREFIX = /^(\d+(?:[.,]\d+)?)\s*(x|×|stk\.?|stück|kg|g|l|ml|pck\.?|packung(?:en)?|dosen?|flaschen?|bund)?\s+(.+)$/i;
const QTY_SUFFIX = /^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(x|×|stk\.?|stück|kg|g|l|ml|pck\.?|packung(?:en)?|dosen?|flaschen?|bund)?$/i;

/** "2x Milch" | "Milch 2l" | "500 g Hack" → { name, quantity } */
export function parseItemInput(raw: string): { name: string; quantity: string } {
  const s = raw.trim().replace(/\s+/g, " ");
  let m = s.match(QTY_PREFIX);
  if (m) return { name: capitalize(m[3]), quantity: formatQty(m[1], m[2]) };
  m = s.match(QTY_SUFFIX);
  if (m) return { name: capitalize(m[1]), quantity: formatQty(m[2], m[3]) };
  return { name: capitalize(s), quantity: "" };
}

function formatQty(n: string, unit?: string) {
  if (!unit || unit === "x" || unit === "×") return `${n}×`;
  return `${n} ${unit}`;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
