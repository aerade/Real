import type { PublicBusiness } from "./osm-leads";

export const SCORE_VERSION = "opportunity-v3";

export type AuditCheckStatus = "pass" | "warn" | "fail" | "unknown";

export type WebsiteAuditCheck = {
  key: string;
  label: string;
  status: AuditCheckStatus;
  evidence: string;
};

export type WebsiteAudit = {
  status: "checked" | "unavailable" | "not_provided";
  url: string | null;
  finalUrl: string | null;
  checkedAt: string | null;
  responseTimeMs: number | null;
  statusCode: number | null;
  pageSizeKb: number | null;
  qualityScore: number | null;
  title: string | null;
  metaDescription: string | null;
  hasMobileViewport: boolean | null;
  checks: WebsiteAuditCheck[];
  error: string | null;
};

export type ScoreFactor = {
  key: string;
  label: string;
  category: "market" | "contactability" | "opportunity" | "website";
  points: number;
  maxPoints: number;
  evidence: string;
};

const AUDIT_TIMEOUT_MS = 7_000;
const MAX_HTML_BYTES = 1_500_000;

function cleanText(value: string | undefined, maxLength = 180): string | null {
  const cleaned = value?.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

function readMeta(html: string, name: string): string | null {
  const pattern = new RegExp(
    `<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']*)["'][^>]*>`,
    "i",
  );
  const reversePattern = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${name}["'][^>]*>`,
    "i",
  );
  return cleanText(pattern.exec(html)?.[1] ?? reversePattern.exec(html)?.[1]);
}

async function readLimitedBody(response: Response): Promise<{ html: string; bytes: number }> {
  if (!response.body) {
    const html = await response.text();
    return { html: html.slice(0, MAX_HTML_BYTES), bytes: Buffer.byteLength(html) };
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (bytes < MAX_HTML_BYTES) {
      const next = await reader.read();
      if (next.done) break;
      if (!next.value) continue;
      const remaining = MAX_HTML_BYTES - bytes;
      const chunk = next.value.byteLength > remaining ? next.value.slice(0, remaining) : next.value;
      chunks.push(chunk);
      bytes += chunk.byteLength;
      if (chunk.byteLength < next.value.byteLength) break;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  const merged = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { html: Buffer.from(merged).toString("utf8"), bytes };
}

function unavailableAudit(url: string | null, error: string): WebsiteAudit {
  return {
    status: url ? "unavailable" : "not_provided",
    url,
    finalUrl: null,
    checkedAt: null,
    responseTimeMs: null,
    statusCode: null,
    pageSizeKb: null,
    qualityScore: null,
    title: null,
    metaDescription: null,
    hasMobileViewport: null,
    checks: [],
    error,
  };
}

export async function auditWebsite(url: string | null): Promise<WebsiteAudit> {
  if (!url) return unavailableAudit(null, "Сайт не указан");

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return unavailableAudit(url, "Некорректный адрес сайта");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return unavailableAudit(url, "Поддерживаются только HTTP и HTTPS");
  }

  const startedAt = performance.now();
  try {
    const response = await fetch(parsed, {
      redirect: "follow",
      headers: {
        "User-Agent": "RealLeadScout/2.0 website-audit",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(AUDIT_TIMEOUT_MS),
    });
    const responseTimeMs = Math.round(performance.now() - startedAt);
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_HTML_BYTES) {
      return {
        ...unavailableAudit(url, "Страница слишком большая для быстрой проверки"),
        status: "checked",
        finalUrl: response.url || url,
        checkedAt: new Date().toISOString(),
        responseTimeMs,
        statusCode: response.status,
        checks: [{
          key: "page-size",
          label: "Размер страницы",
          status: "fail",
          evidence: `Больше ${Math.round(MAX_HTML_BYTES / 1_000)} КБ`,
        }],
      };
    }

    const body = contentType.includes("html")
      ? await readLimitedBody(response)
      : { html: "", bytes: contentLength };
    const title = cleanText(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(body.html)?.[1]);
    const metaDescription = readMeta(body.html, "description");
    const hasMobileViewport = /<meta[^>]+name=["']viewport["'][^>]*>/i.test(body.html);
    const finalUrl = response.url || url;
    const checks: WebsiteAuditCheck[] = [
      {
        key: "availability",
        label: "Доступность",
        status: response.ok ? "pass" : "fail",
        evidence: response.ok ? `HTTP ${response.status}` : `HTTP ${response.status}`,
      },
      {
        key: "https",
        label: "HTTPS",
        status: finalUrl.startsWith("https://") ? "pass" : "warn",
        evidence: finalUrl.startsWith("https://") ? "Соединение защищено" : "Сайт работает без HTTPS",
      },
      {
        key: "response-time",
        label: "Время ответа",
        status: responseTimeMs <= 800 ? "pass" : responseTimeMs <= 1_800 ? "warn" : "fail",
        evidence: `${responseTimeMs} мс до первого ответа`,
      },
      {
        key: "mobile",
        label: "Мобильная версия",
        status: contentType.includes("html") ? (hasMobileViewport ? "pass" : "warn") : "unknown",
        evidence: contentType.includes("html")
          ? (hasMobileViewport ? "Viewport настроен" : "Viewport не найден")
          : "HTML не проверен",
      },
      {
        key: "title",
        label: "Заголовок страницы",
        status: title ? "pass" : "warn",
        evidence: title ? `«${title}»` : "Title не найден",
      },
      {
        key: "description",
        label: "Описание страницы",
        status: metaDescription ? "pass" : "warn",
        evidence: metaDescription ? "Meta description найден" : "Meta description не найден",
      },
    ];
    const passed = checks.filter((check) => check.status === "pass").length;
    const qualityScore = Math.round((passed / checks.length) * 100);
    return {
      status: "checked",
      url,
      finalUrl,
      checkedAt: new Date().toISOString(),
      responseTimeMs,
      statusCode: response.status,
      pageSizeKb: Math.max(1, Math.round(body.bytes / 1_000)),
      qualityScore,
      title,
      metaDescription,
      hasMobileViewport,
      checks,
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error && error.name === "TimeoutError"
      ? "Проверка превысила 7 секунд"
      : "Сайт не ответил на проверочный запрос";
    return unavailableAudit(url, message);
  }
}

function websiteFactors(audit: WebsiteAudit): ScoreFactor[] {
  if (audit.status === "not_provided") {
    return [{
      key: "website-opportunity",
      label: "Сайта нет",
      category: "opportunity",
      points: 40,
      maxPoints: 40,
      evidence: "Максимальный потенциал: компании нужен первый сайт",
    }];
  }
  if (audit.status === "unavailable") {
    return [{
      key: "website-opportunity",
      label: "Сайт не подтверждён",
      category: "opportunity",
      points: 30,
      maxPoints: 40,
      evidence: audit.error ?? "Сайт не ответил",
    }];
  }
  const failingChecks = audit.checks.filter((check) => check.status === "fail").length;
  const warningChecks = audit.checks.filter((check) => check.status === "warn").length;
  const points = Math.min(40, failingChecks * 12 + warningChecks * 6);
  return [{
    key: "website-opportunity",
    label: "Потенциал улучшения сайта",
    category: "opportunity",
    points,
    maxPoints: 40,
    evidence: points > 0 ? `${failingChecks} критичных и ${warningChecks} заметных сигналов` : "Критичных сигналов не найдено",
  }];
}

export function scoreBusiness(business: PublicBusiness, audit: WebsiteAudit): {
  score: number;
  scoreReasons: string[];
  issues: string[];
  scoreBreakdown: ScoreFactor[];
} {
  const reviewPoints = business.rating
    ? Math.min(25, Math.round(business.rating * 5))
    : 0;
  const reviewConfidence = business.reviewsCount
    ? Math.min(15, Math.round(Math.log10(business.reviewsCount + 1) * 5))
    : 0;
  const directContacts = business.contacts.filter((contact) => {
    const type = contact.type.toLowerCase();
    return !type.includes("сайт") && !type.includes("website") && !type.includes("site");
  });
  const contactPoints = Math.min(20, directContacts.length * 5);
  const factors: ScoreFactor[] = [
    {
      key: "market-rating",
      label: "Рейтинг",
      category: "market",
      points: reviewPoints,
      maxPoints: 25,
      evidence: business.rating ? `Рейтинг ${business.rating.toFixed(1)} из 5` : "Рейтинг не указан",
    },
    {
      key: "market-proof",
      label: "Отзывы",
      category: "market",
      points: reviewConfidence,
      maxPoints: 15,
      evidence: business.reviewsCount ? `${business.reviewsCount} отзывов` : "Количество отзывов не указано",
    },
    {
      key: "contactability",
      label: "Контакты",
      category: "contactability",
      points: contactPoints,
      maxPoints: 20,
      evidence: directContacts.length ? `${directContacts.length} прямых публичных контакта` : "Телефон, email или соцсети не найдены",
    },
    ...websiteFactors(audit),
  ];
  const score = Math.min(100, Math.max(0, factors.reduce((total, factor) => total + factor.points, 0)));
  const issues = audit.status === "checked"
    ? audit.checks.filter((check) => check.status === "fail" || check.status === "warn").map((check) => `${check.label}: ${check.evidence}`)
    : audit.status === "not_provided"
      ? ["Сайт не указан"]
      : [audit.error ?? "Сайт не удалось проверить"];
  const scoreReasons = factors
    .filter((factor) => factor.points > 0)
    .map((factor) => `${factor.label}: +${factor.points} · ${factor.evidence}`);
  return { score, scoreReasons, issues, scoreBreakdown: factors };
}

export async function auditAndScoreBusinesses(businesses: PublicBusiness[]): Promise<PublicBusiness[]> {
  const results: PublicBusiness[] = [];
  for (let index = 0; index < businesses.length; index += 3) {
    const batch = businesses.slice(index, index + 3);
    const audited = await Promise.all(batch.map(async (business) => {
      const websiteAudit = await auditWebsite(business.website);
      const scored = scoreBusiness(business, websiteAudit);
      return {
        ...business,
        ...scored,
        websiteAudit,
        scoreVersion: SCORE_VERSION,
      };
    }));
    results.push(...audited);
  }
  return results;
}