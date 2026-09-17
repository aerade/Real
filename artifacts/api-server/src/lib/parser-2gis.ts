import { spawn } from "node:child_process";
import { accessSync, constants, readdirSync } from "node:fs";
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
  name_ex?: {
    primary?: string;
    short_name?: string;
    extension?: string;
  };
  org?: {
    name?: string;
    branch_count?: number;
  };
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
  const configuredRoot = process.env.REAL_PARSER_CWD?.trim();
  if (configuredRoot) return configuredRoot;
  const anchors = [
    process.cwd(),
    path.dirname(process.argv[1] ?? ""),
  ].filter(Boolean);
  for (const anchor of anchors) {
    let current = path.resolve(anchor);
    while (current !== path.dirname(current)) {
      try {
        accessSync(path.join(current, "pyproject.toml"), constants.R_OK);
        return current;
      } catch {
        current = path.dirname(current);
      }
    }
  }
  return process.cwd();
}

function parserEnvironment(binaryPath: string | null, cwd: string): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    HOME: cwd,
    XDG_CACHE_HOME: path.join(cwd, ".cache"),
    PYTHONUNBUFFERED: "1",
  };
  if (!binaryPath?.startsWith("/snap/chromium/")) return environment;
  delete environment.DBUS_SESSION_BUS_ADDRESS;
  delete environment.DISPLAY;

  const snapRoot = binaryPath.split("/usr/")[0];
  const libraryPaths = [
    "/var/lib/snapd/lib/gl",
    "/var/lib/snapd/lib/gl32",
    path.join(snapRoot, "usr", "lib", "chromium-browser"),
    path.join(snapRoot, "usr", "lib", "x86_64-linux-gnu"),
    path.join(snapRoot, "lib", "x86_64-linux-gnu"),
    path.join(snapRoot, "usr", "lib"),
    path.join(snapRoot, "lib"),
    path.join(snapRoot, "gpu-2404", "usr", "lib", "x86_64-linux-gnu"),
    path.join(snapRoot, "gpu-2404", "usr", "lib", "x86_64-linux-gnu", "dri"),
    path.join(snapRoot, "gnome-platform", "lib", "x86_64-linux-gnu"),
    path.join(snapRoot, "gnome-platform", "usr", "lib", "x86_64-linux-gnu"),
    "/usr/lib/x86_64-linux-gnu",
    "/lib/x86_64-linux-gnu",
    "/usr/lib",
    "/lib",
    environment.LD_LIBRARY_PATH,
  ].filter((value): value is string => Boolean(value));
  environment.SNAP = snapRoot;
  environment.LD_LIBRARY_PATH = [...new Set(libraryPaths)].join(path.delimiter);
  return environment;
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
  const name = item.name?.trim()
    || item.name_ex?.primary?.trim()
    || item.name_ex?.short_name?.trim()
    || item.org?.name?.trim();
  if (!item.id || !name) return null;
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
    name,
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
    branchesCount: Math.max(1, item.org?.branch_count ?? 1),
    source: "2ГИС",
  };
}

async function findChromeBinary(): Promise<string | null> {
  const configured = process.env.REAL_CHROME_BINARY?.trim();
  const snapChromiumCandidates = (() => {
    try {
      const revisions = readdirSync("/snap/chromium", { withFileTypes: true })
        .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
        .map((entry) => entry.name)
        .sort((left, right) => (left === "current" ? -1 : right === "current" ? 1 : right.localeCompare(left)));
      return revisions.flatMap((revision) => [
        path.join("/snap/chromium", revision, "usr", "lib", "chromium", "chromium"),
        path.join("/snap/chromium", revision, "usr", "lib", "chromium", "chrome"),
        path.join("/snap/chromium", revision, "usr", "lib", "chromium", "chromium-browser"),
        path.join("/snap/chromium", revision, "usr", "lib", "chromium-browser", "chrome"),
        path.join("/snap/chromium", revision, "usr", "lib", "chromium-browser", "chromium-browser"),
      ]);
    } catch {
      return [];
    }
  })();
  const candidates = [
    ...snapChromiumCandidates,
    configured,
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/repl/tools/bin/chromium",
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    if (path.isAbsolute(candidate)) {
      try {
        accessSync(candidate, constants.X_OK);
        return candidate;
      } catch {
        continue;
      }
    }

    const command = process.platform === "win32" ? "where" : "which";
    try {
      const resolved = await new Promise<string>((resolve, reject) => {
        const child = spawn(command, [candidate], { stdio: ["ignore", "pipe", "ignore"] });
        let stdout = "";
        child.stdout?.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
        child.once("error", reject);
        child.once("close", (code) => code === 0 && stdout.trim() ? resolve(stdout.trim().split(/\r?\n/)[0]) : reject(new Error("not found")));
      });
      if (resolved) return resolved;
    } catch {
      continue;
    }
  }

  return null;
}

async function findParserCommand(): Promise<string> {
  const configured = process.env.REAL_PARSER_COMMAND?.trim();
  const projectRoot = findProjectRoot();
  const candidates = [
    configured,
    path.join(projectRoot, ".venv", "bin", "python"),
    "/opt/real/.venv/bin/python",
    "/root/.local/bin/uv",
    "/usr/local/bin/uv",
    "/usr/bin/uv",
    "uv",
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    if (path.isAbsolute(candidate)) {
      try {
        accessSync(candidate, constants.X_OK);
        return candidate;
      } catch {
        continue;
      }
    }

    const command = process.platform === "win32" ? "where" : "which";
    try {
      const resolved = await new Promise<string>((resolve, reject) => {
        const child = spawn(command, [candidate], { stdio: ["ignore", "pipe", "ignore"] });
        let stdout = "";
        child.stdout?.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
        child.once("error", reject);
        child.once("close", (code) => code === 0 && stdout.trim() ? resolve(stdout.trim().split(/\r?\n/)[0]) : reject(new Error("not found")));
      });
      if (resolved) return resolved;
    } catch {
      continue;
    }
  }

  return "uv";
}

async function runParser(url: string, outputPath: string): Promise<void> {
  const binaryPath = await findChromeBinary();
  const parserCommand = await findParserCommand();
  const cwd = findProjectRoot();
  const parserName = path.basename(parserCommand);
  const runnerPath = path.join(cwd, "tools", "parser-2gis-runner.py");
  const commandArgs = parserName === "uv"
    ? ["run", "python", path.join(cwd, "tools", "parser-2gis-runner.py")]
    : [runnerPath];
  const args = [
    ...commandArgs,
    "-i", url,
    "-o", outputPath,
    "-f", "json",
    "--parser.max-records", "5",
    "--chrome.headless", "yes",
    "--chrome.silent-browser", "yes",
  ];
  if (binaryPath) args.push("--chrome.binary_path", binaryPath);

  await new Promise<void>((resolve, reject) => {
    const child = spawn(parserCommand, args, {
      cwd,
      detached: process.platform !== "win32",
      env: parserEnvironment(binaryPath, cwd),
      stdio: ["ignore", "ignore", "pipe"],
    });
    const terminate = () => {
      if (child.pid && process.platform !== "win32") {
        try {
          process.kill(-child.pid, "SIGTERM");
          return;
        } catch {
          // Fall back to terminating the direct child below.
        }
      }
      child.kill("SIGTERM");
    };
    let stderr = "";
    const timer = setTimeout(() => {
      terminate();
      const details = stderr.trim();
      reject(new Error(
        `2ГИС-поиск превысил лимит ожидания ${PARSER_TIMEOUT_MS / 1_000} секунд${details ? `: ${details}` : ""}`,
      ));
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
        reject(new Error(`2ГИС-парсер завершился с кодом ${code ?? "unknown"} (cwd: ${cwd}${binaryPath ? `, browser: ${binaryPath}` : ""})${stderr ? `: ${stderr.trim()}` : ""}`));
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