"""Build seed.db for py-sqli-001 (idempotent). Run at image build time."""
import os
import sqlite3

HERE = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(HERE, "seed.db")

if os.path.exists(DB):
    os.remove(DB)

conn = sqlite3.connect(DB)
cur = conn.cursor()
with open(os.path.join(HERE, "schema.sql")) as f:
    cur.executescript(f.read())

cur.executemany(
    "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
    [
        ("admin", "sha256$9f2c1a", "admin"),
        ("maria", "sha256$41bd88", "analyst"),
        ("opsvc", "sha256$0e77c3", "service"),
    ],
)
cur.executemany(
    "INSERT INTO notes (author, title, body) VALUES (?, ?, ?)",
    [
        ("admin", "onboarding", "rotate the admin password quarterly"),
        ("maria", "soc shift", "watch 203.0.113.66 - brute forcing since Monday"),
    ],
)
conn.commit()

users = cur.execute("SELECT COUNT(*) FROM users").fetchone()[0]
notes = cur.execute("SELECT COUNT(*) FROM notes").fetchone()[0]
conn.close()
print(f"seed.db ready: {users} users, {notes} notes")
