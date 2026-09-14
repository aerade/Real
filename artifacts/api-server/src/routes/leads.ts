import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { searchPublicBusinesses } from "../lib/osm-leads";

type Role = "owner" | "manager";
type Status = "new" | "claimed" | "contacted" | "replied" | "rejected" | "no_reply" | "deal";
type User = { id: number; name: string; login: string; role: Role; active: boolean };
type Contact = { type: string; value: string; url: string };
type Lead = {
  id: number;
  name: string;
  country: string;
  city: string;
  industry: string;
  website: string | null;
  status: Status;
  score: number;
  scoreReasons: string[];
  issues: string[];
  reviewsCount: number;
  rating: number | null;
  branchesCount: number;
  contacts: Contact[];
  source: string;
  assignee: User | null;
  note: string | null;
  updatedAt: string;
};

const router: IRouter = Router();
const users: User[] = [
  { id: 1, name: "Владелец", login: "owner", role: "owner", active: true },
  { id: 2, name: "Анна", login: "anna", role: "manager", active: true },
  { id: 3, name: "Максим", login: "max", role: "manager", active: true },
];
const countries = [
  { code: "RU", name: "Россия", enabled: true },
  { code: "US", name: "США", enabled: true },
  { code: "DE", name: "Германия", enabled: true },
  { code: "FR", name: "Франция", enabled: true },
  { code: "NL", name: "Нидерланды", enabled: true },
  { code: "SE", name: "Швеция", enabled: true },
  { code: "GB", name: "Великобритания", enabled: true },
];

const now = () => new Date().toISOString();
const externalLeadIds = new Map<string, number>();
let nextLeadId = 10_000;
const leads: Lead[] = [
  {
    id: 1, name: "Сибирский Дом", country: "Россия", city: "Красноярск", industry: "Строительство",
    website: "http://sibdom-example.ru", status: "new", score: 92,
    scoreReasons: ["Высокомаржинальная отрасль", "4 филиала", "Много свежих отзывов"],
    issues: ["Нет HTTPS", "Не адаптирован для телефона", "Устаревший дизайн", "Медленная загрузка"],
    reviewsCount: 286, rating: 4.7, branchesCount: 4,
    contacts: [{ type: "Telegram", value: "@sibdom", url: "https://t.me/sibdom" }, { type: "Email", value: "info@sibdom-example.ru", url: "mailto:info@sibdom-example.ru" }],
    source: "Открытый бизнес-каталог", assignee: null, note: null, updatedAt: now(),
  },
  {
    id: 2, name: "NordWerk Küchen", country: "Германия", city: "Берлин", industry: "Мебель",
    website: null, status: "new", score: 88,
    scoreReasons: ["Премиальный сегмент", "Нет собственного сайта", "Высокий рейтинг"],
    issues: ["Сайт не найден", "Продажи зависят от карточек каталогов"],
    reviewsCount: 143, rating: 4.8, branchesCount: 2,
    contacts: [{ type: "Instagram", value: "@nordwerk.kuechen", url: "https://instagram.com/nordwerk.kuechen" }, { type: "Email", value: "hello@nordwerk.example", url: "mailto:hello@nordwerk.example" }],
    source: "OpenStreetMap", assignee: null, note: null, updatedAt: now(),
  },
  {
    id: 3, name: "Atelier Lumière", country: "Франция", city: "Париж", industry: "Дизайн интерьеров",
    website: "https://atelier-lumiere.example", status: "claimed", score: 84,
    scoreReasons: ["Дорогие услуги", "Сильные отзывы", "Активные социальные сети"],
    issues: ["Медленная мобильная версия", "Устаревшая галерея", "Нет понятного призыва к действию"],
    reviewsCount: 97, rating: 4.6, branchesCount: 1,
    contacts: [{ type: "Instagram", value: "@atelierlumiere", url: "https://instagram.com/atelierlumiere" }],
    source: "Открытый отраслевой каталог", assignee: users[1]!, note: "Подготовить пример новой главной", updatedAt: now(),
  },
  {
    id: 4, name: "Hudson Smile Studio", country: "США", city: "Нью-Йорк", industry: "Стоматология",
    website: "https://hudsonsmile.example", status: "contacted", score: 95,
    scoreReasons: ["Высокий средний чек", "3 филиала", "Более 500 отзывов"],
    issues: ["Низкая скорость", "Сложная запись", "Дизайн не обновлялся много лет"],
    reviewsCount: 638, rating: 4.7, branchesCount: 3,
    contacts: [{ type: "Email", value: "office@hudsonsmile.example", url: "mailto:office@hudsonsmile.example" }, { type: "Телефон", value: "+1 212 555 0136", url: "tel:+12125550136" }],
    source: "Открытый медицинский каталог", assignee: users[2]!, note: "Письмо отправлено 12 сентября", updatedAt: now(),
  },
  {
    id: 5, name: "Stockholm Legal Partners", country: "Швеция", city: "Стокгольм", industry: "Юридические услуги",
    website: "https://slp-example.se", status: "new", score: 81,
    scoreReasons: ["Высокая стоимость услуг", "Большая команда"],
    issues: ["Плохая мобильная навигация", "Мелкий текст", "Нет онлайн-заявки"],
    reviewsCount: 54, rating: 4.5, branchesCount: 1,
    contacts: [{ type: "LinkedIn", value: "Stockholm Legal Partners", url: "https://linkedin.com" }],
    source: "Открытый реестр компаний", assignee: null, note: null, updatedAt: now(),
  },
];
const activities: { id: number; text: string; at: string }[] = [
  { id: 1, text: "Анна взяла в работу Atelier Lumière", at: now() },
  { id: 2, text: "Максим написал Hudson Smile Studio", at: now() },
];

function getUser(req: Request): User | null {
  const id = Number(req.cookies?.lead_scout_user);
  return users.find((u) => u.id === id && u.active) ?? null;
}

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!getUser(req)) {
    res.status(401).json({ error: "Требуется вход" });
    return;
  }
  next();
}

router.post("/auth/login", (req, res) => {
  const user = users.find((item) => item.login === req.body?.login && item.active);
  if (!user || req.body?.password !== "lead2026") return res.status(401).json({ error: "Неверный логин или пароль" });
  res.cookie("lead_scout_user", String(user.id), { httpOnly: true, sameSite: "lax", maxAge: 30 * 24 * 60 * 60 * 1000 });
  return res.json({ authenticated: true, user });
});

router.get("/auth/session", (req, res) => {
  const user = getUser(req);
  res.json({ authenticated: Boolean(user), user });
});

router.post("/auth/logout", (_req, res) => {
  res.clearCookie("lead_scout_user");
  res.status(204).send();
});

router.get("/countries", (_req, res) => res.json(countries));
router.use(requireAuth);

router.get("/dashboard", (req, res) => {
  const user = getUser(req)!;
  const visible = user.role === "owner" ? leads : leads.filter((l) => !l.assignee || l.assignee.id === user.id);
  const stages = ["new", "claimed", "contacted", "replied", "rejected", "no_reply", "deal"].map((status) => ({
    status, count: visible.filter((lead) => lead.status === status).length,
  }));
  res.json({
    available: visible.filter((lead) => lead.status === "new").length,
    inWork: visible.filter((lead) => ["claimed", "contacted"].includes(lead.status)).length,
    replies: visible.filter((lead) => lead.status === "replied").length,
    deals: visible.filter((lead) => lead.status === "deal").length,
    stages,
    recent: activities.slice(0, 8),
  });
});

router.get("/leads", (req, res) => {
  const user = getUser(req)!;
  let result = user.role === "owner" ? [...leads] : leads.filter((l) => !l.assignee || l.assignee.id === user.id);
  if (req.query.status) result = result.filter((lead) => lead.status === req.query.status);
  if (req.query.assignedToMe === "true") result = result.filter((lead) => lead.assignee?.id === user.id);
  res.json(result.sort((a, b) => b.score - a.score));
});

router.post("/leads/search", async (req, res) => {
  const country = String(req.body?.country ?? "").trim();
  const city = String(req.body?.city ?? "").trim();
  const industry = String(req.body?.industry ?? "").trim();
  if (!country && !city) return res.status(400).json({ error: "Укажите город или страну" });

  try {
    const businesses = await searchPublicBusinesses({ country, city, industry });
    const found = businesses.map((business) => {
      let id = externalLeadIds.get(business.sourceId);
      if (!id) {
        id = nextLeadId++;
        externalLeadIds.set(business.sourceId, id);
      }

      const existing = leads.find((lead) => lead.id === id);
      if (existing) return existing;

      const lead: Lead = {
        id,
        name: business.name,
        country: country === "any" ? "" : country,
        city: business.city || city,
        industry: business.industry,
        website: business.website,
        status: "new",
        score: business.score,
        scoreReasons: business.scoreReasons,
        issues: business.issues,
        reviewsCount: 0,
        rating: null,
        branchesCount: 1,
        contacts: business.contacts,
        source: "OpenStreetMap",
        assignee: null,
        note: null,
        updatedAt: now(),
      };
      leads.push(lead);
      return lead;
    });

    return res.json(found.filter((lead) => lead.status === "new" && !lead.assignee).slice(0, 20));
  } catch (error) {
    req.log.error({ err: error }, "Public lead search failed");
    return res.status(502).json({ error: error instanceof Error ? error.message : "Источник поиска временно недоступен" });
  }
});

router.get("/leads/:id", (req, res) => {
  const lead = leads.find((item) => item.id === Number(req.params.id));
  if (!lead) return res.status(404).json({ error: "Компания не найдена" });
  return res.json(lead);
});

router.post("/leads/:id/claim", (req, res) => {
  const user = getUser(req)!;
  const lead = leads.find((item) => item.id === Number(req.params.id));
  if (!lead) return res.status(404).json({ error: "Компания не найдена" });
  if (lead.assignee && lead.assignee.id !== user.id) return res.status(409).json({ error: "Компания уже взята другим пользователем" });
  lead.assignee = user;
  lead.status = "claimed";
  lead.updatedAt = now();
  activities.unshift({ id: Date.now(), text: `${user.name} взял(а) в работу ${lead.name}`, at: lead.updatedAt });
  return res.json(lead);
});

router.patch("/leads/:id", (req, res) => {
  const user = getUser(req)!;
  const lead = leads.find((item) => item.id === Number(req.params.id));
  if (!lead) return res.status(404).json({ error: "Компания не найдена" });
  if (lead.assignee?.id !== user.id && user.role !== "owner") return res.status(403).json({ error: "Компания закреплена за другим пользователем" });
  if (req.body?.status) lead.status = req.body.status as Status;
  if (typeof req.body?.note === "string") lead.note = req.body.note;
  lead.updatedAt = now();
  activities.unshift({ id: Date.now(), text: `${user.name}: ${lead.name} — ${lead.status}`, at: lead.updatedAt });
  return res.json(lead);
});

router.get("/users", (req, res) => {
  if (getUser(req)?.role !== "owner") return res.status(403).json({ error: "Только для владельца" });
  return res.json(users);
});

router.post("/countries", (req, res) => {
  if (getUser(req)?.role !== "owner") return res.status(403).json({ error: "Только для владельца" });
  const country = { code: String(req.body?.code ?? "").toUpperCase(), name: String(req.body?.name ?? ""), enabled: true };
  if (!country.code || !country.name) return res.status(400).json({ error: "Заполните код и название" });
  countries.push(country);
  return res.status(201).json(country);
});

export default router;