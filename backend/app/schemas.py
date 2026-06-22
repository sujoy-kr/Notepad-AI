"""
Pydantic API Schemas.

Defines Pydantic models for validation of requests and responses for AI and Note routes.
"""

from typing import List, Optional
from pydantic import BaseModel


class NoteCreate(BaseModel):
    title: str
    content: str


class NoteUpdate(BaseModel):
    title: str
    content: str


class AutocompleteRequest(BaseModel):
    text: str
    model: str = "qwen2.5-coder:0.5b"
    max_tokens: int = 5
    temperature: float = 0.1
    context_chars: int = 1500


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    note_content: Optional[str] = None
    model: str = "qwen2.5-coder:0.5b"


class PullModelRequest(BaseModel):
    model: str
