import sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.extras import RealDictCursor, Json
import json

SQLITE_PATH = 'data/actors.db'
sqlite_conn = sqlite3.connect(SQLITE_PATH)
sqlite_cur = sqlite_conn.cursor()

PG_CONN = {
    'dbname': 'actors',
    'user': 'postgres',
    'password': 'admin',  # Из .env
    'host': 'localhost',
    'port': '5432'
}
pg_conn = psycopg2.connect(**PG_CONN)
pg_cur = pg_conn.cursor()

def create_tables():
    # Сначала удаляем, если существуют, чтобы пересоздать с новыми колонками
    pg_cur.execute("DROP TABLE IF EXISTS weekly_stats")
    pg_cur.execute("DROP TABLE IF EXISTS users")
    pg_cur.execute("DROP TABLE IF EXISTS matches")
    pg_cur.execute("DROP TABLE IF EXISTS consents")
    pg_cur.execute("DROP TABLE IF EXISTS subs")

    pg_cur.execute("""
        CREATE TABLE users (
            user_id BIGINT PRIMARY KEY,
            full_name TEXT,
            cities TEXT,
            sex TEXT,
            age_range TEXT,
            look_type TEXT,
            body_type TEXT,
            height_cm INTEGER,
            weight_kg INTEGER,
            hair_color TEXT,
            hair_type TEXT,
            eye_color TEXT,
            languages TEXT,
            video_vizitka TEXT,
            showreel TEXT,
            portfolio TEXT,
            projects TEXT,
            phone TEXT,
            skills TEXT,
            instagram TEXT,
            photo1_id TEXT,
            photo2_id TEXT,
            photo3_id TEXT,
            photo4_id TEXT,
            photo1_tg JSONB,
            photo2_tg JSONB,
            photo3_tg JSONB,
            photo4_tg JSONB,
            created_at TIMESTAMPTZ,
            updated_at TIMESTAMPTZ
        )
    """)
    pg_cur.execute("""
        CREATE TABLE matches (
            id SERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL,
            source_chat BIGINT,
            thread_id INTEGER,
            message_ids JSONB,
            text_cache TEXT,
            created_at TIMESTAMPTZ NOT NULL
        )
    """)
    pg_cur.execute("""
        CREATE TABLE consents (
            user_id BIGINT PRIMARY KEY,
            accepted_at TIMESTAMPTZ NOT NULL
        )
    """)
    pg_cur.execute("""
        CREATE TABLE subs (
            user_id BIGINT PRIMARY KEY,
            status TEXT NOT NULL CHECK(status IN ('active','inactive')),
            updated_at TIMESTAMPTZ NOT NULL
        )
    """)
    pg_cur.execute("""
        CREATE TABLE weekly_stats (
            user_id BIGINT NOT NULL,
            week_start DATE NOT NULL,
            cnt BIGINT NOT NULL DEFAULT 0,
            PRIMARY KEY (user_id, week_start)
        )
    """)
    pg_conn.commit()

create_tables()

def migrate_table(table_name, select_query, insert_query, key_columns):
    print(f"Мигрирую таблицу {table_name}...")
    sqlite_cur.execute(select_query)
    rows = sqlite_cur.fetchall()

    # индексы JSON-полей для каждой таблицы
    json_field_idx = []
    if table_name == 'users':
        # SELECT * FROM users — порядок колонок по .schema users
        # ... photo1_id(21), photo2_id(22), photo3_id(23), photo4_id(24),
        # photo1_tg(25), photo2_tg(26), photo3_tg(27), photo4_tg(28), created_at(29), updated_at(30)
        # в Python-индексации: 0..29 => JSON-индексы: 24..27
        json_field_idx = [24, 25, 26, 27]

    for row in rows:
        new_row = []
        for i, x in enumerate(row):
            # Обработка JSONB колонок
            if i in json_field_idx:
                if isinstance(x, str) and x.strip().startswith('{') and x.strip().endswith('}'):
                    try:
                        obj = json.loads(x)
                        new_row.append(Json(obj))  # корректный JSONB
                    except Exception:
                        new_row.append(None)       # битый JSON -> NULL
                else:
                    new_row.append(None)           # пустая/не JSON строка -> NULL
                continue

            # Прочие поля: числа/строки как есть
            if isinstance(x, (int, float)):
                # Безопасная конверсия в BIGINT/INTEGER, иначе строка
                if -9223372036854775808 <= int(x) <= 9223372036854775807:
                    new_row.append(int(x))
                else:
                    new_row.append(str(x))
            elif x is None:
                new_row.append(None)
            else:
                new_row.append(str(x))

        row = tuple(new_row)
        try:
            pg_cur.execute(insert_query, row)
        except psycopg2.IntegrityError:
            pg_cur.execute(insert_query.replace('INSERT', 'INSERT ... ON CONFLICT ... DO UPDATE SET'), row)
        except Exception as e:
            print(f"Ошибка в {table_name}: {e}")

    pg_conn.commit()
    print(f"Мигрировано {len(rows)} записей в {table_name}.")

# Миграция users
# Миграция users (полные колонки из SQLite)
migrate_table(
    'users',
    'SELECT * FROM users',
    'INSERT INTO users (user_id, full_name, cities, sex, age_range, look_type, body_type, height_cm, weight_kg, hair_color, hair_type, eye_color, languages, video_vizitka, showreel, portfolio, projects, phone, skills, instagram, photo1_id, photo2_id, photo3_id, photo4_id, photo1_tg, photo2_tg, photo3_tg, photo4_tg, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, cities = EXCLUDED.cities, sex = EXCLUDED.sex, age_range = EXCLUDED.age_range, look_type = EXCLUDED.look_type, body_type = EXCLUDED.body_type, height_cm = EXCLUDED.height_cm, weight_kg = EXCLUDED.weight_kg, hair_color = EXCLUDED.hair_color, hair_type = EXCLUDED.hair_type, eye_color = EXCLUDED.eye_color, languages = EXCLUDED.languages, video_vizitka = EXCLUDED.video_vizitka, showreel = EXCLUDED.showreel, portfolio = EXCLUDED.portfolio, projects = EXCLUDED.projects, phone = EXCLUDED.phone, skills = EXCLUDED.skills, instagram = EXCLUDED.instagram, photo1_id = EXCLUDED.photo1_id, photo2_id = EXCLUDED.photo2_id, photo3_id = EXCLUDED.photo3_id, photo4_id = EXCLUDED.photo4_id, photo1_tg = EXCLUDED.photo1_tg, photo2_tg = EXCLUDED.photo2_tg, photo3_tg = EXCLUDED.photo3_tg, photo4_tg = EXCLUDED.photo4_tg, created_at = EXCLUDED.created_at, updated_at = EXCLUDED.updated_at',
    ['user_id']
)
# Миграция matches
migrate_table(
    'matches',
    'SELECT id, user_id, source_chat, thread_id, message_ids, text_cache, created_at FROM matches',
    'INSERT INTO matches (id, user_id, source_chat, thread_id, message_ids, text_cache, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s) ON CONFLICT (id) DO NOTHING',
    ['id']
)

# Миграция consents
migrate_table(
    'consents',
    'SELECT user_id, accepted_at FROM consents',
    'INSERT INTO consents (user_id, accepted_at) VALUES (%s, %s) ON CONFLICT (user_id) DO NOTHING',
    ['user_id']
)

# Миграция subs
migrate_table(
    'subs',
    'SELECT user_id, status, updated_at FROM subs',
    'INSERT INTO subs (user_id, status, updated_at) VALUES (%s, %s, %s) ON CONFLICT (user_id) DO UPDATE SET status = EXCLUDED.status, updated_at = EXCLUDED.updated_at',
    ['user_id']
)

# Миграция weekly_stats
migrate_table(
    'weekly_stats',
    'SELECT user_id, week_start, cnt FROM weekly_stats',
    'INSERT INTO weekly_stats (user_id, week_start, cnt) VALUES (%s, %s, %s) ON CONFLICT (user_id, week_start) DO UPDATE SET cnt = EXCLUDED.cnt',
    ['user_id', 'week_start']
)

sqlite_conn.close()
pg_conn.close()
print("Миграция завершена!")