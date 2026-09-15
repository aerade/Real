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

Приложение проверяет обновления при запуске и каждые четыре часа, загружает их в фоне
и показывает состояние в правой части верхней панели. После загрузки новой версии там
появляется кнопка `Restart to update`, которая закрывает приложение и устанавливает
обновление сразу.

## Оформление установщика

Инсталлятор использует кастомные ресурсы:

- `build/installer-header.bmp` — верхний header с фоном и логотипом Real;
- `build/installer-sidebar.bmp` — боковая панель с фоном из брендового изображения;
- `build/installer.nsh` — добавляет стандартному окну NSIS рабочие minimize/maximize
  кнопки, сохраняя close и системное поведение установщика.

Эти файлы подключены в `electron-builder.yml`. Обновлять их нужно до сборки Windows-релиза,
если меняется визуальный стиль приложения.