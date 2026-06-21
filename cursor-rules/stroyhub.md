# СтройХаб — правила для Cursor

## Стек
- React 19 + TypeScript + Vite
- Tailwind CSS 4 (`@tailwindcss/vite`)
- Supabase (опционально, есть демо-данные)
- Capacitor для Android/iOS
- Telegram Mini App SDK

## Структура
- `src/screens/` — экраны приложения
- `src/components/` — переиспользуемые UI-компоненты
- `src/hooks/` — хуки (Telegram, офлайн, голос)
- `src/api/` — Supabase и типы БД
- `src/types/` — доменные типы
- `src/utils/` — утилиты (`cn`, форматирование)

## Соглашения
- Мобильный UI: классы `text-*-mobile`, кнопки через `BigButton`
- Haptic feedback через `useTelegram().haptic()`
- Формы: `react-hook-form` + `zod`
- Имена на русском в UI, код на английском
