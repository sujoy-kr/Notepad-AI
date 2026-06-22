#!/usr/bin/env python3
"""
Launcher script for the Notepad AI FastAPI Backend.

This module automates locating the backend directory, resolving the local virtual
environment path, and booting uvicorn with hot-reload enabled.
"""

import os
import subprocess
import sys


def main():
    # Keep directory paths absolute to avoid relative execution issues
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(backend_dir)
    
    venv_bin = os.path.join(backend_dir, "venv", "bin")
    uvicorn_path = os.path.join(venv_bin, "uvicorn")
    
    if not os.path.exists(uvicorn_path):
        print("Error: Virtual environment not detected. Run setup commands first.")
        sys.exit(1)
        
    command = [
        uvicorn_path, 
        "main:app", 
        "--host", "127.0.0.1", 
        "--port", "8000", 
        "--reload"
    ]
    
    print(f"Launching Notepad AI Backend on http://127.0.0.1:8000 ...")
    try:
        subprocess.run(command)
    except KeyboardInterrupt:
        print("\nFastAPI server terminated.")


if __name__ == "__main__":
    main()
