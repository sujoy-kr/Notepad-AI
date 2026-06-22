"use client";

/**
 * ChatPanel Component.
 * 
 * Implements the right sidebar panel showing a streaming conversation thread 
 * with the AI document assistant. Automatically scrolls to the bottom on new messages.
 */

import React, { useRef, useEffect } from "react";
import { ChatMessage } from "../services/api";

interface ChatPanelProps {
  isOpen: boolean;
  messages: ChatMessage[];
  chatInput: string;
  onChangeChatInput: (val: string) => void;
  isStreaming: boolean;
  onSendMessage: () => void;
  onClearChat: () => void;
  activeNoteId: string | null;
}

function parseMarkdown(text: string): React.ReactNode {
  if (!text) return "";
  
  const lines = text.split("\n");
  return lines.map((line, lineIndex) => {
    const tokenRegex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
    const parts = line.split(tokenRegex);
    
    const renderedLine = parts.map((part, partIndex) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={partIndex} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code 
            key={partIndex} 
            style={{ 
              fontFamily: "var(--font-mono)", 
              background: "rgba(255,255,255,0.06)", 
              padding: "2px 4px", 
              borderRadius: "3px",
              fontSize: "0.9em",
              border: "1px solid var(--border-color)"
            }}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });

    return (
      <React.Fragment key={lineIndex}>
        {renderedLine}
        {lineIndex < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}

export default function ChatPanel({
  isOpen,
  messages,
  chatInput,
  onChangeChatInput,
  isStreaming,
  onSendMessage,
  onClearChat,
  activeNoteId,
}: ChatPanelProps) {
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to keep the latest message visible
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  if (!isOpen) return null;

  return (
    <aside className="panel-card" style={{ height: "100%", background: "#0b0c10" }}>
      
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--border-color)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(0,0,0,0.12)",
        }}
      >
        <h2
          style={{
            fontSize: "13px",
            fontWeight: "600",
            color: "var(--text-primary)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <svg
            width="14"
            height="14"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Document Assistant
        </h2>
        <button
          onClick={onClearChat}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            fontSize: "11px",
            fontWeight: "500",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
          title="Clear Chat"
        >
          Clear
        </button>
      </div>

      {/* Message Thread */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                color: "var(--text-muted)",
                marginBottom: "5px",
                padding: "0 4px",
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              {msg.role === "user" ? "You" : "Assistant"}
            </div>
            <div
              className={`chat-bubble ${
                msg.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"
              }`}
            >
              {parseMarkdown(msg.content)}
            </div>
          </div>
        ))}
        {isStreaming && messages.length > 0 && messages[messages.length - 1].content === "" && (
          <div style={{ color: "var(--text-muted)", fontSize: "11px", fontStyle: "italic", padding: "0 6px" }}>
            Assistant is thinking...
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input panel */}
      <div
        style={{
          padding: "16px",
          borderTop: "1px solid var(--border-color)",
          background: "rgba(0, 0, 0, 0.18)",
        }}
      >
        <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
          <textarea
            placeholder={activeNoteId ? "Ask me about this note..." : "Select a note to chat..."}
            value={chatInput}
            onChange={(e) => onChangeChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSendMessage();
              }
            }}
            disabled={!activeNoteId}
            rows={2}
            style={{
              flex: 1,
              padding: "10px 12px",
              background: "var(--bg-primary)",
              border: "1px solid var(--border-color)",
              color: "var(--text-primary)",
              borderRadius: "8px",
              fontSize: "13px",
              outline: "none",
              resize: "none",
              lineHeight: "1.4",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-focus)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}
          />
          <button
            onClick={onSendMessage}
            disabled={!chatInput.trim() || isStreaming || !activeNoteId}
            className="tactile-button tactile-button-primary"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
