"""
Configuration settings for the Notepad AI Backend.

Defines global constant paths and targets for Ollama server and local SQLite database files.
"""

import os

# Local Ollama address
OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
DEFAULT_MODEL = "qwen2.5-coder:0.5b"

# Local SQLite DB paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "data", "notepad.db")
