/**
 * Notepad AI - Client API services.
 * 
 * Provides TypeScript client wrappers around notes CRUD endpoints, next-word
 * autocomplete prediction endpoints, streaming document chat assistant connections,
 * and local Ollama model management utilities.
 */

export interface Note {
  id: string;
  title: string;
  content: string;
  updated_at: number;
}

export interface ChatMessage {
  role: string;
  content: string;
}

export const BACKEND_URL = "http://localhost:8000";

export const notesApi = {
  /**
   * Retrieves all notes from database, sorted by last updated timestamp.
   */
  async getAll(): Promise<Note[]> {
    const res = await fetch(`${BACKEND_URL}/api/notes`);
    if (!res.ok) throw new Error("Failed to retrieve notes list");
    return res.json();
  },

  /**
   * Fetches single note contents.
   */
  async getById(id: string): Promise<Note> {
    const res = await fetch(`${BACKEND_URL}/api/notes/${id}`);
    if (!res.ok) throw new Error(`Failed to load note contents for: ${id}`);
    return res.json();
  },

  /**
   * Inserts new note record.
   */
  async create(title: string, content: string): Promise<Note> {
    const res = await fetch(`${BACKEND_URL}/api/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    if (!res.ok) throw new Error("Failed to create new note");
    return res.json();
  },

  /**
   * Saves updated note title and content.
   */
  async update(id: string, title: string, content: string): Promise<Note> {
    const res = await fetch(`${BACKEND_URL}/api/notes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    if (!res.ok) throw new Error(`Failed to save note: ${id}`);
    return res.json();
  },

  /**
   * Deletes note record from database.
   */
  async delete(id: string): Promise<boolean> {
    const res = await fetch(`${BACKEND_URL}/api/notes/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error(`Failed to delete note: ${id}`);
    return true;
  },
};

export const aiApi = {
  /**
   * Fetches list of models locally serving.
   */
  async getModels(): Promise<string[]> {
    const res = await fetch(`${BACKEND_URL}/api/models`);
    if (!res.ok) throw new Error("Failed to check active models");
    const data = await res.json();
    return data.models || [];
  },

  /**
   * Triggers downloading new model tag, invoking stream progress percentage.
   */
  async pullModel(
    model: string,
    onProgress: (status: string, percentage: number) => void,
    onComplete: () => void,
    onError: (err: any) => void
  ): Promise<void> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/models/pull`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to initiate pull request");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.substring(6).trim());
              if (data.error) {
                onError(data.error);
              } else {
                onProgress(data.status, data.percentage || 0);
              }
            } catch (err) {
              // Ignore chunk boundaries parse anomalies
            }
          }
        }
      }
      onComplete();
    } catch (err) {
      onError(err);
    }
  },

  /**
   * Connects to SSE chat endpoint, returning real-time response completions.
   */
  async streamChat(
    messages: ChatMessage[],
    noteContent: string,
    model: string,
    onChunk: (content: string) => void,
    onComplete: () => void,
    onError: (err: any) => void
  ): Promise<void> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          note_content: noteContent,
          model,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to establish chat streaming stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.substring(6).trim());
              if (data.error) {
                onError(data.error);
              } else if (data.content) {
                onChunk(data.content);
              }
            } catch (err) {
              // Ignore chunk boundary parsing anomalies
            }
          }
        }
      }
      onComplete();
    } catch (err) {
      onError(err);
    }
  },
};
