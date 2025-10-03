// frontend/app/components/ChatInterface.js
"use client";

import { useState, useEffect, useRef, useCallback, memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import Image from "next/image";

export default function ChatInterface({
  session,
  character,
  onCreateSession,
  sidebarOpen,
  onToggleSidebar,
}) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Adjust UI when virtual keyboard / viewport changes (mobile browsers)
  useEffect(() => {
    function updateKeyboard() {
      if (window.visualViewport) {
        const vh = window.visualViewport.height;
        const ih = window.innerHeight;
        const kb = Math.max(0, ih - vh);
        setKeyboardHeight(kb);
      } else {
        setKeyboardHeight(0);
      }
    }

    updateKeyboard();

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", updateKeyboard);
      window.visualViewport.addEventListener("scroll", updateKeyboard);
    }
    window.addEventListener("resize", updateKeyboard);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", updateKeyboard);
        window.visualViewport.removeEventListener("scroll", updateKeyboard);
      }
      window.removeEventListener("resize", updateKeyboard);
    };
  }, []);

  const loadMessages = useCallback(async () => {
    if (!session) {
      setMessages([]);
      return;
    }

    try {
      const response = await fetch(`/api/sessions/${session.id}`);
      const result = await response.json();
      if (result.success) {
        setMessages(result.messages);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  }, [session]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // When keyboard height changes, ensure messages area has enough bottom padding and scroll to bottom
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.style.paddingBottom = keyboardHeight
        ? `${keyboardHeight + 120}px`
        : "";
    }
    // scroll after layout adjusts
    setTimeout(() => scrollToBottom(), 80);
  }, [keyboardHeight]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleImageUpload = async (files) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const uploadedImagesList = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Update progress
        setUploadProgress(((i + 1) / files.length) * 100);

        const formData = new FormData();
        formData.append("image", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (result.success) {
          uploadedImagesList.push(result.image);
        } else {
          console.error("Failed to upload image:", result.error);
          // You could show a toast notification here
        }
      }

      setUploadedImages((prev) => [...prev, ...uploadedImagesList]);
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const removeUploadedImage = (index) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleImageUpload(files);
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/")
    );

    if (files.length > 0) {
      handleImageUpload(files);
    }
  };

  const handleSendMessage = async () => {
    if ((!inputMessage.trim() && uploadedImages.length === 0) || loading)
      return;

    let currentSession = session;

    // Create new session if none exists
    if (!currentSession) {
      currentSession = await onCreateSession();
      if (!currentSession) return;
    }

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: inputMessage.trim() || "📷 Image(s) shared",
      timestamp: new Date().toISOString(),
      images: uploadedImages.length > 0 ? uploadedImages : undefined,
    };

    console.log(
      `📤 [Frontend] Sending message with ${uploadedImages.length} images`
    );
    if (uploadedImages.length > 0) {
      uploadedImages.forEach((img, index) => {
        console.log(
          `📷 [Frontend] Image ${index + 1}: ${img.mimeType}, ${Math.round(
            img.data.length / 1024
          )}KB`
        );
      });
    }

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setUploadedImages([]); // Clear uploaded images after sending
    setLoading(true);
    setTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: currentSession.id,
          message: userMessage.content,
          characterId: character?.id || currentSession.character_id,
          images: uploadedImages.length > 0 ? uploadedImages : undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessages((prev) => [...prev, result.message]);
      } else {
        console.error("Chat API error:", result.error);

        // Provide specific error messages based on the error type
        let errorMessage =
          "Sorry, I encountered an error processing your message. Please try again.";

        if (
          result.error?.includes("overloaded") ||
          result.error?.includes("503") ||
          result.error?.includes("Service Unavailable")
        ) {
          errorMessage =
            "I'm experiencing high demand right now 😅 Please wait a moment and try again! ✨";
        } else if (
          result.error?.includes("timeout") ||
          result.error?.includes("temporarily unavailable")
        ) {
          errorMessage =
            "I'm temporarily busy - please give me a moment and try again! 🙏💫";
        }

        // Add error message
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            role: "assistant",
            content: errorMessage,
            timestamp: new Date().toISOString(),
            isError: true,
          },
        ]);
      }
    } catch (error) {
      console.error("Failed to send message:", error);

      let errorMessage =
        "Sorry, I encountered a network error. Please check your connection and try again.";

      // Handle specific network errors
      if (error.message?.includes("fetch")) {
        errorMessage =
          "Having trouble connecting right now 🌐 Please check your internet and try again!";
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: errorMessage,
          timestamp: new Date().toISOString(),
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
      setTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      if (!loading && (inputMessage.trim() || uploadedImages.length > 0)) {
        handleSendMessage();
      }
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const MessageBubble = memo(({ message, isUser, character }) => {
    const isCharacter = message.role === "assistant";

    return (
      <div
        className={`flex mb-4 px-4 ${isUser ? "justify-end" : "justify-start"}`}
      >
        <div
          className={`flex max-w-[85%] md:max-w-[70%] ${
            isUser ? "flex-row-reverse" : "flex-row"
          } items-start gap-3`}
        >
          {/* Avatar */}
          <div className="flex-shrink-0">
            {isCharacter && character?.avatar_url ? (
              <Image
                src={character.avatar_url}
                alt={character.name}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover shadow-md"
              />
            ) : (
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md ${
                  isUser
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600"
                    : "bg-gradient-to-r from-gray-500 to-gray-600"
                }`}
              >
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  {isUser ? (
                    <path
                      fillRule="evenodd"
                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                      clipRule="evenodd"
                    />
                  ) : (
                    <path
                      fillRule="evenodd"
                      d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  )}
                </svg>
              </div>
            )}
          </div>

          {/* Message Bubble */}
          <div
            className={`relative rounded-2xl px-4 py-3 shadow-lg break-words ${
              isUser
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                : "bg-white text-gray-900 border border-gray-200"
            }`}
          >
            {/* Character name for assistant messages */}
            {isCharacter && character && (
              <div className="mb-2 text-sm font-semibold text-blue-600">
                {character.name}
              </div>
            )}

            {/* Images display */}
            {message.images && message.images.length > 0 && (
              <div className="mb-3">
                <div
                  className={`grid gap-2 ${
                    message.images.length === 1 ? "grid-cols-1" : "grid-cols-2"
                  }`}
                >
                  {message.images.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={`data:${image.mimeType};base64,${image.data}`}
                        alt={image.name}
                        className="rounded-lg max-w-full h-auto max-h-64 object-cover border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => {
                          // Create a modal or new window to view full image
                          const newWindow = window.open();
                          newWindow.document.write(`
                            <html>
                              <head><title>${image.name}</title></head>
                              <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#000;">
                                <img src="data:${image.mimeType};base64,${image.data}" style="max-width:100%;max-height:100vh;object-fit:contain;" />
                              </body>
                            </html>
                          `);
                        }}
                      />
                      <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        {image.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Message content */}
            <div className="mb-2">
              {isUser ? (
                <div className="text-sm leading-relaxed">{message.content}</div>
              ) : (
                <div className="text-sm leading-relaxed">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => (
                        <div className="mb-2 last:mb-0">{children}</div>
                      ),
                      code: ({ children, inline }) =>
                        inline ? (
                          <span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                            {children}
                          </span>
                        ) : (
                          <pre className="bg-gray-100 p-3 rounded-lg text-xs font-mono overflow-x-auto mt-2">
                            <code>{children}</code>
                          </pre>
                        ),
                      ul: ({ children }) => (
                        <ul className="list-disc ml-4 mb-2">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal ml-4 mb-2">{children}</ol>
                      ),
                      li: ({ children }) => (
                        <li className="mb-1">{children}</li>
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>

            {/* Timestamp */}
            <div
              className={`text-xs ${
                isUser ? "text-blue-100" : "text-gray-500"
              }`}
            >
              {formatTime(message.timestamp)}
            </div>

            {/* Message tail */}
            <div
              className={`absolute top-3 w-3 h-3 transform rotate-45 ${
                isUser
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 -right-1"
                  : "bg-white border-l border-t border-gray-200 -left-1"
              }`}
            />
          </div>
        </div>
      </div>
    );
  });
  MessageBubble.displayName = "MessageBubble";

  const memoizedMessages = useMemo(
    () =>
      messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          isUser={message.role === "user"}
          character={character}
        />
      )),
    [messages, character]
  );

  const TypingIndicator = () => (
    <div className="flex justify-start mb-4 px-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {character?.avatar_url ? (
            <Image
              src={character.avatar_url}
              alt={character.name}
              width={40}
              height={40}
              className="w-10 h-10 rounded-full object-cover shadow-md"
            />
          ) : (
            <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-md bg-gradient-to-r from-gray-500 to-gray-600">
              <svg
                className="w-5 h-5 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl px-4 py-3 shadow-lg border border-gray-200 flex items-center gap-3">
          <div className="flex space-x-1">
            <div
              className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <div
              className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <div
              className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
          <span className="text-sm text-gray-600">
            {character?.name || "AI"} is typing...
          </span>

          {/* Message tail */}
          <div className="absolute top-3 w-3 h-3 transform rotate-45 bg-white border-l border-t border-gray-200 -left-1" />
        </div>
      </div>
    </div>
  );

  if (!session) {
    return (
      <div
        className={`flex-1 flex flex-col items-center justify-center p-8 min-h-screen transition-all duration-300 ${
          sidebarOpen ? "md:ml-0" : "md:-ml-80"
        }`}
      >
        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-lg mb-6">
          <svg
            className="w-8 h-8 text-white"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-600 mb-4">
          Ready to Chat!
        </h2>
        <p className="text-gray-500 text-center max-w-md mb-8 leading-relaxed">
          Welcome to your AI assistant. You can now start chatting!
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-white">
      {/* Drag and Drop Overlay */}
      {dragOver && (
        <div className="fixed inset-0 bg-blue-500 bg-opacity-20 border-4 border-dashed border-blue-500 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 shadow-xl text-center">
            <svg
              className="w-16 h-16 text-blue-500 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Drop images here
            </h3>
            <p className="text-gray-600">Release to upload your images</p>
          </div>
        </div>
      )}

      {/* Simple Header */}
      <div className="bg-white border-b border-gray-200 p-3">
        <div className="flex items-center gap-3">
          {/* Menu button for mobile */}
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <h1 className="text-lg font-semibold text-gray-900">
            {session?.title || "Chat"}
          </h1>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="py-6">
          {memoizedMessages}
          {typing && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div
        className="bg-white border-t border-blue-200 p-4 shadow-lg"
        style={{
          paddingBottom: keyboardHeight ? keyboardHeight + 12 : undefined,
        }}
      >
        {/* Image Upload Preview */}
        {uploadedImages.length > 0 && (
          <div className="max-w-4xl mx-auto mb-4">
            <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              {uploadedImages.map((image, index) => (
                <div key={index} className="relative group">
                  <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-300 bg-white">
                    <img
                      src={`data:${image.mimeType};base64,${image.data}`}
                      alt={image.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeUploadedImage(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                  >
                    ×
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg truncate">
                    {image.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div className="max-w-4xl mx-auto mb-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <svg
                  className="w-5 h-5 text-blue-600 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <div className="flex-1">
                  <div className="flex justify-between text-sm text-blue-700 mb-1">
                    <span>Uploading images...</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
        />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
        >
          <div className="relative max-w-4xl mx-auto">
            <textarea
              ref={inputRef}
              onFocus={() => {
                // ensure input is visible when keyboard opens
                setTimeout(() => {
                  inputRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                }, 50);
              }}
              rows={1}
              placeholder="Type your message or upload images..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
              className="w-full px-6 py-4 pr-24 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-white shadow-sm resize-none min-h-[56px] max-h-32 overflow-y-auto text-gray-900 placeholder-gray-500"
              style={{
                height: "auto",
                minHeight: "56px",
              }}
              onInput={(e) => {
                e.target.style.height = "auto";
                e.target.style.height =
                  Math.min(e.target.scrollHeight, 128) + "px";
              }}
            />

            {/* Image Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || uploading}
              className="absolute right-16 bottom-3 p-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              title="Upload Images"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={
                (!inputMessage.trim() && uploadedImages.length === 0) || loading
              }
              className="absolute right-3 bottom-3 p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200 shadow-lg"
            >
              {loading ? (
                <svg
                  className="w-5 h-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              )}
            </button>
          </div>
        </form>

        {/* Simple disclosure message - Always visible */}
        <div className="mt-3 max-w-4xl mx-auto text-center">
          <p className="text-xs text-gray-500">
            This chatbot may make mistakes. Please verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}
