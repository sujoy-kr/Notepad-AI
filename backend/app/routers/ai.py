"""
API Router for Local AI Autocomplete and Chat Assistant.

Interfaces with local Ollama APIs to perform low-latency prefix autocomplete,
streaming note assistant chat, tags checks, and programmatical model downloads.
"""

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.schemas import AutocompleteRequest, ChatRequest, PullModelRequest
from app.services.ollama import OllamaService

router = APIRouter(prefix="/api", tags=["AI Autocomplete & Assistant"])
ollama_service = OllamaService()


@router.post("/complete")
async def autocomplete(req: AutocompleteRequest):
    """Generates a text completion based on prefix text context."""
    suggestion = await ollama_service.get_autocomplete(
        prefix=req.text,
        model=req.model,
        max_tokens=req.max_tokens,
        temperature=req.temperature,
        context_chars=req.context_chars
    )
    return {"suggestion": suggestion}


@router.post("/chat")
async def chat(req: ChatRequest):
    """Streams Assistant conversations word-by-word via Server-Sent Events (SSE)."""
    # Convert Pydantic model objects into dictionaries
    message_dicts = [{"role": msg.role, "content": msg.content} for msg in req.messages]
    
    stream_generator = ollama_service.stream_chat(
        messages=message_dicts,
        note_content=req.note_content,
        model=req.model
    )
    return StreamingResponse(stream_generator, media_type="text/event-stream")


@router.get("/models")
async def get_models():
    """Lists downloaded models locally active on the Ollama daemon."""
    models = await ollama_service.get_available_models()
    return {"models": models}


@router.post("/models/pull")
async def pull_model(req: PullModelRequest):
    """Downloads model programmatically, streaming completion status and percentage progress."""
    stream_generator = ollama_service.stream_pull_model(req.model)
    return StreamingResponse(stream_generator, media_type="text/event-stream")
