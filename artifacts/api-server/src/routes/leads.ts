import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { searchTwoGisBusinesses } from "../lib/parser-2gis";
import { searchPublicBusinesses } from "../lib/osm-leads";
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
const SEARCH_RESULT_LIMIT = 10;
const BROAD_SEARCH_POOL_LIMIT = 24;

function pickRandomProspects<T extends { score: number }>(businesses: T[], limit: number): T[] {
  const pool = [...businesses]
    .sort((left, right) => right.score - left.score)
    .slice(0, BROAD_SEARCH_POOL_LIMIT);
  const selected: T[] = [];
  while (pool.length > 0 && selected.length < limit) {
    const index = Math.floor(Math.random() * pool.length);
    selected.push(pool.splice(index, 1)[0]!);
  }
  return selected.sort((left, right) => right.score - left.score);
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
  const city = String(req.body?.city ?? "").trim();
  const industry = String(req.body?.industry ?? "").trim();
  const showPreviouslyFound = req.body?.showPreviouslyFound === true;
  if (requestedCountry.length > 100 || city.length > 160 || industry.length > 160) {
    return res.status(400).json({ error: "Параметры поиска слишком длинные" });
  }
  const country = requestedCountry || "Россия";
  const countryKey = country.toLowerCase();
  const isRussia = ["россия", "russia", "ru"].includes(countryKey);
  const useTwoGis = isRussia && Boolean(city) && Boolean(industry);
  if (!requestedCountry && !city && !industry) return res.status(400).json({ error: "Укажите город или отрасль" });

  try {
    let businesses: Awaited<ReturnType<typeof searchTwoGisBusinesses>> = [];
    let available: Awaited<ReturnType<typeof upsertSearchedLead>>[] = [];
    let previouslyShown = new Set<number>();
    let returned: typeof available = [];
    let parsedCount = 0;
    let pagesFetched = 0;
    try {
      if (!useTwoGis) {
        const broadBusinesses = await searchPublicBusinesses({ country, city, industry });
        const candidates = broadBusinesses.slice(0, BROAD_SEARCH_POOL_LIMIT);
        businesses = await auditAndScoreBusinesses(candidates);
        pagesFetched = 1;

        const found = await Promise.all(
          businesses.map((business) => upsertSearchedLead(business, country, business.city ?? city)),
        );
        available = found.filter((lead) => lead.status === "new" && !lead.assignee);
        previouslyShown = await getPreviouslyShownLeadIds(user.id, available.map((lead) => lead.id));
        const results = showPreviouslyFound
          ? available
          : available.filter((lead) => !previouslyShown.has(lead.id));
        returned = pickRandomProspects(results, SEARCH_RESULT_LIMIT);
      } else {
        // A user may have already seen every company on the first source page
        // during an older search. Keep walking 2GIS pages until the next
        // unseen batch is found instead of returning a misleading empty result.
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
          available = found.filter((lead) => lead.status === "new" && !lead.assignee);
          previouslyShown = await getPreviouslyShownLeadIds(user.id, available.map((lead) => lead.id));
          const results = showPreviouslyFound
            ? available
            : available.filter((lead) => !previouslyShown.has(lead.id));
          returned = results.slice(0, SEARCH_RESULT_LIMIT);
        }
      }
    } catch (error) {
      req.log.error({ err: error }, useTwoGis ? "2GIS search failed" : "OpenStreetMap search failed");
      return res.status(502).json({
        error: useTwoGis
          ? "Источник 2ГИС временно недоступен. Результаты из OpenStreetMap отключены."
          : error instanceof Error
            ? error.message
            : "Не удалось собрать подборку компаний из OpenStreetMap.",
      });
    }

    // Keep the UI batch compact, but record only the rows actually returned.
    // This lets the next identical search continue with the next unseen
    // companies instead of marking the complete parser response as shown.
    await recordShownLeads(user.id, returned.map((lead) => lead.id));
    req.log.info({
      parserResults: businesses.length,
      upserted: businesses.length,
      available: available.length,
      previouslyShown: previouslyShown.size,
      returned: returned.length,
      pagesFetched,
    }, useTwoGis ? "2GIS search completed" : "OpenStreetMap search completed");
    return res.json(returned);
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