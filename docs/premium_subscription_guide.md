# Управление премиум подписками

## Описание

Скрипт `grant_premium.py` позволяет управлять премиум подписками пользователей через PostgreSQL.

## Структура таблицы `subs`

```sql
Table "public.subs"
   Column    |           Type           | Nullable
-------------+--------------------------+----------
 user_id     | bigint                   | not null (PRIMARY KEY)
 status      | text                     | not null (active/inactive)
 updated_at  | timestamp with time zone | not null
 plan        | text                     | nullable (basic/premium)
 valid_until | timestamp with time zone | nullable
```

## Использование скрипта

### 1. Выдать премиум подписку

```bash
# Выдать премиум навсегда
python grant_premium.py grant <user_id>

# Выдать премиум на 30 дней
python grant_premium.py grant <user_id> 30

# Короткая форма (без команды grant)
python grant_premium.py <user_id> 30
```

**Примеры:**
```bash
python grant_premium.py grant 123456789        # Навсегда
python grant_premium.py grant 123456789 30     # На 30 дней
python grant_premium.py 123456789 90           # На 90 дней
```

### 2. Проверить подписку

```bash
python grant_premium.py check <user_id>
```

**Пример:**
```bash
python grant_premium.py check 123456789
```

**Вывод:**
```
📊 Подписка пользователя 123456789:
   Status: active
   Plan: premium
   Updated: 2025-11-23 17:56:39+05:00
   Valid until: 2025-12-23 17:56:39+05:00
```

### 3. Отозвать премиум подписку

```bash
python grant_premium.py revoke <user_id>
```

**Пример:**
```bash
python grant_premium.py revoke 123456789
```

## Прямые SQL-запросы

### Выдать премиум навсегда

```sql
INSERT INTO subs (user_id, status, plan, updated_at, valid_until)
VALUES (123456789, 'active', 'premium', NOW(), NULL)
ON CONFLICT (user_id) 
DO UPDATE SET 
    status = 'active',
    plan = 'premium',
    updated_at = NOW(),
    valid_until = NULL;
```

### Выдать премиум на 30 дней

```sql
INSERT INTO subs (user_id, status, plan, updated_at, valid_until)
VALUES (123456789, 'active', 'premium', NOW(), NOW() + INTERVAL '30 days')
ON CONFLICT (user_id) 
DO UPDATE SET 
    status = 'active',
    plan = 'premium',
    updated_at = NOW(),
    valid_until = NOW() + INTERVAL '30 days';
```

### Отозвать премиум

```sql
UPDATE subs 
SET status = 'inactive', plan = NULL, updated_at = NOW(), valid_until = NULL
WHERE user_id = 123456789;
```

### Проверить подписку

```sql
SELECT user_id, status, plan, updated_at, valid_until 
FROM subs 
WHERE user_id = 123456789;
```

### Посмотреть всех премиум пользователей

```sql
SELECT user_id, status, plan, updated_at, valid_until 
FROM subs 
WHERE plan = 'premium' AND status = 'active'
ORDER BY updated_at DESC;
```

### Посмотреть истекающие подписки

```sql
SELECT user_id, status, plan, updated_at, valid_until 
FROM subs 
WHERE plan = 'premium' 
  AND status = 'active' 
  AND valid_until IS NOT NULL 
  AND valid_until < NOW() + INTERVAL '7 days'
ORDER BY valid_until ASC;
```

## Функции в коде бота

В файле `filters/user_reg_bot.py` есть следующие функции:

### Синхронные функции

```python
# Получить статус подписки (active/inactive)
status = get_sub_status(user_id)

# Установить статус подписки
set_sub_status(user_id, 'active')  # или 'inactive'

# Проверить активна ли подписка
is_active = is_sub_active(user_id)  # True/False

# Получить план подписки (None/basic/premium)
plan = get_sub_plan(user_id)
```

### Асинхронные функции

```python
# Установить статус подписки
await a_set_sub_status(user_id, 'active')

# Проверить активна ли подписка
is_active = await a_is_sub_active(user_id)

# Получить план подписки
plan = await a_get_sub_plan(user_id)
```

## Примечания

1. **Статус подписки** (`status`):
   - `active` - подписка активна
   - `inactive` - подписка неактивна

2. **План подписки** (`plan`):
   - `NULL` - нет плана
   - `basic` - базовый план
   - `premium` - премиум план

3. **Срок действия** (`valid_until`):
   - `NULL` - подписка навсегда
   - Дата - подписка действует до указанной даты

4. **Автоматическая проверка срока**:
   - В коде бота нужно добавить проверку `valid_until` при каждом запросе
   - Если `valid_until < NOW()`, то подписка истекла

## Рекомендации

1. Для выдачи премиума используй скрипт `grant_premium.py`
2. Для массовых операций используй прямые SQL-запросы
3. Добавь автоматическую проверку истечения подписки в коде бота
4. Создай крон-задачу для автоматического отключения истекших подписок
