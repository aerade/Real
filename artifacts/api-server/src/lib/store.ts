import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { and, desc, eq, inArray, isNull, like, or, type SQL } from "drizzle-orm";
import {
  activitiesTable,
  countriesTable,
  db,
  leadSearchHistoryTable,
  leadsTable,
  usersTable,
  type LeadRow,
  type StoredContact,
  type UserRow,
} from "@workspace/db";
import type { PublicBusiness } from "./osm-leads";

const scrypt = promisify(nodeScrypt);

export type PublicUser = Pick<UserRow, "id" | "name" | "login" | "role" | "active">;
export type AuthUser = PublicUser;
export type LeadStatus = LeadRow["status"];

export type LeadOutput = {
  id: number;
  name: string;
  country: string;
  city: string;
  industry: string;
  website: string | null;
  status: LeadStatus;
  score: number;
  scoreReasons: string[];
  issues: string[];
  reviewsCount: number;
  rating: number | null;
  branchesCount: number;
  contacts: StoredContact[];
  source: string;
  assignee: PublicUser | null;
  note: string | null;
  updatedAt: Date;
};

type JoinedLead = {
  leads: LeadRow;
  users: UserRow | null;
};

const DEFAULT_PASSWORD = "lead2026";
const DEFAULT_COUNTRIES = [
  { code: "RU", name: "Россия", enabled: true },
  { code: "US", name: "США", enabled: true },
  { code: "DE", name: "Германия", enabled: true },
  { code: "FR", name: "Франция", enabled: true },
  { code: "NL", name: "Нидерланды", enabled: true },
  { code: "SE", name: "Швеция", enabled: true },
  { code: "GB", name: "Великобритания", enabled: true },
];

const DEFAULT_USERS = [
  { name: "Владелец", login: "owner", role: "owner" as const, active: true },
  { name: "Анна", login: "anna", role: "manager" as const, active: true },
  { name: "Максим", login: "max", role: "manager" as const, active: true },
];

const DEFAULT_LEADS = [
  {
    sourceId: "demo:1",
    name: "Сибирский Дом",
    country: "Россия",
    city: "Красноярск",
    industry: "Строительство",
    website: "http://sibdom-example.ru",
    status: "new" as const,
    score: 92,
    scoreReasons: ["Высокомаржинальная отрасль", "4 филиала", "Много свежих отзывов"],
    issues: ["Нет HTTPS", "Не адаптирован для телефона", "Устаревший дизайн", "Медленная загрузка"],
    reviewsCount: 286,
    rating: 4.7,
    branchesCount: 4,
    contacts: [
      { type: "Telegram", value: "@sibdom", url: "https://t.me/sibdom" },
      { type: "Email", value: "info@sibdom-example.ru", url: "mailto:info@sibdom-example.ru" },
    ],
    source: "Открытый бизнес-каталог",
    assigneeLogin: null,
    note: null,
  },
  {
    sourceId: "demo:2",
    name: "NordWerk Küchen",
    country: "Германия",
    city: "Берлин",
    industry: "Мебель",
    website: null,
    status: "new" as const,
    score: 88,
    scoreReasons: ["Премиальный сегмент", "Нет собственного сайта", "Высокий рейтинг"],
    issues: ["Сайт не найден", "Продажи зависят от карточек каталогов"],
    reviewsCount: 143,
    rating: 4.8,
    branchesCount: 2,
    contacts: [
      { type: "Instagram", value: "@nordwerk.kuechen", url: "https://instagram.com/nordwerk.kuechen" },
      { type: "Email", value: "hello@nordwerk.example", url: "mailto:hello@nordwerk.example" },
    ],
    source: "OpenStreetMap",
    assigneeLogin: null,
    note: null,
  },
  {
    sourceId: "demo:3",
    name: "Atelier Lumière",
    country: "Франция",
    city: "Париж",
    industry: "Дизайн интерьеров",
    website: "https://atelier-lumiere.example",
    status: "claimed" as const,
    score: 84,
    scoreReasons: ["Дорогие услуги", "Сильные отзывы", "Активные социальные сети"],
    issues: ["Медленная мобильная версия", "Устаревшая галерея", "Нет понятного призыва к действию"],
    reviewsCount: 97,
    rating: 4.6,
    branchesCount: 1,
    contacts: [{ type: "Instagram", value: "@atelierlumiere", url: "https://instagram.com/atelierlumiere" }],
    source: "Открытый отраслевой каталог",
    assigneeLogin: "anna",
    note: "Подготовить пример новой главной",
  },
  {
    sourceId: "demo:4",
    name: "Hudson Smile Studio",
    country: "США",
    city: "Нью-Йорк",
    industry: "Стоматология",
    website: "https://hudsonsmile.example",
    status: "contacted" as const,
    score: 95,
    scoreReasons: ["Высокий средний чек", "3 филиала", "Более 500 отзывов"],
    issues: ["Низкая скорость", "Сложная запись", "Дизайн не обновлялся много лет"],
    reviewsCount: 638,
    rating: 4.7,
    branchesCount: 3,
    contacts: [
      { type: "Email", value: "office@hudsonsmile.example", url: "mailto:office@hudsonsmile.example" },
      { type: "Телефон", value: "+1 212 555 0136", url: "tel:+12125550136" },
    ],
    source: "Открытый медицинский каталог",
    assigneeLogin: "max",
    note: "Письмо отправлено 12 сентября",
  },
  {
    sourceId: "demo:5",
    name: "Stockholm Legal Partners",
    country: "Швеция",
    city: "Стокгольм",
    industry: "Юридические услуги",
    website: "https://slp-example.se",
    status: "new" as const,
    score: 81,
    scoreReasons: ["Высокая стоимость услуг", "Большая команда"],
    issues: ["Плохая мобильная навигация", "Мелкий текст", "Нет онлайн-заявки"],
    reviewsCount: 54,
    rating: 4.5,
    branchesCount: 1,
    contacts: [{ type: "LinkedIn", value: "Stockholm Legal Partners", url: "https://linkedin.com" }],
    source: "Открытый реестр компаний",
    assigneeLogin: null,
    note: null,
  },
];

function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    name: user.name,
    login: user.login,
    role: user.role,
    active: user.active,
  };
}

function toLead(row: JoinedLead): LeadOutput {
  const lead = row.leads;
  return {
    id: lead.id,
    name: lead.name,
    country: lead.country,
    city: lead.city,
    industry: lead.industry,
    website: lead.website,
    status: lead.status,
    score: lead.score,
    scoreReasons: lead.scoreReasons,
    issues: lead.issues,
    reviewsCount: lead.reviewsCount,
    rating: lead.rating,
    branchesCount: lead.branchesCount,
    contacts: lead.contacts,
    source: lead.source,
    note: lead.note,
    updatedAt: lead.updatedAt,
    assignee: row.users ? toPublicUser(row.users) : null,
  };
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [salt, expectedHex] = encoded.split(":");
  if (!salt || !expectedHex) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function initializeDatabase(): Promise<void> {
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);

  await db.insert(usersTable).values(
    DEFAULT_USERS.map((user) => ({ ...user, passwordHash })),
  ).onConflictDoNothing({ target: usersTable.login });

  await db.insert(countriesTable).values(DEFAULT_COUNTRIES).onConflictDoNothing({ target: countriesTable.code });

  // Keep the dashboard limited to live data. These are the only known demo rows
  // and demo activities; searched clients and user-generated activity are preserved.
  await db.delete(leadsTable).where(like(leadsTable.sourceId, "demo:%"));
  // Remove only unassigned OSM results created by the old fallback search.
  // Claimed or updated records remain available as user history.
  await db.delete(leadsTable).where(and(
    like(leadsTable.sourceId, "osm:%"),
    eq(leadsTable.status, "new"),
    isNull(leadsTable.assigneeId),
  ));
  await db.delete(activitiesTable).where(or(
    eq(activitiesTable.text, "Анна взяла в работу Atelier Lumière"),
    eq(activitiesTable.text, "Максим написал Hudson Smile Studio"),
  ));
}

export async function authenticate(login: string, password: string): Promise<PublicUser | null> {
  const user = await db.select().from(usersTable)
    .where(and(eq(usersTable.login, login), eq(usersTable.active, true)))
    .limit(1);
  if (!user[0] || !(await verifyPassword(password, user[0].passwordHash))) return null;
  return toPublicUser(user[0]);
}

export async function getUserById(id: number): Promise<PublicUser | null> {
  const user = await db.select().from(usersTable)
    .where(and(eq(usersTable.id, id), eq(usersTable.active, true)))
    .limit(1);
  return user[0] ? toPublicUser(user[0]) : null;
}

export async function listUsers(): Promise<PublicUser[]> {
  const users = await db.select().from(usersTable).orderBy(usersTable.id);
  return users.map(toPublicUser);
}

export async function listCountries() {
  return db.select().from(countriesTable).orderBy(countriesTable.name);
}

export async function createCountry(code: string, name: string) {
  const inserted = await db.insert(countriesTable)
    .values({ code, name, enabled: true })
    .onConflictDoNothing({ target: countriesTable.code })
    .returning();
  return inserted[0] ?? null;
}

async function queryLeads(conditions: SQL<unknown>[] = []): Promise<LeadOutput[]> {
  const query = db.select().from(leadsTable).leftJoin(usersTable, eq(leadsTable.assigneeId, usersTable.id));
  const rows = conditions.length
    ? await query.where(and(...conditions)).orderBy(desc(leadsTable.score))
    : await query.orderBy(desc(leadsTable.score));
  return rows.map(toLead);
}

export async function listLeads(user: AuthUser, status?: string, assignedToMe = false): Promise<LeadOutput[]> {
  const conditions: SQL<unknown>[] = [];
  if (user.role !== "owner") {
    conditions.push(or(isNull(leadsTable.assigneeId), eq(leadsTable.assigneeId, user.id))!);
  }
  if (status) conditions.push(eq(leadsTable.status, status as LeadStatus));
  if (assignedToMe) conditions.push(eq(leadsTable.assigneeId, user.id));
  return queryLeads(conditions);
}

export async function getLead(id: number): Promise<LeadOutput | null> {
  const rows = await db.select().from(leadsTable)
    .leftJoin(usersTable, eq(leadsTable.assigneeId, usersTable.id))
    .where(eq(leadsTable.id, id))
    .limit(1);
  return rows[0] ? toLead(rows[0]) : null;
}

export async function upsertSearchedLead(
  business: PublicBusiness,
  country: string,
  city: string,
): Promise<LeadOutput> {
  const inserted = await db.insert(leadsTable).values({
    sourceId: business.sourceId,
    name: business.name,
    country: country === "any" ? "" : country,
    city: business.city || city,
    industry: business.industry,
    website: business.website,
    status: "new",
    score: business.score,
    scoreReasons: business.scoreReasons,
    issues: business.issues,
    reviewsCount: business.reviewsCount ?? 0,
    rating: business.rating ?? null,
    branchesCount: 1,
    contacts: business.contacts,
    source: business.source ?? "OpenStreetMap",
    assigneeId: null,
    note: null,
  }).onConflictDoUpdate({
    target: leadsTable.sourceId,
    set: {
      name: business.name,
      country: country === "any" ? "" : country,
      city: business.city || city,
      industry: business.industry,
      website: business.website,
      score: business.score,
      scoreReasons: business.scoreReasons,
      issues: business.issues,
      reviewsCount: business.reviewsCount ?? 0,
      rating: business.rating ?? null,
      branchesCount: 1,
      contacts: business.contacts,
      source: business.source ?? "OpenStreetMap",
      updatedAt: new Date(),
    },
  }).returning({ id: leadsTable.id });

  const id = inserted[0]?.id ?? (await db.select({ id: leadsTable.id }).from(leadsTable)
    .where(eq(leadsTable.sourceId, business.sourceId)).limit(1))[0]?.id;
  if (!id) throw new Error("Не удалось сохранить найденного клиента");

  return (await getLead(id))!;
}

export async function getPreviouslyShownLeadIds(userId: number, leadIds: number[]): Promise<Set<number>> {
  if (leadIds.length === 0) return new Set();
  const rows = await db.select({ leadId: leadSearchHistoryTable.leadId })
    .from(leadSearchHistoryTable)
    .where(and(
      eq(leadSearchHistoryTable.userId, userId),
      inArray(leadSearchHistoryTable.leadId, leadIds),
    ));
  return new Set(rows.map((row) => row.leadId));
}

export async function recordShownLeads(userId: number, leadIds: number[]): Promise<void> {
  if (leadIds.length === 0) return;
  const now = new Date();
  await db.insert(leadSearchHistoryTable).values(
    leadIds.map((leadId) => ({
      userId,
      leadId,
      firstSeenAt: now,
      lastSeenAt: now,
    })),
  ).onConflictDoUpdate({
    target: [leadSearchHistoryTable.userId, leadSearchHistoryTable.leadId],
    set: { lastSeenAt: now },
  });
}

export async function getDashboard(user: AuthUser) {
  const visible = await listLeads(user);
  const mine = await listLeads(user, undefined, true);
  const statuses: LeadStatus[] = ["new", "claimed", "contacted", "replied", "rejected", "no_reply", "deal"];
  const recentQuery = db.select().from(activitiesTable)
    .orderBy(desc(activitiesTable.at))
    .limit(8);
  const recent = user.role === "owner"
    ? await recentQuery
    : await recentQuery.where(eq(activitiesTable.userId, user.id));

  return {
    available: visible.filter((lead) => lead.status === "new" && !lead.assignee).length,
    inWork: mine.filter((lead) => ["claimed", "contacted"].includes(lead.status)).length,
    replies: mine.filter((lead) => lead.status === "replied").length,
    deals: mine.filter((lead) => lead.status === "deal").length,
    stages: statuses.map((status) => ({
      status,
      count: mine.filter((lead) => lead.status === status).length,
    })),
    recent: recent.map((activity) => ({ id: activity.id, text: activity.text, at: activity.at })),
  };
}

export async function claimLead(id: number, user: AuthUser): Promise<"missing" | "conflict" | "ok"> {
  return db.transaction(async (tx) => {
    const target = await tx.select().from(leadsTable).where(eq(leadsTable.id, id)).limit(1);
    if (!target[0]) return "missing";

    const updated = await tx.update(leadsTable)
      .set({ assigneeId: user.id, status: "claimed", updatedAt: new Date() })
      .where(and(
        eq(leadsTable.id, id),
        or(isNull(leadsTable.assigneeId), eq(leadsTable.assigneeId, user.id)),
      ))
      .returning({ id: leadsTable.id });

    if (!updated[0]) return "conflict";

    await tx.insert(activitiesTable).values({
      text: `${user.name} взял(а) в работу ${target[0].name}`,
      userId: user.id,
    });
    return "ok";
  });
}

export async function updateLead(
  id: number,
  user: AuthUser,
  data: { status?: LeadStatus; note?: string },
): Promise<"missing" | "forbidden" | "ok"> {
  return db.transaction(async (tx) => {
    const target = await tx.select().from(leadsTable).where(eq(leadsTable.id, id)).limit(1);
    if (!target[0]) return "missing";
    if (target[0].assigneeId !== user.id && user.role !== "owner") return "forbidden";

    const changes: Partial<LeadRow> = { updatedAt: new Date() };
    if (data.status !== undefined) changes.status = data.status;
    if (data.note !== undefined) changes.note = data.note;
    await tx.update(leadsTable).set(changes).where(eq(leadsTable.id, id));
    await tx.insert(activitiesTable).values({
      text: `${user.name}: ${target[0].name} — ${data.status ?? target[0].status}`,
      userId: user.id,
    });
    return "ok";
  });
}