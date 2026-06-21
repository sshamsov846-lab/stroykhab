# Документация СтройХаб

## Содержание

- [TECH_STACK.md](TECH_STACK.md) — технический стек
- [DEPLOYMENT.md](DEPLOYMENT.md) — развёртывание
- [BUSINESS_PLAN.md](BUSINESS_PLAN.md) — бизнес-план
- [CUSDEV_QUESTIONS.md](CUSDEV_QUESTIONS.md) — вопросы для интервью

## Быстрый старт

```bash
npm install
npm run dev
```

Откройте http://localhost:5173

## Структура проекта

```
src/
├── components/     # Переиспользуемые компоненты
│   ├── BigButton.tsx
│   ├── ObjectCard.tsx
│   ├── TaskCard.tsx
│   ├── PhotoUploader.tsx
│   └── ExpenseForm.tsx
├── screens/        # Экраны
│   ├── Dashboard.tsx
│   ├── ObjectDetail.tsx
│   ├── WorkerDashboard.tsx
│   ├── ClientView.tsx
│   └── NewObject.tsx
├── hooks/
│   ├── useTelegram.ts
│   ├── useOffline.ts
│   └── useVoiceInput.ts
├── api/
│   ├── supabase.ts
│   └── database.types.ts
└── types/
    └── index.ts
```
