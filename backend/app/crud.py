"""
CRUD Operations for Note management.

Encapsulates SQL queries inside readable python functions, managing timestamps
and unique note identifiers (UUIDs).
"""

import time
import uuid
from typing import List, Dict, Optional

from app.database import get_db_connection


def get_all_notes() -> List[Dict]:
    """Retrieves all notes ordered by their last updated timestamp descending."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, title, content, updated_at FROM notes ORDER BY updated_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_note_by_id(note_id: str) -> Optional[Dict]:
    """Fetches a note by unique identifier, returning None if not found."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, title, content, updated_at FROM notes WHERE id = ?", (note_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None


def create_note(title: str, content: str) -> Dict:
    """Inserts a new note record with a new UUID and current timestamp."""
    note_id = str(uuid.uuid4())
    updated_at = time.time()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO notes (id, title, content, updated_at) VALUES (?, ?, ?, ?)",
        (note_id, title, content, updated_at)
    )
    conn.commit()
    conn.close()
    return {"id": note_id, "title": title, "content": content, "updated_at": updated_at}


def update_note(note_id: str, title: str, content: str) -> Optional[Dict]:
    """Updates the note title, contents, and update timestamp."""
    updated_at = time.time()
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Pre-verify note existence
    cursor.execute("SELECT 1 FROM notes WHERE id = ?", (note_id,))
    if not cursor.fetchone():
        conn.close()
        return None
        
    cursor.execute(
        "UPDATE notes SET title = ?, content = ?, updated_at = ? WHERE id = ?",
        (title, content, updated_at, note_id)
    )
    conn.commit()
    conn.close()
    return {"id": note_id, "title": title, "content": content, "updated_at": updated_at}


def delete_note(note_id: str) -> bool:
    """Deletes a note record from the database. Returns True on success, False if missing."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Pre-verify note existence
    cursor.execute("SELECT 1 FROM notes WHERE id = ?", (note_id,))
    if not cursor.fetchone():
        conn.close()
        return False
        
    cursor.execute("DELETE FROM notes WHERE id = ?", (note_id,))
    conn.commit()
    conn.close()
    return True
