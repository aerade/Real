import type { PublicBusiness } from "./osm-leads";

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  primaryTypeDisplayName?: { text?: string };
  formattedAddress?: string;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  rating?: number;
  userRatingCount?: number;
  addressComponents?: Array<{
    longText?: string;
    types?: string[];
  }>;
};

type GooglePlacesResponse = {
  places?: GooglePlace[];
  error?: { message?: string; status?: string };
};

const GOOGLE_PLACES_URL = "https://places.googleapis.com/v1/places:searchText";
const GOOGLE_PLACES_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.primaryTypeDisplayName",
  "places.formattedAddress",
  "places.addressComponents",
  "places.websiteUri",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.rating",
  "places.userRatingCount",
].join(",");

const supportedCountries: Record<string, { code: string; name: string }> = {
  "сша": { code: "US", name: "United States" },
  "канада": { code: "CA", name: "Canada" },
  "мексика": { code: "MX", name: "Mexico" },
  "бразилия": { code: "BR", name: "Brazil" },
  "аргентина": { code: "AR", name: "Argentina" },
  "чили": { code: "CL", name: "Chile" },
  "колумбия": { code: "CO", name: "Colombia" },
  "перу": { code: "PE", name: "Peru" },
  "великобритания": { code: "GB", name: "United Kingdom" },
  "германия": { code: "DE", name: "Germany" },
  "франция": { code: "FR", name: "France" },
  "испания": { code: "ES", name: "Spain" },
  "италия": { code: "IT", name: "Italy" },
  "нидерланды": { code: "NL", name: "Netherlands" },
  "бельгия": { code: "BE", name: "Belgium" },
  "швейцария": { code: "CH", name: "Switzerland" },
  "австрия": { code: "AT", name: "Austria" },
  "португалия": { code: "PT", name: "Portugal" },
  "швеция": { code: "SE", name: "Sweden" },
  "норвегия": { code: "NO", name: "Norway" },
  "дания": { code: "DK", name: "Denmark" },
  "финляндия": { code: "FI", name: "Finland" },
  "польша": { code: "PL", name: "Poland" },
  "чехия": { code: "CZ", name: "Czechia" },
  "ирландия": { code: "IE", name: "Ireland" },
  "греция": { code: "GR", name: "Greece" },
  "румыния": { code: "RO", name: "Romania" },
  "венгрия": { code: "HU", name: "Hungary" },
  "украина": { code: "UA", name: "Ukraine" },
};

function toPublicBusiness(place: GooglePlace, input: { city: string; industry: string }): PublicBusiness | null {
  const name = place.displayName?.text?.trim();
  if (!name || !place.id) return null;

  const phone = place.internationalPhoneNumber ?? place.nationalPhoneNumber;
  const contacts = phone
    ? [{
        type: "Телефон",
        value: phone,
        url: `tel:${phone.replace(/[^\d+]/g, "")}`,
      }]
    : [];
  const website = place.websiteUri ?? null;
  const industry = input.industry.trim() || place.primaryTypeDisplayName?.text || "Компания";
  const city = input.city.trim() || place.addressComponents?.find((component) =>
    component.types?.some((type) => ["locality", "postal_town", "administrative_area_level_2"].includes(type)),
  )?.longText || "";
  const score = Math.min(96, 58 + (!website ? 24 : 8) + Math.min(contacts.length * 5, 14));

  return {
    sourceId: `google:${place.id}`,
    name,
    city,
    industry,
    website,
    contacts,
    issues: website ? ["Требуется проверка скорости и мобильной версии"] : ["Сайт не найден"],
    score,
    scoreReasons: [
      !website ? "Нет собственного сайта" : "Есть сайт для технического аудита",
      contacts.length > 0 ? "Опубликован прямой телефон" : "Есть карточка компании в Google Maps",
    ],
    reviewsCount: place.userRatingCount ?? 0,
    rating: place.rating ?? null,
    branchesCount: 1,
    source: "Google Maps",
  };
}

export async function searchGoogleMapsBusinesses(input: {
  country: string;
  city: string;
  industry: string;
}): Promise<PublicBusiness[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Не настроен GOOGLE_MAPS_API_KEY. Добавьте ключ Google Maps Platform в Replit Secrets.");
  }

  const configuredCountry = supportedCountries[input.country.trim().toLowerCase()];
  if (!configuredCountry) {
    throw new Error(`Поиск через Google Maps не настроен для страны «${input.country}».`);
  }

  const location = [input.city.trim(), configuredCountry.name].filter(Boolean).join(", ");
  const category = input.industry.trim() || "businesses";
  const textQuery = input.industry.trim() ? `${category} in ${location}` : `businesses in ${location}`;

  let response: Response;
  try {
    response = await fetch(GOOGLE_PLACES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": GOOGLE_PLACES_FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery,
        pageSize: 20,
        includedRegionCodes: [configuredCountry.code],
        languageCode: "ru",
      }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("Поиск Google Maps превысил лимит ожидания. Попробуйте ещё раз.");
    }
    throw new Error("Не удалось подключиться к Google Maps Places API.");
  }

  let payload: GooglePlacesResponse;
  try {
    payload = await response.json() as GooglePlacesResponse;
  } catch {
    throw new Error("Google Maps Places API вернул некорректный ответ.");
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Google Maps отказал в доступе. Проверьте API-ключ, включённый Places API и настройки биллинга.");
    }
    throw new Error(
      payload.error?.message
        ? `Ошибка Google Maps Places API: ${payload.error.message}`
        : `Google Maps Places API вернул статус ${response.status}.`,
    );
  }

  return (payload.places ?? [])
    .map((place) => toPublicBusiness(place, input))
    .filter((business): business is PublicBusiness => Boolean(business));
}