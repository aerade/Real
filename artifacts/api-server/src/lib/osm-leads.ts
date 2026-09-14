type OsmTags = Record<string, string | undefined>;

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: OsmTags;
};

export type PublicBusiness = {
  sourceId: string;
  name: string;
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
  клиника: ["clinic", "doctors"],
  ресторан: ["restaurant", "cafe", "fast_food"],
  кафе: ["cafe"],
  юрист: ["lawyer"],
  адвокат: ["lawyer"],
  недвижимость: ["estate_agent"],
  строительство: ["construction", "builder"],
  мебель: ["furniture", "carpenter"],
  автосервис: ["car_repair"],
  красота: ["beauty", "hairdresser"],
  фитнес: ["fitness_centre", "sports_centre"],
  отель: ["hotel", "guest_house"],
};

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

export async function searchPublicBusinesses(input: {
  country: string;
  city: string;
  industry: string;
}): Promise<PublicBusiness[]> {
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
        signal: AbortSignal.timeout(25_000),
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
  if (!data) throw new Error(lastError);

  const seen = new Set<string>();

  return (data.elements ?? [])
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
}