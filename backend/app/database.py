"""
Database connection pool and schema initialization for SQLite.

Provides a thread-safe connection generator for sqlite3 interactions.
"""

import os
import sqlite3

from app.config import DB_PATH


def init_db() -> None:
    """Creates the SQLite database file and compiles tables if they don't exist yet."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            updated_at REAL NOT NULL
        )
    """)
    conn.commit()
    conn.close()


def get_db_connection() -> sqlite3.Connection:
    """Generates and returns an active sqlite3 database connection with dictionary mapping rows."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn
