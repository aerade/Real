import type { ScoreFactor, WebsiteAudit } from "./website-audit";

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
  reviewsCount?: number;
  rating?: number | null;
  branchesCount?: number;
  source?: string;
  websiteAudit?: WebsiteAudit | null;
  scoreBreakdown?: ScoreFactor[];
  scoreVersion?: string;
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
  "кафе и кофейня": ["cafe"],
  автомойка: ["car_wash"],
  автозапчасти: ["car_parts"],
  "грузоперевозки": ["logistics"],
  логистика: ["logistics"],
  клининг: ["cleaning"],
  "медицинская клиника": ["clinic", "doctors"],
  "ветеринарная клиника": ["veterinary"],
  "детский сад": ["kindergarten", "childcare"],
  "образовательный центр": ["language_school", "training"],
  "интернет-магазин": ["e-commerce"],
  "оптовая торговля": ["wholesale"],
  "дизайн интерьера": ["interior_design"],
  "архитектурное бюро": ["architect"],
  "бухгалтерские услуги": ["accountant"],
  "рекламное агентство": ["advertising_agency"],
  "туристическое агентство": ["travel_agency"],
  "фото и видеостудия": ["photographer"],
  барбершоп: ["barber"],
  пекарня: ["bakery"],
  "доставка еды": ["food_delivery"],
  "магазин одежды": ["clothes"],
  "мебельный салон": ["furniture"],
  "оконная компания": ["windows"],
  электромонтаж: ["electrician"],
  "сервис кондиционеров": ["hvac"],
  "тату-студия": ["tattoo"],
};
const searchCache = new Map<string, { expiresAt: number; results: PublicBusiness[] }>();

const countrySearchConfigs = [
  { names: ["россия", "russia", "ru"], searchName: "Russia", cities: ["Москва", "Санкт-Петербург", "Новосибирск", "Екатеринбург", "Казань"] },
  { names: ["сша", "united states", "usa", "us"], searchName: "United States", cities: ["New York", "Los Angeles", "Chicago", "Houston", "Miami"] },
  { names: ["канада", "canada", "ca"], searchName: "Canada", cities: ["Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa"] },
  { names: ["мексика", "mexico", "mx"], searchName: "Mexico", cities: ["Mexico City", "Guadalajara", "Monterrey", "Puebla", "Tijuana"] },
  { names: ["бразилия", "brazil", "br"], searchName: "Brazil", cities: ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador", "Curitiba"] },
  { names: ["аргентина", "argentina", "ar"], searchName: "Argentina", cities: ["Buenos Aires", "Córdoba", "Rosario", "Mendoza", "La Plata"] },
  { names: ["чили", "chile", "cl"], searchName: "Chile", cities: ["Santiago", "Valparaíso", "Concepción", "Viña del Mar", "Antofagasta"] },
  { names: ["колумбия", "colombia", "co"], searchName: "Colombia", cities: ["Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena"] },
  { names: ["перу", "peru", "pe"], searchName: "Peru", cities: ["Lima", "Arequipa", "Cusco", "Trujillo", "Chiclayo"] },
  { names: ["великобритания", "united kingdom", "uk", "great britain"], searchName: "United Kingdom", cities: ["London", "Manchester", "Birmingham", "Edinburgh", "Bristol"] },
  { names: ["германия", "germany", "de"], searchName: "Germany", cities: ["Berlin", "Munich", "Hamburg", "Cologne", "Frankfurt"] },
  { names: ["франция", "france", "fr"], searchName: "France", cities: ["Paris", "Lyon", "Marseille", "Toulouse", "Nice"] },
  { names: ["испания", "spain", "es"], searchName: "Spain", cities: ["Madrid", "Barcelona", "Valencia", "Seville", "Málaga"] },
  { names: ["италия", "italy", "it"], searchName: "Italy", cities: ["Rome", "Milan", "Naples", "Turin", "Florence"] },
  { names: ["нидерланды", "netherlands", "holland", "nl"], searchName: "Netherlands", cities: ["Amsterdam", "Rotterdam", "The Hague", "Utrecht", "Eindhoven"] },
  { names: ["бельгия", "belgium", "be"], searchName: "Belgium", cities: ["Brussels", "Antwerp", "Ghent", "Liège", "Bruges"] },
  { names: ["швейцария", "switzerland", "ch"], searchName: "Switzerland", cities: ["Zurich", "Geneva", "Basel", "Bern", "Lausanne"] },
  { names: ["австрия", "austria", "at"], searchName: "Austria", cities: ["Vienna", "Graz", "Linz", "Salzburg", "Innsbruck"] },
  { names: ["португалия", "portugal", "pt"], searchName: "Portugal", cities: ["Lisbon", "Porto", "Braga", "Coimbra", "Faro"] },
  { names: ["швеция", "sweden", "se"], searchName: "Sweden", cities: ["Stockholm", "Gothenburg", "Malmö", "Uppsala", "Västerås"] },
  { names: ["норвегия", "norway", "no"], searchName: "Norway", cities: ["Oslo", "Bergen", "Trondheim", "Stavanger", "Tromsø"] },
  { names: ["дания", "denmark", "dk"], searchName: "Denmark", cities: ["Copenhagen", "Aarhus", "Odense", "Aalborg", "Esbjerg"] },
  { names: ["финляндия", "finland", "fi"], searchName: "Finland", cities: ["Helsinki", "Tampere", "Turku", "Oulu", "Espoo"] },
  { names: ["польша", "poland", "pl"], searchName: "Poland", cities: ["Warsaw", "Kraków", "Wrocław", "Gdańsk", "Poznań"] },
  { names: ["чехия", "czechia", "czech republic", "cz"], searchName: "Czechia", cities: ["Prague", "Brno", "Ostrava", "Plzeň", "Liberec"] },
  { names: ["ирландия", "ireland", "ie"], searchName: "Ireland", cities: ["Dublin", "Cork", "Galway", "Limerick", "Waterford"] },
  { names: ["греция", "greece", "gr"], searchName: "Greece", cities: ["Athens", "Thessaloniki", "Patras", "Heraklion", "Larissa"] },
  { names: ["румыния", "romania", "ro"], searchName: "Romania", cities: ["Bucharest", "Cluj-Napoca", "Timișoara", "Iași", "Constanța"] },
  { names: ["венгрия", "hungary", "hu"], searchName: "Hungary", cities: ["Budapest", "Debrecen", "Szeged", "Pécs", "Győr"] },
  { names: ["украина", "ukraine", "ua"], searchName: "Ukraine", cities: ["Kyiv", "Lviv", "Odesa", "Dnipro", "Kharkiv"] },
];

function countryConfig(country: string) {
  const normalized = country.trim().toLowerCase();
  return countrySearchConfigs.find((item) => item.names.includes(normalized));
}

function countryNameForSearch(country: string) {
  return countryConfig(country)?.searchName ?? country;
}

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
  const query = `${alias} in ${input.city}${input.country && input.country !== "any" ? `, ${countryNameForSearch(input.country)}` : ""}`;
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
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

async function searchCityBusinesses(input: {
  country: string;
  city: string;
  industry: string;
}): Promise<PublicBusiness[]> {
  const directResults = input.industry ? await searchNominatimBusinesses(input) : [];
  if (directResults.length >= 5) return directResults.slice(0, 5);

  if (input.industry) await new Promise((resolve) => setTimeout(resolve, 1_050));
  const location = [input.city, input.country === "any" ? "" : countryNameForSearch(input.country)].filter(Boolean).join(", ");
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
    .slice(0, 40);

  const merged = new Map<string, PublicBusiness>();
  for (const business of [...directResults, ...overpassResults]) {
    merged.set(business.sourceId, business);
  }
  return [...merged.values()].sort((a, b) => b.score - a.score).slice(0, 40);
}

async function searchPublicBusinessesUncached(input: {
  country: string;
  city: string;
  industry: string;
}): Promise<PublicBusiness[]> {
  if (input.city) return searchCityBusinesses(input);

  const config = countryConfig(input.country);
  if (!config) {
    throw new Error("Для поиска по стране без города выберите поддерживаемую страну или укажите город вручную");
  }

  const countryResults: PublicBusiness[] = [];
  let lastCityError: unknown;
  for (const [index, city] of config.cities.entries()) {
    try {
      const cityResults = await searchCityBusinesses({ ...input, city });
      countryResults.push(...cityResults.slice(0, 10));
    } catch (error) {
      lastCityError = error;
    }
    if (countryResults.length >= 40) break;
    if (index < config.cities.length - 1) await new Promise((resolve) => setTimeout(resolve, 1_050));
  }
  if (countryResults.length === 0 && lastCityError) throw lastCityError;
  return countryResults;
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