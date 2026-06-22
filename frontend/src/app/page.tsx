"use client";

/**
 * Notepad AI - Home Dashboard Orchestrator.
 * 
 * Manages central states including note listings, active selected note workspace,
 * AI assistant chat session history, local Ollama daemon connection health,
 * and user preference sliders.
 * 
 * Auto-save details:
 * - Uses a React ref `activeNoteIdRef` and a boolean `contentChangedRef` to keep
 *   track of modifications across active slots.
 * - Saves notes in a debounced PUT request (`1.2s` delay) to prevent hammering
 *   the database during active typing sessions.
 * - Switches between notes safely by committing any unsaved changes to the previous
 *   note *before* loading new data.
 */

import React, { useState, useEffect, useRef } from "react";
import Sidebar from "../components/Sidebar";
import AutocompleteEditor from "../components/AutocompleteEditor";
import ChatPanel from "../components/ChatPanel";
import { Note, ChatMessage, notesApi, aiApi, BACKEND_URL } from "../services/api";

export default function Home() {
  // notes DB records
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  
  // Active editor states
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingSuggestion, setIsFetchingSuggestion] = useState(false);

  // Autocomplete & LLM preferences
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState("qwen2.5-coder:0.5b");
  const [temperature, setTemperature] = useState(0.1);
  const [debounceDelay, setDebounceDelay] = useState(200);
  const [maxTokens, setMaxTokens] = useState(5);
  const [contextChars, setContextChars] = useState(1500);

  // Model pulling states
  const [pullModelName, setPullModelName] = useState("");
  const [pullStatus, setPullStatus] = useState("");
  const [pullPercentage, setPullPercentage] = useState(0);

  // Chat panel states
  const [chatOpen, setChatOpen] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatStreaming, setIsChatStreaming] = useState(false);

  // Connection monitoring
  const [ollamaStatus, setOllamaStatus] = useState<"online" | "offline" | "checking">("checking");

  // Keep references to prevent race conditions during async autosave operations
  const activeNoteIdRef = useRef<string | null>(null);
  const contentChangedRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch list of notes from backend
  const loadNotesList = async () => {
    try {
      const data = await notesApi.getAll();
      setNotes(data);
      // Auto-load first note if none is selected
      if (data.length > 0 && !activeNoteIdRef.current) {
        loadNoteContent(data[0].id);
      }
    } catch (err) {
      console.error("Notes list fetch error:", err);
    }
  };

  // Check models available on the local Ollama instance
  const loadModelsList = async () => {
    try {
      const availableModels = await aiApi.getModels();
      setModels(availableModels);
      setOllamaStatus("online");

      if (availableModels.length > 0) {
        if (availableModels.includes("qwen2.5-coder:0.5b") && !selectedModel) {
          setSelectedModel("qwen2.5-coder:0.5b");
        } else if (!availableModels.includes(selectedModel)) {
          setSelectedModel(availableModels[0]);
        }
      }
    } catch (err) {
      setOllamaStatus("offline");
      console.error("Ollama models list check error:", err);
    }
  };

  // Initial mount load and check routines
  useEffect(() => {
    loadNotesList();
    loadModelsList();
    const interval = setInterval(loadModelsList, 10000);
    return () => clearInterval(interval);
  }, []);

  // Safe load of note detail contents
  const loadNoteContent = async (id: string) => {
    // If previous note has unsaved changes, save immediately to prevent loss
    if (activeNoteIdRef.current && contentChangedRef.current) {
      await saveNoteDirectly(activeNoteIdRef.current, noteTitle, noteContent);
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    try {
      const note = await notesApi.getById(id);
      activeNoteIdRef.current = id;
      setActiveNoteId(id);
      setNoteTitle(note.title);
      setNoteContent(note.content);
      contentChangedRef.current = false;

      // Reset greeting context dynamically depending on title state
      const isUntitled = !note.title || note.title === "Untitled Note" || note.title.trim() === "";
      const assistantGreeting = isUntitled
        ? "Hello! I've loaded your new note. How can I help you brainstorm, outline, or draft your ideas today?"
        : `Hello! I have loaded your note "**${note.title}**". Feel free to ask me to write, edit, summarize or analyze the contents!`;

      setChatMessages([
        {
          role: "assistant",
          content: assistantGreeting,
        },
      ]);
    } catch (err) {
      console.error("Failed to load note content details:", err);
    }
  };

  const handleCreateNote = async () => {
    try {
      const note = await notesApi.create("Untitled Note", "");
      await loadNotesList();
      loadNoteContent(note.id);
    } catch (err) {
      console.error("Failed to create new note:", err);
    }
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this note?")) return;

    try {
      await notesApi.delete(id);
      if (activeNoteId === id) {
        activeNoteIdRef.current = null;
        setActiveNoteId(null);
        setNoteTitle("");
        setNoteContent("");
      }
      await loadNotesList();
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  };

  // Immediate save trigger
  const saveNoteDirectly = async (id: string, title: string, content: string) => {
    setIsSaving(true);
    try {
      await notesApi.update(id, title, content);
      contentChangedRef.current = false;
      
      // Update local array title/timestamps
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, title, content } : n))
      );
    } catch (err) {
      console.error("Auto-save write failure:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Schedules debounced auto-save triggers
  const queueAutosave = (id: string, title: string, content: string) => {
    contentChangedRef.current = true;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveNoteDirectly(id, title, content);
    }, 1200);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNoteTitle(val);
    if (activeNoteId) {
      queueAutosave(activeNoteId, val, noteContent);
    }
  };

  const handleContentChange = (val: string) => {
    setNoteContent(val);
    if (activeNoteId) {
      queueAutosave(activeNoteId, noteTitle, val);
    }
  };

  // Triggers streaming assistant completions
  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || isChatStreaming || !activeNoteId) return;

    const userMessage: ChatMessage = { role: "user", content: chatInput };
    const updatedHistory = [...chatMessages, userMessage];

    setChatMessages(updatedHistory);
    setChatInput("");
    setIsChatStreaming(true);

    // Append empty placeholder for assistant response stream
    setChatMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    let assistantResponse = "";

    await aiApi.streamChat(
      updatedHistory,
      noteContent,
      selectedModel,
      (chunk) => {
        assistantResponse += chunk;
        setChatMessages((prev) => {
          const next = [...prev];
          if (next.length > 0) {
            next[next.length - 1] = {
              role: "assistant",
              content: assistantResponse,
            };
          }
          return next;
        });
      },
      () => {
        setIsChatStreaming(false);
      },
      (error) => {
        console.error("Chat panel streaming error:", error);
        setChatMessages((prev) => [
          ...prev.slice(0, -1),
          {
            role: "assistant",
            content: "Sorry, I encountered an error communicating with the local AI. Please verify that your Ollama server is running.",
          },
        ]);
        setIsChatStreaming(false);
      }
    );
  };

  // Triggers model tag download streams
  const handlePullModel = async () => {
    if (!pullModelName.trim()) return;
    setPullStatus("Connecting...");
    setPullPercentage(0);

    await aiApi.pullModel(
      pullModelName.trim(),
      (statusText, percent) => {
        setPullStatus(statusText);
        setPullPercentage(percent);
      },
      () => {
        setPullStatus("Successfully downloaded model!");
        setPullModelName("");
        loadModelsList(); // Refresh lists
      },
      (error) => {
        setPullStatus(`Pull failed: ${error}`);
      }
    );
  };

  const handleClearChat = () => {
    setChatMessages([
      { role: "assistant", content: "Chat history cleared. How can I help you write?" },
    ]);
  };

  const wordCount = noteContent.trim() ? noteContent.trim().split(/\s+/).length : 0;
  const charCount = noteContent.length;

  return (
    <div
      className={`app-container ${!chatOpen ? "chat-collapsed" : ""}`}
    >
      {/* 1. Left Sidebar Card Panel */}
      <Sidebar
        notes={notes}
        activeNoteId={activeNoteId}
        onSelectNote={loadNoteContent}
        onCreateNote={handleCreateNote}
        onDeleteNote={handleDeleteNote}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
        models={models}
        debounceDelay={debounceDelay}
        onChangeDebounce={setDebounceDelay}
        maxTokens={maxTokens}
        onChangeMaxTokens={setMaxTokens}
        contextChars={contextChars}
        onChangeContextChars={setContextChars}
        ollamaStatus={ollamaStatus}
        pullModelName={pullModelName}
        onChangePullModelName={setPullModelName}
        onPullModel={handlePullModel}
        pullStatus={pullStatus}
        pullPercentage={pullPercentage}
      />

      {/* 2. Middle Editor workspace panel */}
      <main className="panel-card" style={{ height: "100%" }}>
        <header
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(0,0,0,0.12)",
          }}
        >
          {activeNoteId ? (
            <input
              type="text"
              className="note-title-input"
              value={noteTitle}
              onChange={handleTitleChange}
              placeholder="Note Title"
            />
          ) : (
            <div style={{ fontSize: "14px", color: "var(--text-muted)", paddingLeft: "8px" }}>No note selected</div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* Save status */}
            <span
              style={{
                fontSize: "11px",
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontWeight: "500",
              }}
            >
              {isSaving ? (
                <>
                  <svg
                    className="animate-spin"
                    width="12"
                    height="12"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray="30 10"
                      style={{ transformOrigin: "center" }}
                    ></circle>
                  </svg>
                  Saving...
                </>
              ) : activeNoteId ? (
                "Saved"
              ) : null}
            </span>

            {/* AI Autocomplete state dot */}
            <span
              style={{
                fontSize: "11px",
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontWeight: "500",
              }}
            >
              {isFetchingSuggestion ? (
                <>
                  <span
                    className="animate-pulse"
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "var(--accent-color)",
                    }}
                  ></span>
                  AI Suggesting...
                </>
              ) : (
                <>
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "var(--success-color)",
                    }}
                  ></span>
                  AI Ready
                </>
              )}
            </span>

            {/* Collapsible Chat assistant toggle */}
            <button
              className="tactile-button"
              onClick={() => setChatOpen(!chatOpen)}
              style={{
                padding: "6px 12px",
                fontSize: "11px",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <svg
                width="13"
                height="13"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {chatOpen ? "Hide Chat" : "Chat Assistant"}
            </button>
          </div>
        </header>

        {/* Text Area Content */}
        <div style={{ flex: 1, overflow: "hidden", background: "transparent" }}>
          {activeNoteId ? (
            <AutocompleteEditor
              value={noteContent}
              onChange={handleContentChange}
              selectedModel={selectedModel}
              debounceDelay={debounceDelay}
              backendUrl={BACKEND_URL}
              temperature={temperature}
              maxTokens={maxTokens}
              contextChars={contextChars}
              onSuggestionStatusChange={setIsFetchingSuggestion}
            />
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "var(--text-muted)",
                gap: "12px",
              }}
            >
              <svg
                width="40"
                height="40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M9 13h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V20a2 2 0 01-2 2z" />
              </svg>
              <p style={{ fontSize: "13px" }}>Select or create a note to begin writing.</p>
            </div>
          )}
        </div>

        {/* Info stats */}
        {activeNoteId && (
          <footer
            style={{
              padding: "8px 24px",
              borderTop: "1px solid var(--border-color)",
              background: "rgba(0,0,0,0.1)",
              display: "flex",
              justifyContent: "space-between",
              fontSize: "11px",
              color: "var(--text-muted)",
            }}
          >
            <div>
              Words:{" "}
              <span style={{ color: "var(--text-secondary)", fontWeight: "500" }}>
                {wordCount}
              </span>{" "}
              &nbsp;&bull;&nbsp; Characters:{" "}
              <span style={{ color: "var(--text-secondary)", fontWeight: "500" }}>
                {charCount}
              </span>
            </div>
            <div>Auto-save Enabled</div>
          </footer>
        )}
      </main>

      {/* 3. Right Chat Assistant Sidebar */}
      <ChatPanel
        isOpen={chatOpen}
        messages={chatMessages}
        chatInput={chatInput}
        onChangeChatInput={setChatInput}
        isStreaming={isChatStreaming}
        onSendMessage={handleSendChatMessage}
        onClearChat={handleClearChat}
        activeNoteId={activeNoteId}
      />
    </div>
  );
}
