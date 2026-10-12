-- seed.db schema for py-sqli-001. Created by make_seed_db.py.
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL
);

CREATE TABLE notes (
    id INTEGER PRIMARY KEY,
    author TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL
);
