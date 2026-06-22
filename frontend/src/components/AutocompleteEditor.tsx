"use client";

/**
 * AutocompleteEditor Component.
 * 
 * Implements a dual-layer notepad input system:
 * 1. A transparent, active `<textarea>` on the top layer allowing standard editing.
 * 2. A pointer-events-disabled `<div>` on the background layer replicating identical size,
 *    padding, font-family, and scrolling styles.
 * 
 * When a suggestion is retrieved, the overlay renders the prefix text (color: transparent),
 * followed by the suggestion (color: gray / italic), followed by the rest of the text.
 */

import React, { useRef, useState, useEffect, useCallback } from "react";

interface AutocompleteEditorProps {
  value: string;
  onChange: (val: string) => void;
  selectedModel: string;
  debounceDelay: number;
  backendUrl: string;
  temperature: number;
  maxTokens: number;
  contextChars: number;
  onSuggestionStatusChange?: (fetching: boolean) => void;
}

export default function AutocompleteEditor({
  value,
  onChange,
  selectedModel,
  debounceDelay = 200,
  backendUrl = "http://localhost:8000",
  temperature = 0.1,
  maxTokens = 5,
  contextChars = 1500,
  onSuggestionStatusChange,
}: AutocompleteEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  
  const [suggestion, setSuggestion] = useState("");
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [isFetching, setIsFetching] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const lastRequestText = useRef<string>("");

  // Re-sync scroll offsets between textarea and ghost text overlay
  const syncScroll = () => {
    if (textareaRef.current && ghostRef.current) {
      ghostRef.current.scrollTop = textareaRef.current.scrollTop;
      ghostRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const setFetching = (fetching: boolean) => {
    setIsFetching(fetching);
    if (onSuggestionStatusChange) {
      onSuggestionStatusChange(fetching);
    }
  };

  // Queries the FastAPI backend for autocomplete suggestions
  const fetchSuggestion = useCallback(
    async (textBeforeCursor: string, index: number) => {
      if (!textBeforeCursor || textBeforeCursor.trim() === "") {
        setSuggestion("");
        return;
      }

      if (lastRequestText.current === textBeforeCursor) {
        return;
      }
      
      lastRequestText.current = textBeforeCursor;
      setFetching(true);

      try {
        const response = await fetch(`${backendUrl}/api/complete`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: textBeforeCursor,
            model: selectedModel,
            max_tokens: maxTokens,
            temperature: temperature,
            context_chars: contextChars,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const newSuggestion = data.suggestion || "";
          
          // Verify that the user hasn't moved their cursor or typed before displaying
          if (textareaRef.current && textareaRef.current.selectionStart === index) {
            setSuggestion(newSuggestion);
            setSuggestionIndex(index);
          }
        }
      } catch (err) {
        console.error("Autocomplete backend connection error:", err);
      } finally {
        setFetching(false);
      }
    },
    [backendUrl, selectedModel, maxTokens, temperature, contextChars]
  );

  // Triggers debounced autocomplete queries
  const triggerAutocomplete = useCallback(
    (text: string, cursorIndex: number) => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      // Hide active suggestion while typing
      setSuggestion(""); 

      const textBeforeCursor = text.substring(0, cursorIndex);
      
      debounceTimer.current = setTimeout(() => {
        fetchSuggestion(textBeforeCursor, cursorIndex);
      }, debounceDelay);
    },
    [fetchSuggestion, debounceDelay]
  );

  // Key event listeners: Intercepts TAB to insert suggestion
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab" && suggestion) {
      e.preventDefault(); // Stop focus shift
      
      const textarea = textareaRef.current;
      if (!textarea) return;

      const cursorIndex = textarea.selectionStart;
      const textBefore = value.substring(0, cursorIndex);
      const textAfter = value.substring(textarea.selectionEnd);
      
      const newValue = textBefore + suggestion + textAfter;
      onChange(newValue);
      
      const newCursorPos = cursorIndex + suggestion.length;
      
      // Focus textarea and move cursor after inserted suggestion in next render cycle
      setTimeout(() => {
        if (textarea) {
          textarea.focus();
          textarea.setSelectionRange(newCursorPos, newCursorPos);
          setSuggestion("");
          syncScroll();
        }
      }, 0);
    } else if (e.key === "Escape") {
      setSuggestion(""); // Clear on Escape
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    const cursorIndex = e.target.selectionStart;
    triggerAutocomplete(newValue, cursorIndex);
  };

  const handleCursorMove = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const cursorIndex = textarea.selectionStart;
    
    // Clear suggestion if cursor moves away from suggestion trigger index
    if (suggestion && cursorIndex !== suggestionIndex) {
      setSuggestion("");
    }
  };

  // Keep scroll synchronized on component modifications
  useEffect(() => {
    syncScroll();
  }, [value, suggestion]);

  // Clean timers on component teardowns
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const textBeforeSuggestion = value.substring(0, suggestionIndex);
  const textAfterSuggestion = value.substring(suggestionIndex);

  return (
    <div className="editor-container">
      <textarea
        ref={textareaRef}
        className="editor-textarea"
        value={value}
        onChange={handleTextareaChange}
        onKeyDown={handleKeyDown}
        onSelect={handleCursorMove}
        onScroll={syncScroll}
        placeholder="Start writing... Press Tab to autocomplete suggestions."
        spellCheck="false"
      />
      <div ref={ghostRef} className="editor-ghost-overlay">
        <span>{textBeforeSuggestion}</span>
        {suggestion && (
          <span className="ghost-text-suggestion">{suggestion}</span>
        )}
        <span>{textAfterSuggestion}</span>
      </div>
    </div>
  );
}
