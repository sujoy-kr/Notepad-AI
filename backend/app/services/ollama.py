"""
Ollama Local AI API Integration Service.

Connects to the local Ollama server, handles model tag listing, autocomplete prompt 
processing, streaming document assistant conversations, and model downloads.
"""

import json
import logging
from typing import List, AsyncGenerator, Dict, Optional

import httpx

from app.config import OLLAMA_HOST

logger = logging.getLogger("app.services.ollama")


class OllamaService:
    def __init__(self, host: str = OLLAMA_HOST):
        self.host = host.rstrip('/')
        
    async def get_available_models(self) -> List[str]:
        """Fetches the tags representing downloaded models available to serve."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{self.host}/api/tags")
                if resp.status_code == 200:
                    data = resp.json()
                    return [m["name"] for m in data.get("models", [])]
                logger.error(f"Ollama tags API returned status: {resp.status_code}")
                return []
        except Exception as e:
            logger.error(f"Could not reach Ollama tags API (is Ollama daemon active?): {str(e)}")
            return []

    async def get_autocomplete(
        self, 
        prefix: str, 
        model: str, 
        max_tokens: int, 
        temperature: float, 
        context_chars: int
    ) -> str:
        """
        Retrieves inline text suggestion (ghost-text autocomplete) from the model.
        
        Optimizations:
        1. Context Slicing: Slices prefix to the last `context_chars` characters. On CPU,
           evaluating long prompts (prefill phase) causes significant latency. Restricting
           context to ~500-1000 words keeps prompt processing under 15ms.
        2. Raw Mode: Invokes generation with `raw: true` to bypass model chat templates,
           instructing the model to act as a raw text continuation engine.
        3. stop keys: Stops generation at newlines or punctuation marks to return single-word
           or short-phrase autocompletions rather than long paragraphs.
        """
        if len(prefix) > context_chars:
            prefix = prefix[-context_chars:]
            
        payload = {
            "model": model,
            "prompt": prefix,
            "stream": False,
            "raw": True,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
                "stop": ["\n", ".", "?", "!", ";"]
            }
        }
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(f"{self.host}/api/generate", json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    suggestion = data.get("response", "")
                    if suggestion.startswith("\n"):
                        return ""
                    return suggestion
                logger.error(f"Ollama generate API returned status: {resp.status_code}")
                return ""
        except Exception as e:
            logger.error(f"Error calling Ollama autocomplete endpoint: {str(e)}")
            return ""

    async def stream_chat(
        self, 
        messages: List[Dict[str, str]], 
        note_content: Optional[str], 
        model: str
    ) -> AsyncGenerator[str, None]:
        """
        Streams document assistant conversational chunks.
        
        Prepend the system prompt containing the note context, allowing the assistant
        to answer questions directly referencing document contents.
        """
        system_prompt = (
            "You are a helpful assistant integrated into a notepad application.\n"
            "The user is working on a document. You have access to its contents below.\n"
            "Help the user edit, summarize, write, or analyze their note. Keep answers concise.\n\n"
            "--- START OF NOTE ---\n"
            f"{note_content or '[No content / Empty note]'}\n"
            "--- END OF NOTE ---\n"
        )
        
        ollama_messages = [{"role": "system", "content": system_prompt}]
        for msg in messages:
            ollama_messages.append({"role": msg["role"], "content": msg["content"]})
            
        payload = {
            "model": model,
            "messages": ollama_messages,
            "stream": True
        }
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream("POST", f"{self.host}/api/chat", json=payload) as response:
                    if response.status_code != 200:
                        yield f"data: {json.dumps({'error': f'Ollama error status {response.status_code}'})}\n\n"
                        return
                    
                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        try:
                            data = json.loads(line)
                            message = data.get("message", {})
                            content = message.get("content", "")
                            done = data.get("done", False)
                            yield f"data: {json.dumps({'content': content, 'done': done})}\n\n"
                        except json.JSONDecodeError:
                            continue
        except Exception as e:
            logger.error(f"Exception raised in stream_chat: {str(e)}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    async def stream_pull_model(self, model: str) -> AsyncGenerator[str, None]:
        """
        Invokes Ollama library download and streams real-time status and progress percentage.
        """
        payload = {"name": model, "stream": True}
        
        try:
            async with httpx.AsyncClient(timeout=600.0) as client:
                async with client.stream("POST", f"{self.host}/api/pull", json=payload) as response:
                    if response.status_code != 200:
                        yield f"data: {json.dumps({'error': f'Failed with status code {response.status_code}'})}\n\n"
                        return
                        
                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        try:
                            data = json.loads(line)
                            status = data.get("status", "")
                            completed = data.get("completed", 0)
                            total = data.get("total", 0)
                            
                            percentage = 0
                            if total > 0:
                                percentage = int((completed / total) * 100)
                                
                            yield f"data: {json.dumps({'status': status, 'percentage': percentage})}\n\n"
                        except json.JSONDecodeError:
                            continue
        except Exception as e:
            logger.error(f"Exception raised in stream_pull_model: {str(e)}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
