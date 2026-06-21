# СтройКонтроль

Мобильное приложение для управления строительными объектами (Android / iOS / Telegram Mini App).

## Стек

- React 19 + TypeScript + Vite
- Tailwind CSS 4
- Capacitor 7 (Android / iOS)
- Supabase (опционально, без ключей работает демо-режим)

## Запуск

```bash
npm install
npm run dev
```

Откройте http://localhost:5173

## Сборка для телефона

```bash
npm run build
npx cap add android   # один раз
npx cap add ios       # один раз (только macOS)
npm run cap:sync
npm run cap:android   # открыть Android Studio
npm run cap:ios       # открыть Xcode
```

## Supabase

Скопируйте `.env.example` в `.env` и укажите ключи Supabase.

## Экраны

| Путь | Описание |
|------|----------|
| `/` | Список объектов (прораб) |
| `/object/:id` | Детали объекта |
| `/worker` | Задачи монтажника |
| `/client/:id` | Публичный вид для заказчика |
| `/team` | Команда |
| `/settings` | Настройки |
