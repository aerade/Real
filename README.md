<div align="center">
  <img src="attached_assets/real-logo/real-logo-horizontal-black.svg" alt="Real" width="240">
  <h1>Real</h1>
  <p><strong>Поиск и развитие потенциальных клиентов для веб-студий</strong></p>
  <p>
    <a href="https://github.com/aerade/Real/releases/latest">Скачать последнюю версию</a>
    ·
    <a href="https://github.com/aerade/Real/releases">История релизов</a>
    ·
    <a href="https://github.com/aerade/Real/actions/workflows/real-windows-release.yml">Windows Release</a>
  </p>
</div>

---

## Что такое Real

Real — настольная CRM для студий и агентств, которые ищут компании с понятной потребностью в новом сайте.

Приложение собирает потенциальных клиентов по городу, стране и отрасли, проверяет публичные данные, оценивает качество сайта и помогает провести компанию по воронке от первого поиска до сделки.

## Возможности

- поиск компаний по России и другим регионам;
- данные из OpenStreetMap и 2ГИС без обхода CAPTCHA, авторизации и блокировок;
- фактическая проверка доступности сайта, HTTPS, скорости ответа и мобильной адаптации;
- прозрачная оценка перспективности по шкале от 0 до 100;
- карточка компании с контактами, заметками, статусом и историей работы;
- распределение лидов между менеджерами без двойного закрепления;
- панель владельца с обзором воронки, клиентов и активности;
- встроенная проверка обновлений Windows-приложения.

## Как устроен проект

| Часть | Назначение |
| --- | --- |
| `artifacts/lead-scout-desktop` | интерфейс и Windows-приложение на Electron |
| `artifacts/api-server` | API поиска, аудита сайтов, авторизации и CRM |
| `lib/db` | схема PostgreSQL и доступ к данным |
| `lib/api-spec` | OpenAPI-контракт |
| `lib/api-client-react` | типизированный React-клиент |
| `lib/api-zod` | схемы валидации и общие типы |

## Технологии

`TypeScript` · `React` · `Electron` · `Express` · `PostgreSQL` · `Drizzle ORM` · `Zod` · `pnpm`

## Быстрый старт

Требуется Node.js 24, pnpm 10 и PostgreSQL.

```bash
pnpm install
pnpm run typecheck
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/lead-scout-desktop run dev
```

Для API нужен `DATABASE_URL`. Параметры подключения к внешним источникам и адреса сервисов задаются через переменные окружения в окружении запуска.

## Проверки и сборка

```bash
pnpm run typecheck
pnpm run build
pnpm --filter @workspace/lead-scout-desktop run build:desktop
```

Windows-инсталляторы собираются workflow [Real Windows Release](.github/workflows/real-windows-release.yml) на нативном Windows runner. Тег релиза имеет формат `real-v*`.

## Обновление Windows-приложения

После установки Real периодически проверяет публичный manifest последнего релиза GitHub и предлагает установить новую версию. Для ручной установки используйте страницу [последнего релиза](https://github.com/aerade/Real/releases/latest).

## Принципы работы с данными

Real использует только публичные сведения, необходимые для поиска компаний. Сервис не обходит CAPTCHA, закрытые разделы, авторизацию или robots.txt. Оценка сайта показывает отдельные проверяемые факторы, а не скрытый итоговый балл.

## Статус

Проект активно развивается. Актуальные изменения и готовые Windows-сборки публикуются на странице [Releases](https://github.com/aerade/Real/releases).