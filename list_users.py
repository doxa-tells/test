# list_users.py
#import sqlite3
#from pathlib import Path

#DB_PATH = Path(__file__).resolve().parent / "data" / "actors.db"

#def list_users():
  #  con = sqlite3.connect(DB_PATH)
  #  con.row_factory = sqlite3.Row
    #cur = con.cursor()

  #  cur.execute("SELECT * FROM users ORDER BY created_at DESC;")
 #   rows = cur.fetchall()

   # if not rows:
    #    print("❌ В базе нет актеров.")
    #    return

   # print(f"📊 Всего актеров: {len(rows)}\n")

  #  for r in rows:
     #   print("───────────────")
     #   for key in r.keys():
      #      print(f"{key}: {r[key]}")
      #  print("───────────────\n")

  #  con.close()

#if __name__ == "__main__":
 ###   list_users()