# Windows-сборка Real

## Настройка

Перед выпуском укажите постоянные HTTPS-адреса в `electron/runtime-config.json`:

- `apiBaseUrl` — опубликованный API Real;
- `updateUrl` — каталог обновлений, содержащий `real-update.json` и custom installer `.exe`.

Секреты в этот файл добавлять нельзя.

## Локальная сборка

```bash
pnpm --filter @workspace/lead-scout-desktop run build:desktop
```

В `artifacts/lead-scout-desktop/release/` создаются unpacked payload приложения и
самостоятельный `Real-Installer-*.exe` с собственной Electron UI. Это не NSIS и не
стандартный диалог Windows: installer сам копирует payload, создает ярлыки и запускает Real.

Для гарантированной сборки используется workflow `.github/workflows/real-windows-release.yml`
на Windows runner. При ручном запуске он запрашивает опубликованный URL API, собирает
установщик и сохраняет его как артефакт `Real-Windows`.

Для подписанного релиза настройте подпись portable installer в Windows runner
через секреты GitHub Actions. Workflow проверяет наличие custom installer,
manifest и SHA-256 перед публикацией.

## Автообновление

Для новой версии:

1. увеличьте `version` в `package.json`;
2. соберите custom installer на Windows runner;
3. опубликуйте installer и `real-update.json` в GitHub Release;
4. оставьте `updateUrl` направленным на каталог latest release.

Приложение проверяет `real-update.json` при запуске и каждые четыре часа. При новой
версии startup-screen показывает результат проверки, а верхняя панель предлагает
скачать installer. После загрузки кнопка запускает этот же custom installer с текущей
папкой установки.

## Оформление установщика

Собственная UI находится в `installer/index.html`, а логика установки — в
`installer/main.cjs`. В `electron-builder-installer.yml` встраиваются
`image_1789523796333.png`, белая иконка Real и готовый payload
`release/win-unpacked`. Обновлять эти ресурсы нужно до сборки Windows-релиза.
