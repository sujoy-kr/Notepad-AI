"""
REST API Router for Notes CRUD.

Handles database endpoints to get all notes, fetch note by ID, create a note,
update details, and delete a note.
"""

from typing import List
from fastapi import APIRouter, HTTPException, status

from app.schemas import NoteCreate, NoteUpdate
import app.crud as crud

router = APIRouter(prefix="/api/notes", tags=["Notes"])


@router.get("", response_model=List[dict])
def read_notes():
    """Retrieves list of notes ordered by last updated date."""
    return crud.get_all_notes()


@router.get("/{note_id}", response_model=dict)
def read_note(note_id: str):
    """Retrieves note contents by ID. Raises 404 if missing."""
    note = crud.get_note_by_id(note_id)
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Note not found"
        )
    return note


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_note(note_data: NoteCreate):
    """Creates a new note record."""
    return crud.create_note(note_data.title, note_data.content)


@router.put("/{note_id}", response_model=dict)
def update_note(note_id: str, note_data: NoteUpdate):
    """Updates title and text contents of an existing note."""
    updated = crud.update_note(note_id, note_data.title, note_data.content)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Note not found"
        )
    return updated


@router.delete("/{note_id}", status_code=status.HTTP_200_OK)
def delete_note(note_id: str):
    """Deletes a note record from the database."""
    deleted = crud.delete_note(note_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Note not found"
        )
    return {"success": True, "message": "Note deleted successfully"}
