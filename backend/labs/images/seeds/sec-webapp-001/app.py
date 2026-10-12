#!/usr/bin/env python3
"""Vulnerable demo web app for sec-webapp-001 ("Web App Testing: SQLi & XSS").

*** INTENTIONALLY VULNERABLE — training target only. ***
Do NOT expose this to any real network. It binds 127.0.0.1:5000 (loopback)
inside the lab container; the container has no route off the lab network.

Vulnerabilities (for the learner to find and exploit, then fix):
  1. /search?q=  — SQL injection: the query string is interpolated straight
     into a SQLite SELECT (UNION-based extraction works).
  2. /comment    — reflected XSS: the `name` and `msg` parameters are echoed
     into the HTML response with no output encoding.

All data is fictional seed data for the lab (clearly fake addresses/tokens).
"""
from __future__ import annotations

import os
import sqlite3

from flask import Flask, g, request

DB_PATH = os.environ.get("WEBAPP_DB", "/home/analyst/webapp.db")

app = Flask(__name__)

SEED_USERS = [
    # (username, email, password_hash, role, note) — all fictional lab data.
    ("alice", "alice@example.com", "5f4dcc3b5aa765d61d8327deb882cf99", "user",
     "project wiki editor"),
    ("bob", "bob@example.com", "e99a18c428cb38d5f260853678922e03", "user",
     "helpdesk tier 1"),
    ("carol", "carol@example.com", "8d3532d1c8b7d0b0a5b9e7f1c2a4d6e8", "user",
     "intern (fake record)"),
    ("dave", "dave@example.com", "d8578edf8458ce06fbc5bb76a58c5ca", "admin",
     "INTERNAL: password-reset token RST-FAKE-0042 (fictional)"),
]


def get_db() -> sqlite3.Connection:
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(exc):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db() -> None:
    fresh = not os.path.exists(DB_PATH)
    db = sqlite3.connect(DB_PATH)
    db.execute(
        "CREATE TABLE IF NOT EXISTS users ("
        "id INTEGER PRIMARY KEY, username TEXT, email TEXT, "
        "password_hash TEXT, role TEXT, note TEXT)"
    )
    if fresh or not db.execute("SELECT COUNT(*) FROM users").fetchone()[0]:
        db.execute("DELETE FROM users")
        db.executemany(
            "INSERT INTO users (username, email, password_hash, role, note)"
            " VALUES (?,?,?,?,?)",
            SEED_USERS,
        )
        db.commit()
    db.close()


INDEX_HTML = """\
<html><head><title>ACME Training Portal (vulnerable demo)</title></head><body>
<h1>ACME Training Portal</h1>
<p><b>Training target — intentionally vulnerable.</b> Routes:</p>
<ul>
  <li><a href="/search?q=alice">/search?q=&lt;name&gt;</a> — user directory search</li>
  <li><a href="/comment">/comment</a> — guestbook (leave a comment)</li>
  <li><a href="/health">/health</a> — health check</li>
</ul>
</body></html>
"""


@app.route("/")
def index():
    return INDEX_HTML


@app.route("/health")
def health():
    return {"status": "ok", "app": "vulnerable-demo"}


@app.route("/search")
def search():
    """VULNERABLE: q is interpolated into the SQL string (SQL injection)."""
    q = request.args.get("q", "")
    db = get_db()
    # --- the bug: string interpolation instead of a parameterized query ---
    rows = db.execute(
        f"SELECT id, username, email, role FROM users WHERE username LIKE '%{q}%'"
    ).fetchall()
    out = ["<html><body><h1>User search</h1>",
           f"<p>Results for <b>{q}</b>:</p><ul>"]
    for r in rows:
        out.append(f"<li>#{r['id']} {r['username']} &lt;{r['email']}&gt; ({r['role']})</li>")
    out.append("</ul><p><a href='/'>home</a></p></body></html>")
    return "\n".join(out)


COMMENT_FORM = """\
<html><body><h1>Guestbook</h1>
<form method="POST" action="/comment">
  Name: <input name="name"><br>
  Comment:<br><textarea name="msg" rows="4" cols="40"></textarea><br>
  <input type="submit" value="Sign">
</form>
<p>Or try the reflected version: <a href="/comment?name=Ada&msg=hello">/comment?name=Ada&amp;msg=hello</a></p>
</body></html>
"""


@app.route("/comment", methods=["GET", "POST"])
def comment():
    """VULNERABLE: reflected XSS — name/msg echoed with no output encoding."""
    if request.method == "POST":
        name = request.form.get("name", "guest")
        msg = request.form.get("msg", "")
    else:
        name = request.args.get("name", "guest")
        msg = request.args.get("msg", "")
        if "name" not in request.args and "msg" not in request.args:
            return COMMENT_FORM
    # --- the bug: unescaped reflection into HTML ---
    return (f"<html><body><h1>Thanks, {name}!</h1>"
            f"<p>Your comment:</p><blockquote>{msg}</blockquote>"
            f"<p><a href='/comment'>back</a></p></body></html>")


if __name__ == "__main__":
    init_db()
    # Loopback ONLY — this app must never listen on an external interface.
    app.run(host="127.0.0.1", port=5000)
