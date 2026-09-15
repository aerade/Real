import { spawn } from "node:child_process";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PublicBusiness } from "./osm-leads";

type ParserInput = {
  country: string;
  city: string;
  industry: string;
};

type TwoGisContact = {
  type?: string;
  value?: string;
  text?: string;
  url?: string;
};

type TwoGisItem = {
  id?: string;
  name?: string;
  category?: string;
  address?: string;
  city?: string;
  website?: string | null;
  has_website?: boolean;
  phones?: string[];
  email?: string;
  rating?: number | string | null;
  reviews_count?: number | string;
  address_name?: string;
  city_alias?: string;
  adm_div?: Array<{ type?: string; name?: string; city_alias?: string }>;
  contact_groups?: Array<{ contacts?: TwoGisContact[] }>;
  rubrics?: Array<{ name?: string; kind?: string } | string>;
  reviews?: {
    general_rating?: number;
    general_review_count?: number;
    org_rating?: number;
    org_review_count?: number;
  };
};

const parserCache = new Map<string, { expiresAt: number; results: PublicBusiness[] }>();
const activeParses = new Map<string, Promise<PublicBusiness[]>>();
const PARSER_TIMEOUT_MS = 180_000;

const cityAliases: Record<string, string> = {
  москва: "moscow",
  "санкт-петербург": "spb",
  спб: "spb",
  питер: "spb",
  казань: "kazan",
  красноярск: "krasnoyarsk",
  новосибирск: "novosibirsk",
  екатеринбург: "yekaterinburg",
  самара: "samara",
  "нижний новгород": "nizhny_novgorod",
  ростов: "rostovnadonu",
  "ростов-на-дону": "rostovnadonu",
  омск: "omsk",
  уфа: "ufa",
  челябинск: "chelyabinsk",
  пермь: "perm",
  волгоград: "volgograd",
  воронеж: "voronezh",
  тулa: "tula",
  тюмень: "tyumen",
  иркутск: "irkutsk",
};

function isRussia(country: string): boolean {
  const value = country.trim().toLowerCase();
  return value === "ru" || value.includes("рос") || value.includes("russia");
}

function cityToAlias(city: string): string {
  const normalized = city.trim().toLowerCase().replaceAll("ё", "е");
  return cityAliases[normalized] ?? transliterate(normalized).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function transliterate(value: string): string {
  const alphabet: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "zh", з: "z",
    и: "i", й: "j", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p",
    р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch",
    ш: "sh", щ: "shh", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };
  return [...value].map((char) => alphabet[char] ?? char).join("");
}

function findProjectRoot(): string {
  let current = process.cwd();
  while (current !== path.dirname(current)) {
    try {
      // eslint-disable-next-line no-sync
      require("node:fs").accessSync(path.join(current, "pyproject.toml"));
      return current;
    } catch {
      current = path.dirname(current);
    }
  }
  return process.cwd();
}

function searchUrl(input: ParserInput): string {
  const alias = cityToAlias(input.city);
  if (!alias) throw new Error("Не удалось определить город 2ГИС");
  return `https://2gis.ru/${alias}/search/${encodeURIComponent(input.industry.trim())}`;
}

function normalizedContactUrl(contact: TwoGisContact): string {
  if (contact.url?.trim()) return contact.url.trim();
  const value = contact.value?.trim() ?? "";
  if (/^https?:\/\//i.test(value)) return value;
  if (contact.type === "email" && value) return `mailto:${value}`;
  if (contact.type === "phone" && value) return `tel:${value.replace(/[^\d+]/g, "")}`;
  return value;
}

function extractContacts(item: TwoGisItem): {
  contacts: PublicBusiness["contacts"];
  website: string | null;
} {
  const contacts: PublicBusiness["contacts"] = [];
  let website: string | null = null;
  const seen = new Set<string>();

  for (const group of item.contact_groups ?? []) {
    for (const contact of group.contacts ?? []) {
      const type = contact.type?.toLowerCase() ?? "";
      const value = (contact.text || contact.value || contact.url || "").trim();
      if (!value) continue;
      const url = normalizedContactUrl(contact);
      const key = `${type}:${value}`;
      if (seen.has(key)) continue;
      seen.add(key);

      if (type === "website") {
        website = url || value;
        contacts.push({ type: "Сайт", value, url: website });
      } else if (type === "phone") {
        contacts.push({ type: "Телефон", value, url });
      } else if (type === "email") {
        contacts.push({ type: "Email", value, url });
      } else {
        contacts.push({ type: contact.type || "Контакт", value, url });
      }
    }
  }

  for (const phone of item.phones ?? []) {
    const value = phone.trim();
    if (value && !seen.has(`phone:${value}`)) {
      seen.add(`phone:${value}`);
      contacts.push({ type: "Телефон", value, url: `tel:${value.replace(/[^\d+]/g, "")}` });
    }
  }
  if (item.email?.trim() && !seen.has(`email:${item.email.trim()}`)) {
    const value = item.email.trim();
    contacts.push({ type: "Email", value, url: `mailto:${value}` });
  }
  if (item.website?.trim()) {
    website = item.website.trim();
  }

  return { contacts, website };
}

function mapItem(item: TwoGisItem, input: ParserInput): PublicBusiness | null {
  if (!item.id || !item.name?.trim()) return null;
  const { contacts, website } = extractContacts(item);
  const rubric = item.rubrics?.find((entry) => typeof entry !== "string" && entry.kind === "primary")
    ?? item.rubrics?.[0];
  const industry = typeof rubric === "string" ? rubric : rubric?.name ?? item.category ?? input.industry;
  const city = item.adm_div?.find((entry) => entry.type === "city")?.name
    ?? item.city
    ?? item.city_alias
    ?? input.city;
  const reviewsCount = Number(
    item.reviews?.general_review_count ??
    item.reviews?.org_review_count ??
    item.reviews_count ??
    0,
  ) || 0;
  const rawRating = item.reviews?.general_rating ?? item.reviews?.org_rating ?? item.rating;
  const rating = rawRating === null || rawRating === undefined || rawRating === ""
    ? null
    : Number(rawRating) || null;
  const score = Math.min(
    98,
    58 + (website ? 8 : 24) + Math.min(contacts.length * 5, 14) + (rating ? Math.round(rating * 2) : 0),
  );

  return {
    sourceId: `2gis:${item.id}`,
    name: item.name.trim(),
    city,
    industry,
    website,
    contacts,
    issues: website ? ["Требуется проверка скорости и мобильной версии"] : ["Сайт не найден"],
    score,
    scoreReasons: [
      website ? "Есть сайт для технического аудита" : "Нет собственного сайта",
      contacts.length > 0 ? "Опубликованы прямые контакты" : "Есть публичная карточка компании",
      rating ? `Рейтинг 2ГИС ${rating}` : "Есть карточка в 2ГИС",
    ],
    reviewsCount,
    rating,
    source: "2ГИС",
  };
}

async function runParser(url: string, outputPath: string): Promise<void> {
  const binaryPath = process.env.REAL_CHROME_BINARY ?? "/repl/tools/bin/chromium";
  const parserCommand = process.env.REAL_PARSER_COMMAND?.trim() || "uv";
  const commandArgs = parserCommand === "uv" ? ["run", "parser-2gis"] : [];
  const args = [
    ...commandArgs,
    "-i", url,
    "-o", outputPath,
    "-f", "json",
    "--parser.max-records", "5",
    "--chrome.headless", "yes",
    "--chrome.silent-browser", "yes",
    "--chrome.binary_path", binaryPath,
  ];
  const cwd = findProjectRoot();

  await new Promise<void>((resolve, reject) => {
    const child = spawn(parserCommand, args, {
      cwd,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("2ГИС-поиск превысил лимит ожидания 3 минуты"));
    }, PARSER_TIMEOUT_MS);

    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
      if (stderr.length > 8_000) stderr = stderr.slice(-8_000);
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(new Error(`Не удалось запустить 2ГИС-парсер: ${error.message}`));
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`2ГИС-парсер завершился с кодом ${code ?? "unknown"}${stderr ? `: ${stderr.trim()}` : ""}`));
      }
    });
  });
}

export async function searchTwoGisBusinesses(input: ParserInput): Promise<PublicBusiness[]> {
  if (!isRussia(input.country) || !input.city.trim() || !input.industry.trim()) return [];
  const key = [input.city, input.industry].map((value) => value.trim().toLowerCase()).join("|");
  const cached = parserCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.results;

  const active = activeParses.get(key);
  if (active) return active;

  const request = (async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "real-2gis-"));
    const outputPath = path.join(tempDir, "result.json");
    try {
      await runParser(searchUrl(input), outputPath);
      await access(outputPath);
      const raw = await readFile(outputPath, "utf8");
      const parsed = JSON.parse(raw.replace(/^\uFEFF/, "").trim()) as
        | TwoGisItem[]
        | { items?: TwoGisItem[]; results?: TwoGisItem[] };
      const items = Array.isArray(parsed) ? parsed : parsed.items ?? parsed.results ?? [];
      const results = items
        .map((item) => mapItem(item, input))
        .filter((item): item is PublicBusiness => Boolean(item));
      parserCache.set(key, { expiresAt: Date.now() + 30 * 60 * 1_000, results });
      return results;
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  })();

  activeParses.set(key, request);
  try {
    return await request;
  } finally {
    activeParses.delete(key);
  }
}