# Развёртывание СтройХаб

## Шаг 1: Supabase (база данных)

1. Зайди на [supabase.com](https://supabase.com)
2. Создай новый проект
3. В SQL Editor выполни миграции (см. ниже)
4. Скопируй URL и ANON KEY в `.env`

### SQL-миграции

```sql
-- Таблица пользователей
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE NOT NULL,
  phone TEXT,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('foreman', 'worker', 'client', 'supplier')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Таблица объектов
CREATE TABLE objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  foreman_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'active', 'delayed', 'done')),
  budget_total NUMERIC DEFAULT 0,
  budget_spent NUMERIC DEFAULT 0,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Таблица задач
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id UUID REFERENCES objects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  room TEXT,
  assigned_to UUID REFERENCES users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'review', 'done', 'rejected')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  estimated_hours NUMERIC,
  actual_hours NUMERIC DEFAULT 0,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Таблица расходов
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id UUID REFERENCES objects(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('materials', 'tools', 'salary', 'transport', 'other')),
  description TEXT NOT NULL,
  receipt_url TEXT,
  receipt_data JSONB,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Таблица фото
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  object_id UUID REFERENCES objects(id) ON DELETE CASCADE,
  room TEXT,
  photo_url TEXT NOT NULL,
  thumbnail_url TEXT,
  type TEXT NOT NULL CHECK (type IN ('before', 'after', 'progress', 'defect', 'hidden_work')),
  description TEXT,
  taken_by UUID REFERENCES users(id),
  taken_at TIMESTAMPTZ DEFAULT now(),
  geolocation JSONB
);

-- Политики безопасности (RLS)
ALTER TABLE objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Прораб видит свои объекты
CREATE POLICY "Прораб видит свои объекты" ON objects
  FOR ALL USING (foreman_id = auth.uid());

-- Мастер видит задачи, назначенные ему
CREATE POLICY "Мастер видит свои задачи" ON tasks
  FOR ALL USING (assigned_to = auth.uid());

-- Хранилище для фото
INSERT INTO storage.buckets (id, name) VALUES ('photos', 'photos');

CREATE POLICY "Авторизованные могут загружать фото" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'photos' AND auth.role() = 'authenticated');
```

## Шаг 2: Telegram Bot

1. Найди @BotFather в Telegram
2. Отправь `/newbot`
3. Задай имя (например, "СтройХаб") и username (например, "stroyhub_bot")
4. Получи токен
5. Настрой Web App:
   ```
   /setmenu
   Выбери бота
   Отправь URL твоего приложения
   ```

## Шаг 3: Хостинг (Vercel)

1. Залей код на GitHub
2. Подключи репозиторий к [Vercel](https://vercel.com)
3. Добавь переменные окружения из `.env`
4. Получи URL (например, `https://stroyhub.vercel.app`)

## Шаг 4: Подключение к Telegram

1. В BotFather: `/setmenu` → выбери бота → вставь URL с Vercel
2. Теперь при открытии бота — откроется твоё приложение

## Шаг 5: Тестирование

1. Открой бота в Telegram
2. Нажми "Запустить"
3. Приложение откроется внутри Telegram
4. Проверь все экраны

## Деплой на продакшен

```bash
# Сборка
npm run build

# Проверка локально
npm run preview

# Деплой на Vercel (если CLI установлен)
vercel --prod
```
