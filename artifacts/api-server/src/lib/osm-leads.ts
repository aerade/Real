type OsmTags = Record<string, string | undefined>;

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: OsmTags;
};

type NominatimBusiness = {
  osm_type: string;
  osm_id: number;
  display_name: string;
  type: string;
  category: string;
  namedetails?: Record<string, string | undefined>;
  extratags?: OsmTags;
};

export type PublicBusiness = {
  sourceId: string;
  name: string;
  city?: string;
  industry: string;
  website: string | null;
  contacts: Array<{ type: string; value: string; url: string }>;
  issues: string[];
  score: number;
  scoreReasons: string[];
};

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
const USER_AGENT = "RealLeadScout/1.0 (public-business-search)";

const categoryAliases: Record<string, string[]> = {
  стоматология: ["dentist"],
  зубы: ["dentist"],
  клиника: ["clinic", "doctors"],
  медицина: ["clinic", "doctors", "dentist", "pharmacy"],
  ресторан: ["restaurant", "cafe", "fast_food"],
  кафе: ["cafe"],
  юрист: ["lawyer"],
  адвокат: ["lawyer"],
  недвижимость: ["estate_agent"],
  строительство: ["construction", "builder"],
  мебель: ["furniture", "carpenter"],
  ритейл: ["supermarket", "convenience", "clothes"],
  производство: ["industrial", "factory", "manufacturer"],
  it: ["it", "telecommunication", "computer"],
  сто: ["car_repair", "tyres", "car_parts"],
  автосервис: ["car_repair"],
  автомобиль: ["car_repair", "car_parts", "car_dealer"],
  шиномонтаж: ["tyres", "car_repair"],
  красота: ["beauty", "hairdresser"],
  салон: ["beauty", "hairdresser"],
  фитнес: ["fitness_centre", "sports_centre"],
  отель: ["hotel", "guest_house"],
  гостиница: ["hotel", "guest_house"],
  бухгалтер: ["accountant"],
  маркетинг: ["advertising_agency"],
  ремонт: ["craft", "electronics_repair"],
};
const searchCache = new Map<string, { expiresAt: number; results: PublicBusiness[] }>();

function escapeOverpass(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function websiteFrom(tags: OsmTags): string | null {
  const raw = tags.website ?? tags["contact:website"] ?? tags.url;
  if (!raw) return null;
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(candidate).toString();
  } catch {
    return null;
  }
}

function contact(type: string, value: string | undefined, prefix: string) {
  if (!value) return null;
  const first = value.split(";")[0]!.trim();
  return { type, value: first, url: `${prefix}${first.replace(/\s/g, "")}` };
}

function contactsFrom(tags: OsmTags) {
  const telegram = tags["contact:telegram"]?.replace(/^@/, "");
  const vk = tags["contact:vk"] ?? tags["contact:vk.com"];
  return [
    contact("Телефон", tags["contact:phone"] ?? tags.phone, "tel:"),
    contact("Email", tags["contact:email"] ?? tags.email, "mailto:"),
    telegram ? { type: "Telegram", value: `@${telegram}`, url: `https://t.me/${telegram}` } : null,
    vk ? { type: "VK", value: vk, url: /^https?:\/\//.test(vk) ? vk : `https://vk.com/${vk.replace(/^@/, "")}` } : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));
}

function describeIndustry(tags: OsmTags, fallback: string): string {
  return fallback || tags.amenity || tags.shop || tags.office || tags.craft || tags.tourism || "Услуги";
}

async function searchNominatimBusinesses(input: {
  country: string;
  city: string;
  industry: string;
}): Promise<PublicBusiness[]> {
  if (!input.city || !input.industry) return [];
  const alias = Object.entries(categoryAliases)
    .find(([name]) => input.industry.toLowerCase().includes(name))?.[1][0] ?? input.industry;
  const query = `${alias} in ${input.city}${input.country && input.country !== "any" ? `, ${input.country}` : ""}`;
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "20");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("extratags", "1");
  url.searchParams.set("namedetails", "1");

  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "ru,en;q=0.8" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) return [];
  const results = await response.json() as NominatimBusiness[];

  return results
    .filter((item) => !["highway", "public_transport", "railway"].includes(item.category))
    .filter((item) => !["bus_stop", "platform", "station"].includes(item.type))
    .map((item) => {
      const tags = item.extratags ?? {};
      const name = item.namedetails?.name ?? item.display_name.split(",")[0]!.trim();
      const website = websiteFrom(tags);
      const contacts = contactsFrom(tags);
      return {
        sourceId: `osm:${item.osm_type}:${item.osm_id}`,
        name,
        city: input.city,
        industry: input.industry,
        website,
        contacts,
        issues: website ? ["Требуется проверка скорости и мобильной версии"] : ["Сайт не найден"],
        score: Math.min(96, 58 + (!website ? 24 : 8) + Math.min(contacts.length * 5, 14)),
        scoreReasons: [
          !website ? "Нет собственного сайта" : "Есть сайт для технического аудита",
          contacts.length > 0 ? "Опубликованы прямые контакты" : "Есть публичная карточка компании",
        ],
      };
    });
}

function buildQuery(lat: number, lon: number, industry: string): string {
  const area = `around:12000,${lat},${lon}`;
  const aliases = Object.entries(categoryAliases)
    .filter(([name]) => industry.toLowerCase().includes(name))
    .flatMap(([, values]) => values);

  const selectors = aliases.length > 0
    ? aliases.flatMap((value) => [
        `nwr["amenity"="${escapeOverpass(value)}"](${area});`,
        `nwr["shop"="${escapeOverpass(value)}"](${area});`,
        `nwr["office"="${escapeOverpass(value)}"](${area});`,
        `nwr["craft"="${escapeOverpass(value)}"](${area});`,
        `nwr["tourism"="${escapeOverpass(value)}"](${area});`,
      ])
    : [
        `nwr["name"]["amenity"](${area});`,
        `nwr["name"]["shop"](${area});`,
        `nwr["name"]["office"](${area});`,
        `nwr["name"]["craft"](${area});`,
        `nwr["name"]["tourism"](${area});`,
      ];

  return `[out:json][timeout:25];(${selectors.join("")});out center tags 80;`;
}

async function searchPublicBusinessesUncached(input: {
  country: string;
  city: string;
  industry: string;
}): Promise<PublicBusiness[]> {
  if (!input.city && input.country.toLowerCase().includes("рос")) {
    const popularCities = ["Москва", "Санкт-Петербург", "Новосибирск", "Екатеринбург", "Казань"];
    const broadIndustries = ["СТО", "Стоматология", "Ресторан", "Салон красоты", "Недвижимость"];
    const countryResults: PublicBusiness[] = [];
    for (const [index, city] of popularCities.entries()) {
      const cityResults = await searchNominatimBusinesses({
        ...input,
        city,
        industry: input.industry || broadIndustries[index]!,
      });
      countryResults.push(...cityResults.slice(0, 4));
      if (city !== popularCities.at(-1)) await new Promise((resolve) => setTimeout(resolve, 1_050));
    }
    if (countryResults.length > 0) return countryResults.slice(0, 20);
  }

  const directResults = await searchNominatimBusinesses(input);
  if (directResults.length >= 10) return directResults.slice(0, 20);

  const location = [input.city, input.country === "any" ? "" : input.country].filter(Boolean).join(", ");
  if (!location) throw new Error("Для реального поиска укажите город или страну");

  const geocodeUrl = new URL(NOMINATIM_URL);
  geocodeUrl.searchParams.set("q", location);
  geocodeUrl.searchParams.set("format", "jsonv2");
  geocodeUrl.searchParams.set("limit", "1");
  geocodeUrl.searchParams.set("addressdetails", "1");

  const geocodeResponse = await fetch(geocodeUrl, {
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "ru,en;q=0.8" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!geocodeResponse.ok) throw new Error(`Nominatim вернул ${geocodeResponse.status}`);

  const geocoded = await geocodeResponse.json() as Array<{ lat: string; lon: string }>;
  if (!geocoded[0]) return [];

  const query = buildQuery(Number(geocoded[0].lat), Number(geocoded[0].lon), input.industry);
  let data: { elements?: OverpassElement[] } | null = null;
  let lastError = "Источник временно недоступен";
  for (const endpoint of OVERPASS_URLS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "User-Agent": USER_AGENT,
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) {
        lastError = `Overpass вернул ${response.status}`;
        continue;
      }
      data = await response.json() as { elements?: OverpassElement[] };
      break;
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
    }
  }
  if (!data) {
    if (directResults.length > 0) return directResults;
    throw new Error(lastError);
  }

  const seen = new Set<string>();

  const overpassResults = (data.elements ?? [])
    .filter((item) => item.tags?.name)
    .filter((item) => {
      const key = item.tags!.name!.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((item) => {
      const tags = item.tags!;
      const website = websiteFrom(tags);
      const contacts = contactsFrom(tags);
      const issues = website ? ["Требуется проверка скорости и мобильной версии"] : ["Сайт не найден"];
      const reasons = [
        !website ? "Нет собственного сайта" : "Есть сайт для технического аудита",
        contacts.length > 0 ? "Опубликованы прямые контакты" : "Есть публичная карточка компании",
      ];
      const score = Math.min(96, 58 + (!website ? 24 : 8) + Math.min(contacts.length * 5, 14));
      return {
        sourceId: `osm:${item.type}:${item.id}`,
        name: tags.name!.trim(),
        city: input.city,
        industry: describeIndustry(tags, input.industry.trim()),
        website,
        contacts,
        issues,
        score,
        scoreReasons: reasons,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  const merged = new Map<string, PublicBusiness>();
  for (const business of [...directResults, ...overpassResults]) {
    merged.set(business.sourceId, business);
  }
  return [...merged.values()].sort((a, b) => b.score - a.score).slice(0, 20);
}

export async function searchPublicBusinesses(input: {
  country: string;
  city: string;
  industry: string;
}): Promise<PublicBusiness[]> {
  const key = [input.country, input.city, input.industry].map((value) => value.trim().toLowerCase()).join("|");
  const cached = searchCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.results;
  const results = await searchPublicBusinessesUncached(input);
  searchCache.set(key, { expiresAt: Date.now() + 15 * 60 * 1_000, results });
  return results;
}