"""
Notepad AI Backend Bootstrapper.

Configures logging, initializes SQLite tables on startup, mounts CORS middleware,
and hooks up decoupled API routers for notes database and local Ollama service.
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import notes, ai

# Set up clean logging format
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("app.main")

# Auto-initialize SQLite schema. Simple, thread-safe, and self-contained
init_db()
logger.info("SQLite database tables verified/initialized.")

app = FastAPI(
    title="Notepad AI Backend",
    description="Modular Python backend serving notes database CRUD and local Ollama integrations."
)

# CORS configurations for localhost React/Next.js dev ports
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Decoupled routers
app.include_router(notes.router)
app.include_router(ai.router)


if __name__ == "__main__":
    import uvicorn
    logger.info("Starting uvicorn server directly on http://127.0.0.1:8000")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
