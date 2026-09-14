# Windows-сборка Real

## Настройка

Перед выпуском укажите постоянные HTTPS-адреса в `electron/runtime-config.json`:

- `apiBaseUrl` — опубликованный API Real;
- `updateUrl` — каталог обновлений, содержащий `latest.yml`, установщик и blockmap.

Секреты в этот файл добавлять нельзя.

## Локальная сборка

```bash
pnpm --filter @workspace/lead-scout-desktop run build:desktop
```

Установщик создается в `artifacts/lead-scout-desktop/release/`.

Для гарантированной сборки используется workflow `.github/workflows/real-windows-release.yml`
на Windows runner. При ручном запуске он запрашивает опубликованный URL API, собирает
установщик и сохраняет его как артефакт `Real-Windows`.

## Автообновление

Для новой версии:

1. увеличьте `version` в `package.json`;
2. соберите релиз;
3. подпишите установщик сертификатом Authenticode;
4. загрузите `latest.yml`, `.exe` и `.blockmap` в `updateUrl`.

Приложение проверяет обновления при запуске и каждые четыре часа, загружает их в фоне и устанавливает при закрытии.