import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { searchTwoGisBusinesses, supportsTwoGisCountry } from "../lib/parser-2gis";
import { getTwoGisSearchCities } from "../lib/two-gis-search-cities";
import { auditAndScoreBusinesses } from "../lib/website-audit";
import {
  authenticate,
  claimLead,
  createCountry,
  getDashboard,
  getLead,
  getPreviouslyShownLeadIds,
  getUserById,
  listCountries,
  listLeadArchive,
  listLeads,
  listUsers,
  recordShownLeads,
  runLeadAudit,
  updateLead,
  upsertSearchedLead,
  type AuthUser,
  type LeadStatus,
} from "../lib/store";

const router: IRouter = Router();
const LEAD_STATUSES: LeadStatus[] = ["new", "claimed", "contacted", "replied", "rejected", "no_reply", "deal"];
const SEARCH_RESULT_LIMIT = 15;
const ANY_CITY_PARSE_CONCURRENCY = 4;

function normalizeSearchFilter(value: string): string {
  return ["any", "all", "любой", "любая", "все", "вся"].includes(value.trim().toLowerCase())
    ? ""
    : value.trim();
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      results[index] = await mapper(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

function interleaveCityResults(cityResults: Array<{ city: string; businesses: Awaited<ReturnType<typeof searchTwoGisBusinesses>> }>) {
  const dedupedByCity = cityResults.map(({ city, businesses }) => ({
    city,
    businesses: [...new Map(businesses.map((business) => [business.sourceId, business])).values()],
  }));
  const candidates: Array<{ city: string; business: (typeof dedupedByCity)[number]["businesses"][number] }> = [];
  const maxResultsForAnyCity = Math.max(0, ...dedupedByCity.map(({ businesses }) => businesses.length));
  for (let rank = 0; rank < maxResultsForAnyCity; rank += 1) {
    for (const group of dedupedByCity) {
      const business = group.businesses[rank];
      if (business) candidates.push({ city: group.city, business });
    }
  }
  return candidates;
}

async function requestUser(req: Request): Promise<AuthUser | null> {
  const id = Number(req.cookies?.lead_scout_user);
  if (!Number.isInteger(id) || id <= 0) return null;
  return getUserById(id);
}

async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!(await requestUser(req))) {
      res.status(401).json({ error: "Требуется вход" });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
}

router.post("/auth/login", async (req, res, next) => {
  try {
    const login = String(req.body?.login ?? "").trim();
    const password = String(req.body?.password ?? "");
    const user = await authenticate(login, password);
    if (!user) return res.status(401).json({ error: "Неверный логин или пароль" });

    res.cookie("lead_scout_user", String(user.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: req.secure,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return res.json({ authenticated: true, user });
  } catch (error) {
    return next(error);
  }
});

router.get("/auth/session", async (req, res, next) => {
  try {
    const user = await requestUser(req);
    return res.json({ authenticated: Boolean(user), user });
  } catch (error) {
    return next(error);
  }
});

router.post("/auth/logout", (_req, res) => {
  res.clearCookie("lead_scout_user");
  res.status(204).send();
});

router.get("/countries", async (_req, res, next) => {
  try {
    return res.json(await listCountries());
  } catch (error) {
    return next(error);
  }
});

router.use(requireAuth);

router.get("/dashboard", async (req, res, next) => {
  try {
    const user = await requestUser(req);
    if (!user) return res.status(401).json({ error: "Требуется вход" });
    return res.json(await getDashboard(user));
  } catch (error) {
    return next(error);
  }
});

router.get("/leads", async (req, res, next) => {
  try {
    const user = await requestUser(req);
    if (!user) return res.status(401).json({ error: "Требуется вход" });
    return res.json(await listLeads(
      user,
      typeof req.query.status === "string" ? req.query.status : undefined,
      req.query.assignedToMe === "true",
    ));
  } catch (error) {
    return next(error);
  }
});

router.get("/leads/archive", async (req, res, next) => {
  try {
    const user = await requestUser(req);
    if (!user) return res.status(401).json({ error: "Требуется вход" });
    const query = typeof req.query.query === "string" ? req.query.query : "";
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    return res.json(await listLeadArchive(user, query, status));
  } catch (error) {
    return next(error);
  }
});

router.post("/leads/search", async (req, res, next) => {
  const user = await requestUser(req);
  if (!user) return res.status(401).json({ error: "Требуется вход" });
  const requestedCountry = String(req.body?.country ?? "").trim();
  const city = normalizeSearchFilter(String(req.body?.city ?? ""));
  const industry = normalizeSearchFilter(String(req.body?.industry ?? ""));
  const showPreviouslyFound = req.body?.showPreviouslyFound === true;
  if (requestedCountry.length > 100 || city.length > 160 || industry.length > 160) {
    return res.status(400).json({ error: "Параметры поиска слишком длинные" });
  }
  const country = requestedCountry || "Россия";
  if (!supportsTwoGisCountry(country)) {
    return res.status(400).json({ error: "Поддерживаются только Россия и Казахстан. Поиск выполняется через 2ГИС." });
  }

  try {
    let businesses: Awaited<ReturnType<typeof searchTwoGisBusinesses>> = [];
    try {
      let returned: Awaited<ReturnType<typeof upsertSearchedLead>>[] = [];
      let previouslyShown = new Set<number>();
      let parsedCount = 0;
      let pagesFetched = 0;
      let upsertedCount = 0;
      if (city) {
        // Continue through 2GIS pages when older searches have already shown the
        // companies on the first page, so users receive the next unseen batch.
        for (let attempt = 0; attempt < 100 && returned.length === 0; attempt += 1) {
          const parsedBusinesses = await searchTwoGisBusinesses({ country, city, industry });
          if (parsedBusinesses.length <= parsedCount) break;

          const newBusinesses = parsedBusinesses.slice(parsedCount);
          const scoredBusinesses = await auditAndScoreBusinesses(newBusinesses);
          businesses = [...businesses, ...scoredBusinesses];
          parsedCount = parsedBusinesses.length;
          pagesFetched += 1;

          const found = await Promise.all(
            businesses.map((business) => upsertSearchedLead(business, country, city)),
          );
          upsertedCount += businesses.length;
          const available = found.filter((lead) => lead.status === "new" && !lead.assignee);
          previouslyShown = await getPreviouslyShownLeadIds(user.id, available.map((lead) => lead.id));
          const results = showPreviouslyFound
            ? available
            : available.filter((lead) => !previouslyShown.has(lead.id));
          returned = results.slice(0, SEARCH_RESULT_LIMIT);
        }
      } else {
        const cities = getTwoGisSearchCities(country);
        const selected: Array<{ business: Awaited<ReturnType<typeof searchTwoGisBusinesses>>[number]; lead: Awaited<ReturnType<typeof upsertSearchedLead>> }> = [];
        const seenSourceIds = new Set<string>();
        let successfulCityQueries = 0;
        const CITY_BATCH_SIZE = 8;
        const PER_CITY_RESULT_LIMIT = 2;

        // Query popular cities in small batches and stop as soon as the result
        // cap is filled. This covers the supported city list without launching
        // dozens of Chromium parsers for every search.
        for (let cityOffset = 0; cityOffset < cities.length && selected.length < SEARCH_RESULT_LIMIT; cityOffset += CITY_BATCH_SIZE) {
          const cityBatch = cities.slice(cityOffset, cityOffset + CITY_BATCH_SIZE);
          const cityResults = await mapWithConcurrency(cityBatch, ANY_CITY_PARSE_CONCURRENCY, async (searchCity) => {
            try {
              const parsed = await searchTwoGisBusinesses({
                country,
                city: searchCity,
                industry,
                maxRecords: PER_CITY_RESULT_LIMIT,
              });
              return { city: searchCity, businesses: parsed, succeeded: true };
            } catch (error) {
              req.log.warn({ city: searchCity, err: error }, "2GIS city search failed; continuing countrywide search");
              return { city: searchCity, businesses: [], succeeded: false };
            }
          }
          );
          successfulCityQueries += cityResults.filter(({ succeeded }) => succeeded).length;
          businesses = [...businesses, ...cityResults.flatMap(({ businesses: cityBusinesses }) => cityBusinesses)];
          pagesFetched += cityResults.filter(({ businesses: cityBusinesses }) => cityBusinesses.length > 0).length;
          const candidates = interleaveCityResults(cityResults);

          for (let offset = 0; offset < candidates.length && selected.length < SEARCH_RESULT_LIMIT; offset += SEARCH_RESULT_LIMIT) {
            const batch = candidates.slice(offset, offset + SEARCH_RESULT_LIMIT).filter(({ business }) => {
              if (seenSourceIds.has(business.sourceId)) return false;
              seenSourceIds.add(business.sourceId);
              return true;
            });
            if (batch.length === 0) continue;
            const found = await Promise.all(batch.map(({ city: resultCity, business }) =>
              upsertSearchedLead(business, country, business.city || resultCity),
            ));
            upsertedCount += batch.length;
            const eligible = found
              .map((lead, index) => ({ lead, candidate: batch[index] }))
              .filter(({ lead, candidate }) => candidate && lead.status === "new" && !lead.assignee);
            const shownInBatch = await getPreviouslyShownLeadIds(user.id, eligible.map(({ lead }) => lead.id));
            previouslyShown = new Set([...previouslyShown, ...shownInBatch]);
            eligible.forEach(({ lead, candidate }) => {
              if (candidate && (showPreviouslyFound || !shownInBatch.has(lead.id)) && selected.length < SEARCH_RESULT_LIMIT) {
                selected.push({ business: candidate.business, lead });
              }
            });
          }
        }

        if (successfulCityQueries === 0) {
          throw new Error("Источник 2ГИС временно недоступен ни в одном поддерживаемом городе.");
        }

        const audited = await auditAndScoreBusinesses(selected.map(({ business }) => business));
        const auditedById = new Map(audited.map((business) => [business.sourceId, business]));
        const finalLeads = await Promise.all(selected.map(({ business, lead }) => {
          const scored = auditedById.get(business.sourceId);
          if (!scored) return Promise.resolve(lead);
          upsertedCount += 1;
          return upsertSearchedLead(scored, country, business.city || lead.city);
        }));
        returned = finalLeads.filter((lead) => lead.status === "new" && !lead.assignee).slice(0, SEARCH_RESULT_LIMIT);
      }

      await recordShownLeads(user.id, returned.map((lead) => lead.id));
      req.log.info({
        parserResults: businesses.length,
        upserted: upsertedCount,
        available: returned.length,
        previouslyShown: previouslyShown.size,
        returned: returned.length,
        pagesFetched,
        anyCity: !city,
      }, "2GIS search completed");
      return res.json(returned);
    } catch (error) {
      req.log.error({ err: error }, "2GIS search failed");
      return res.status(502).json({
        error: error instanceof Error && error.message === "Источник 2ГИС временно недоступен ни в одном поддерживаемом городе."
          ? error.message
          : "Источник 2ГИС временно недоступен.",
      });
    }
  } catch (error) {
    req.log.error({ err: error }, "Public lead search failed");
    return res.status(502).json({
      error: error instanceof Error ? error.message : "Источник поиска временно недоступен",
    });
  }
});

router.get("/leads/:id", async (req, res, next) => {
  try {
    const lead = await getLead(Number(req.params.id));
    if (!lead) return res.status(404).json({ error: "Компания не найдена" });
    return res.json(lead);
  } catch (error) {
    return next(error);
  }
});

router.post("/leads/:id/audit", async (req, res, next) => {
  try {
    const lead = await runLeadAudit(Number(req.params.id));
    if (!lead) return res.status(404).json({ error: "Компания не найдена" });
    return res.json(lead);
  } catch (error) {
    return next(error);
  }
});

router.post("/leads/:id/claim", async (req, res, next) => {
  try {
    const user = await requestUser(req);
    if (!user) return res.status(401).json({ error: "Требуется вход" });

    const result = await claimLead(Number(req.params.id), user);
    if (result === "missing") return res.status(404).json({ error: "Компания не найдена" });
    if (result === "conflict") return res.status(409).json({ error: "Компания уже взята другим пользователем" });

    return res.json(await getLead(Number(req.params.id)));
  } catch (error) {
    return next(error);
  }
});

router.patch("/leads/:id", async (req, res, next) => {
  try {
    const user = await requestUser(req);
    if (!user) return res.status(401).json({ error: "Требуется вход" });

    const rawStatus = req.body?.status;
    if (rawStatus !== undefined && !LEAD_STATUSES.includes(rawStatus as LeadStatus)) {
      return res.status(400).json({ error: "Недопустимый статус клиента" });
    }

    const result = await updateLead(Number(req.params.id), user, {
      status: rawStatus as LeadStatus | undefined,
      note: typeof req.body?.note === "string" ? req.body.note : undefined,
    });
    if (result === "missing") return res.status(404).json({ error: "Компания не найдена" });
    if (result === "forbidden") return res.status(403).json({ error: "Компания закреплена за другим пользователем" });

    return res.json(await getLead(Number(req.params.id)));
  } catch (error) {
    return next(error);
  }
});

router.get("/users", async (req, res, next) => {
  try {
    const user = await requestUser(req);
    if (!user) return res.status(401).json({ error: "Требуется вход" });
    if (user.role !== "owner") return res.status(403).json({ error: "Только для владельца" });
    return res.json(await listUsers());
  } catch (error) {
    return next(error);
  }
});

router.post("/countries", async (req, res, next) => {
  try {
    const user = await requestUser(req);
    if (!user) return res.status(401).json({ error: "Требуется вход" });
    if (user.role !== "owner") return res.status(403).json({ error: "Только для владельца" });

    const code = String(req.body?.code ?? "").trim().toUpperCase();
    const name = String(req.body?.name ?? "").trim();
    if (!code || !name) return res.status(400).json({ error: "Заполните код и название" });

    const country = await createCountry(code, name);
    if (!country) return res.status(409).json({ error: "Такая страна уже существует" });
    return res.status(201).json(country);
  } catch (error) {
    return next(error);
  }
});

export default router;