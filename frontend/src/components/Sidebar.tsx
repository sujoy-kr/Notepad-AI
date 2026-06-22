"use client";

/**
 * Sidebar Component.
 * 
 * Provides notes navigation, new note creation, note removal triggers,
 * and a settings drawer managing Ollama parameters (selected model,
 * debouncing latency, model downloader status).
 */

import React from "react";
import { Note } from "../services/api";

interface SidebarProps {
  notes: Note[];
  activeNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onDeleteNote: (id: string, e: React.MouseEvent) => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  models: string[];
  debounceDelay: number;
  onChangeDebounce: (delay: number) => void;
  maxTokens: number;
  onChangeMaxTokens: (tokens: number) => void;
  contextChars: number;
  onChangeContextChars: (chars: number) => void;
  ollamaStatus: "online" | "offline" | "checking";
  pullModelName: string;
  onChangePullModelName: (name: string) => void;
  onPullModel: () => void;
  pullStatus: string;
  pullPercentage: number;
}

export default function Sidebar({
  notes,
  activeNoteId,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  selectedModel,
  onSelectModel,
  models,
  debounceDelay,
  onChangeDebounce,
  maxTokens,
  onChangeMaxTokens,
  contextChars,
  onChangeContextChars,
  ollamaStatus,
  pullModelName,
  onChangePullModelName,
  onPullModel,
  pullStatus,
  pullPercentage,
}: SidebarProps) {
  return (
    <aside className="panel-card" style={{ height: "100%" }}>
      
      {/* Header & New Note trigger */}
      <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border-color)", background: "rgba(0,0,0,0.12)" }}>
        <h2
          style={{
            fontSize: "15px",
            fontWeight: "600",
            letterSpacing: "-0.3px",
            marginBottom: "14px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background:
                ollamaStatus === "online"
                  ? "var(--success-color)"
                  : ollamaStatus === "offline"
                  ? "var(--error-color)"
                  : "var(--warning-color)",
            }}
            title={`Ollama: ${ollamaStatus}`}
          ></span>
          Notepad AI
        </h2>
        <button
          className="tactile-button tactile-button-primary"
          onClick={onCreateNote}
          style={{
            width: "100%",
            padding: "8px 12px",
            fontSize: "13px",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}
        >
          <svg
            width="12"
            height="12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path d="M12 4v16m8-8H4" />
          </svg>
          New Note
        </button>
      </div>

      {/* Note Lists */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 8px" }}>
        {notes.map((n) => (
          <div
            key={n.id}
            onClick={() => onSelectNote(n.id)}
            className={`note-item animate-fade-in ${activeNoteId === n.id ? "active" : ""}`}
          >
            <div
              style={{
                fontWeight: "500",
                fontSize: "13px",
                color: activeNoteId === n.id ? "var(--text-primary)" : "var(--text-secondary)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                paddingRight: "20px",
              }}
            >
              {n.title || "Untitled Note"}
            </div>
            <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>
              {new Date(n.updated_at * 1000).toLocaleDateString()}
            </div>

            <button
              onClick={(e) => onDeleteNote(n.id, e)}
              className={`delete-btn ${activeNoteId === n.id ? "active" : ""}`}
              title="Delete note"
            >
              <svg
                width="13"
                height="13"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
        {notes.length === 0 && (
          <div
            style={{
              padding: "30px 20px",
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: "12px",
              lineHeight: "1.5",
            }}
          >
            No notes yet.<br />Click 'New Note' to start.
          </div>
        )}
      </div>

      {/* Preferences Drawer */}
      <div
        style={{
          padding: "16px",
          borderTop: "1px solid var(--border-color)",
          background: "rgba(0, 0, 0, 0.22)",
        }}
      >
        <h3
          style={{
            fontSize: "11px",
            fontWeight: "600",
            textTransform: "uppercase",
            letterSpacing: "0.8px",
            color: "var(--text-muted)",
            marginBottom: "12px",
          }}
        >
          Preferences
        </h3>

        {/* Model dropdown */}
        <div style={{ marginBottom: "14px" }}>
          <label
            style={{
              display: "block",
              fontSize: "10px",
              fontWeight: "500",
              color: "var(--text-secondary)",
              marginBottom: "5px",
            }}
          >
            Active LLM Model
          </label>
          <select
            value={selectedModel}
            onChange={(e) => onSelectModel(e.target.value)}
            className="custom-select"
          >
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
            {models.length === 0 && (
              <option value="qwen2.5-coder:0.5b">qwen2.5-coder:0.5b (Default)</option>
            )}
          </select>
        </div>

        {/* Advanced Slider controls */}
        <details style={{ cursor: "pointer", marginBottom: "14px" }}>
          <summary
            style={{
              fontSize: "11px",
              fontWeight: "500",
              color: "var(--accent-color)",
              outline: "none",
              marginBottom: "8px",
              userSelect: "none",
            }}
          >
            Tuning & Performance
          </summary>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              padding: "6px 0",
              cursor: "default",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "10px",
                  color: "var(--text-secondary)",
                }}
              >
                <span>Debounce delay</span>
                <span>{debounceDelay}ms</span>
              </div>
              <input
                type="range"
                min="100"
                max="1000"
                step="50"
                value={debounceDelay}
                onChange={(e) => onChangeDebounce(Number(e.target.value))}
              />
            </div>

            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "10px",
                  color: "var(--text-secondary)",
                }}
              >
                <span>Max generated tokens</span>
                <span>{maxTokens}</span>
              </div>
              <input
                type="range"
                min="1"
                max="15"
                value={maxTokens}
                onChange={(e) => onChangeMaxTokens(Number(e.target.value))}
              />
            </div>

            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "10px",
                  color: "var(--text-secondary)",
                }}
              >
                <span>Context window</span>
                <span>{contextChars} chars</span>
              </div>
              <input
                type="range"
                min="500"
                max="3000"
                step="100"
                value={contextChars}
                onChange={(e) => onChangeContextChars(Number(e.target.value))}
              />
            </div>
          </div>
        </details>

        {/* Model Pull downloader */}
        <div
          style={{
            borderTop: "1px solid var(--border-color)",
            paddingTop: "12px",
          }}
        >
          <label
            style={{
              display: "block",
              fontSize: "10px",
              fontWeight: "500",
              color: "var(--text-secondary)",
              marginBottom: "5px",
            }}
          >
            Download model from Ollama
          </label>
          <div style={{ display: "flex", gap: "6px" }}>
            <input
              type="text"
              placeholder="e.g. llama3.2:1b"
              value={pullModelName}
              onChange={(e) => onChangePullModelName(e.target.value)}
              className="custom-input"
            />
            <button
              onClick={onPullModel}
              className="tactile-button"
              style={{ padding: "6px 10px", fontSize: "11px", fontWeight: "500" }}
            >
              Pull
            </button>
          </div>
          {pullStatus && (
            <div style={{ marginTop: "6px" }}>
              <div
                style={{
                  fontSize: "10px",
                  color: "var(--text-secondary)",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "120px",
                  }}
                >
                  {pullStatus}
                </span>
                {pullPercentage > 0 && <span>{pullPercentage}%</span>}
              </div>
              {pullPercentage > 0 && (
                <div
                  style={{
                    width: "100%",
                    height: "3px",
                    background: "var(--bg-tertiary)",
                    borderRadius: "2px",
                    marginTop: "3px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${pullPercentage}%`,
                      height: "100%",
                      background: "var(--accent-color)",
                      transition: "width 0.2s",
                    }}
                  ></div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Hotkey Guide */}
        <div style={{ borderTop: "1px solid var(--border-color)", marginTop: "12px", paddingTop: "10px", fontSize: "10px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
          <span>Press</span>
          <kbd className="kbd-badge">Tab ⇥</kbd>
          <span>to autocomplete</span>
        </div>

      </div>
    </aside>
  );
}
