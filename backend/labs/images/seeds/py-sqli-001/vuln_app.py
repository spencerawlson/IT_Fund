"""Vulnerable notes app (INTENTIONALLY VULNERABLE - training only).

Usage:
    python3 vuln_app.py login <username>      look up one user
    python3 vuln_app.py notes                 list all notes
    python3 vuln_app.py add <author> <title>  add a note (body read from stdin)

The queries below build SQL with f-strings. Your job: prove the injection,
then fix it with parameterized queries in fixed_app.py.
"""
import sqlite3
import sys

DB = "seed.db"


def get_user(username):
    """Look up a user by name. VULNERABLE: f-string interpolation."""
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    query = f"SELECT id, username, password_hash, role FROM users WHERE username = '{username}'"
    cur.execute(query)
    rows = cur.fetchall()
    conn.close()
    return rows


def list_notes():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    cur.execute("SELECT id, author, title FROM notes ORDER BY id")
    rows = cur.fetchall()
    conn.close()
    return rows


def add_note(author, title, body):
    """Add a note. VULNERABLE: f-string interpolation into INSERT."""
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    cur.execute(
        f"INSERT INTO notes (author, title, body) VALUES ('{author}', '{title}', '{body}')"
    )
    conn.commit()
    conn.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    cmd = sys.argv[1]
    if cmd == "login" and len(sys.argv) == 3:
        for row in get_user(sys.argv[2]):
            print(row)
    elif cmd == "notes":
        for row in list_notes():
            print(row)
    elif cmd == "add" and len(sys.argv) == 4:
        body = sys.stdin.read().strip()
        add_note(sys.argv[2], sys.argv[3], body)
        print("note added")
    else:
        print(__doc__)
        sys.exit(1)
