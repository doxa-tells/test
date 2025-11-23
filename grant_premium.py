#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для выдачи премиум подписки пользователю через PostgreSQL
Использование:
    python grant_premium.py <user_id> [days]
    
Примеры:
    python grant_premium.py 123456789           # Выдать премиум навсегда
    python grant_premium.py 123456789 30        # Выдать премиум на 30 дней
    python grant_premium.py 123456789 0         # Выдать премиум навсегда
"""

import os
import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
import psycopg2

# Загрузка .env
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

# Параметры подключения к БД
PG_HOST = os.getenv("PG_HOST", "localhost")
PG_PORT = os.getenv("PG_PORT", "5432")
PG_USER = os.getenv("PG_USER", "postgres")
PG_PASSWORD = os.getenv("PG_PASSWORD")
PG_DB = os.getenv("PG_DB", "actors")


def grant_premium(user_id: int, days: int = 0):
    """
    Выдать премиум подписку пользователю
    
    Args:
        user_id: ID пользователя в Telegram
        days: Количество дней подписки (0 = навсегда)
    """
    try:
        # Подключение к БД
        conn = psycopg2.connect(
            host=PG_HOST,
            port=PG_PORT,
            user=PG_USER,
            password=PG_PASSWORD,
            dbname=PG_DB
        )
        
        cursor = conn.cursor()
        
        # Вычисляем дату окончания подписки
        now = datetime.now(timezone.utc)
        valid_until = None
        if days > 0:
            valid_until = now + timedelta(days=days)
        
        # Выдаём премиум подписку
        cursor.execute(
            """
            INSERT INTO subs (user_id, status, plan, updated_at, valid_until)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                status = EXCLUDED.status,
                plan = EXCLUDED.plan,
                updated_at = EXCLUDED.updated_at,
                valid_until = EXCLUDED.valid_until
            """,
            (user_id, 'active', 'premium', now, valid_until)
        )
        
        conn.commit()
        
        # Проверяем результат
        cursor.execute(
            "SELECT user_id, status, plan, updated_at, valid_until FROM subs WHERE user_id = %s",
            (user_id,)
        )
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if result:
            print("✅ Премиум подписка успешно выдана!")
            print(f"   User ID: {result[0]}")
            print(f"   Status: {result[1]}")
            print(f"   Plan: {result[2]}")
            print(f"   Updated: {result[3]}")
            if result[4]:
                print(f"   Valid until: {result[4]} (на {days} дней)")
            else:
                print(f"   Valid until: навсегда")
            return True
        else:
            print("❌ Ошибка: не удалось выдать подписку")
            return False
            
    except psycopg2.Error as e:
        print(f"❌ Ошибка БД: {e}")
        return False
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        return False


def revoke_premium(user_id: int):
    """Отозвать премиум подписку"""
    try:
        conn = psycopg2.connect(
            host=PG_HOST,
            port=PG_PORT,
            user=PG_USER,
            password=PG_PASSWORD,
            dbname=PG_DB
        )
        
        cursor = conn.cursor()
        now = datetime.now(timezone.utc)
        
        cursor.execute(
            """
            UPDATE subs 
            SET status = 'inactive', plan = NULL, updated_at = %s, valid_until = NULL
            WHERE user_id = %s
            """,
            (now, user_id)
        )
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print(f"✅ Премиум подписка отозвана для user_id={user_id}")
        return True
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        return False


def check_subscription(user_id: int):
    """Проверить текущую подписку пользователя"""
    try:
        conn = psycopg2.connect(
            host=PG_HOST,
            port=PG_PORT,
            user=PG_USER,
            password=PG_PASSWORD,
            dbname=PG_DB
        )
        
        cursor = conn.cursor()
        cursor.execute(
            "SELECT user_id, status, plan, updated_at, valid_until FROM subs WHERE user_id = %s",
            (user_id,)
        )
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if result:
            print(f"📊 Подписка пользователя {user_id}:")
            print(f"   Status: {result[1]}")
            print(f"   Plan: {result[2] or 'нет'}")
            print(f"   Updated: {result[3]}")
            print(f"   Valid until: {result[4] or 'навсегда'}")
        else:
            print(f"❌ Пользователь {user_id} не найден в таблице subs")
            
    except Exception as e:
        print(f"❌ Ошибка: {e}")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        print("\nДоступные команды:")
        print("  grant <user_id> [days]  - Выдать премиум подписку")
        print("  revoke <user_id>        - Отозвать премиум подписку")
        print("  check <user_id>         - Проверить подписку")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "check":
        if len(sys.argv) < 3:
            print("❌ Укажите user_id")
            sys.exit(1)
        user_id = int(sys.argv[2])
        check_subscription(user_id)
        
    elif command == "revoke":
        if len(sys.argv) < 3:
            print("❌ Укажите user_id")
            sys.exit(1)
        user_id = int(sys.argv[2])
        revoke_premium(user_id)
        
    elif command == "grant" or command.isdigit():
        # Если первый аргумент - число, считаем что это user_id
        if command.isdigit():
            user_id = int(command)
            days = int(sys.argv[2]) if len(sys.argv) > 2 else 0
        else:
            if len(sys.argv) < 3:
                print("❌ Укажите user_id")
                sys.exit(1)
            user_id = int(sys.argv[2])
            days = int(sys.argv[3]) if len(sys.argv) > 3 else 0
        
        grant_premium(user_id, days)
        
    else:
        print(f"❌ Неизвестная команда: {command}")
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
