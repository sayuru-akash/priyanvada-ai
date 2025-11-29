// frontend/app/components/ChatInterface.js
"use client";

import { useState, useEffect, useRef, useCallback, memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import Image from "next/image";
import { useCredit } from "../contexts/CreditContext";

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
  const [selectedImages, setSelectedImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [dragCounter, setDragCounter] = useState(0);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const { hasCredits, showCreditExhaustionModal } = useCredit();

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

  const handleImageUpload = useCallback(
    async (event) => {
      // Check credits before allowing image upload
      if (!hasCredits) {
        showCreditExhaustionModal();
        return;
      }

      const files = Array.from(event.target.files || []);
      if (files.length === 0) return;

      setUploadingImages(true);
      const uploadedImages = [];

      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];

          // Validate file type
          if (!file.type.startsWith("image/")) {
            alert(`${file.name} is not a valid image file.`);
            continue;
          }

          // Validate file size (10MB limit)
          if (file.size > 10 * 1024 * 1024) {
            alert(
              `${file.name} is too large. Please select images smaller than 10MB.`
            );
            continue;
          }

          // Set initial progress
          const progressId = `${file.name}-${Date.now()}`;
          setUploadProgress((prev) => ({
            ...prev,
            [progressId]: 0,
          }));

          const formData = new FormData();
          formData.append("image", file);

          // Simulate progress (since we can't track real upload progress easily)
          const progressInterval = setInterval(() => {
            setUploadProgress((prev) => ({
              ...prev,
              [progressId]: Math.min((prev[progressId] || 0) + 10, 90),
            }));
          }, 100);

          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          clearInterval(progressInterval);

          const result = await response.json();

          if (result.success) {
            setUploadProgress((prev) => ({
              ...prev,
              [progressId]: 100,
            }));

            uploadedImages.push({
              id: Date.now() + Math.random(),
              name: file.name,
              url: result.image.url,
              publicId: result.image.publicId,
              mimeType: result.image.mimeType,
              size: result.image.size,
              data: result.image.data, // Base64 for AI processing
            });

            // Remove progress after a delay
            setTimeout(() => {
              setUploadProgress((prev) => {
                const newProgress = { ...prev };
                delete newProgress[progressId];
                return newProgress;
              });
            }, 1000);
          } else {
            setUploadProgress((prev) => {
              const newProgress = { ...prev };
              delete newProgress[progressId];
              return newProgress;
            });
            alert(`Failed to upload ${file.name}: ${result.error}`);
          }
        }

        setSelectedImages((prev) => [...prev, ...uploadedImages]);
      } catch (error) {
        console.error("Error uploading images:", error);
        alert("Failed to upload images. Please try again.");
        setUploadProgress({});
      } finally {
        setUploadingImages(false);
        // Clear the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [hasCredits, showCreditExhaustionModal]
  );

  const removeImage = (imageId) => {
    setSelectedImages((prev) => prev.filter((img) => img.id !== imageId));
  };

  // Improved drag and drop handlers to prevent flickering
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();

    setDragCounter((prev) => prev + 1);

    // Only show drag overlay if we have files being dragged
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      const hasFiles = Array.from(e.dataTransfer.items).some(
        (item) => item.kind === "file" && item.type.startsWith("image/")
      );
      if (hasFiles) {
        setDragActive(true);
      }
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();

    setDragCounter((prev) => {
      const newCounter = prev - 1;
      if (newCounter === 0) {
        setDragActive(false);
      }
      return newCounter;
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Ensure we maintain the drag active state
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      const hasFiles = Array.from(e.dataTransfer.items).some(
        (item) => item.kind === "file" && item.type.startsWith("image/")
      );
      if (hasFiles && dragCounter > 0) {
        setDragActive(true);
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    setDragActive(false);
    setDragCounter(0);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (imageFiles.length > 0) {
      // Create a fake event object for the upload handler
      const fakeEvent = {
        target: {
          files: imageFiles,
        },
      };
      handleImageUpload(fakeEvent);
    }
  };

  // Handle paste events for images
  useEffect(() => {
    const handlePaste = (e) => {
      const items = Array.from(e.clipboardData.items);
      const imageFiles = items.filter((item) => item.type.startsWith("image/"));

      if (imageFiles.length > 0) {
        const files = imageFiles
          .map((item) => item.getAsFile())
          .filter(Boolean);
        if (files.length > 0) {
          const fakeEvent = {
            target: { files },
          };
          handleImageUpload(fakeEvent);
        }
      }
    };

    // Cleanup drag state on window events
    const handleWindowDragEnd = () => {
      setDragActive(false);
      setDragCounter(0);
    };

    document.addEventListener("paste", handlePaste);
    window.addEventListener("dragend", handleWindowDragEnd);
    window.addEventListener("mouseup", handleWindowDragEnd);

    return () => {
      document.removeEventListener("paste", handlePaste);
      window.removeEventListener("dragend", handleWindowDragEnd);
      window.removeEventListener("mouseup", handleWindowDragEnd);
    };
  }, [handleImageUpload]);

  const handleSendMessage = async () => {
    // Check credits before allowing message send
    if (!hasCredits) {
      showCreditExhaustionModal();
      return;
    }

    if ((!inputMessage.trim() && selectedImages.length === 0) || loading)
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
      content: inputMessage.trim(),
      timestamp: new Date().toISOString(),
      images: selectedImages.length > 0 ? selectedImages : null,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setSelectedImages([]);
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
          images: selectedImages.length > 0 ? selectedImages : null,
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
      if (!loading && inputMessage.trim()) {
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
        className={`flex mb-6 px-4 ${isUser ? "justify-end" : "justify-start"}`}
      >
        <div
          className={`flex max-w-[85%] md:max-w-[75%] ${
            isUser ? "flex-row-reverse" : "flex-row"
          } items-start gap-4`}
        >
          {/* Avatar */}
          <div className="flex-shrink-0">
            {isCharacter && character?.avatar_url ? (
              <div className="relative">
                <Image
                  src={character.avatar_url}
                  alt={character.name}
                  width={44}
                  height={44}
                  className="w-11 h-11 rounded-full object-cover shadow-lg border-2 border-white"
                />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white"></div>
              </div>
            ) : (
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg border-2 border-white ${
                  isUser
                    ? "bg-gradient-to-br from-blue-600 to-indigo-600"
                    : "bg-gradient-to-br from-gray-500 to-gray-600"
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
            className={`relative rounded-3xl px-5 py-4 shadow-lg break-words backdrop-blur-sm border transition-all duration-300 hover:shadow-xl ${
              isUser
                ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-blue-300/50"
                : "bg-white/80 text-gray-900 border-gray-200/50 hover:bg-white/90"
            }`}
          >
            {/* Character name for assistant messages */}
            {isCharacter && character && (
              <div className="mb-3 text-sm font-bold text-indigo-600 flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                {character.name}
              </div>
            )}

            {/* Message content */}
            <div className="mb-2">
              {/* Display images if present */}
              {message.images && message.images.length > 0 && (
                <div className="mb-4">
                  <div
                    className={`grid gap-3 ${
                      message.images.length === 1
                        ? "grid-cols-1"
                        : message.images.length === 2
                        ? "grid-cols-2"
                        : "grid-cols-2 sm:grid-cols-3"
                    }`}
                  >
                    {message.images.map((image, index) => (
                      <div key={index} className="relative group">
                        <div className="relative overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-gray-50">
                          <Image
                            src={image.url}
                            alt={`Image ${index + 1}`}
                            width={300}
                            height={200}
                            className="w-full h-auto object-cover transition-all duration-300 group-hover:scale-105"
                            style={{
                              maxHeight:
                                message.images.length === 1 ? "300px" : "200px",
                              minHeight: "120px",
                            }}
                          />
                          {/* Image overlay with zoom icon on hover */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg">
                                <svg
                                  className="w-5 h-5 text-gray-700"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                                  />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                          <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-xs font-mono">
                            {children}
                          </span>
                        ) : (
                          <pre className="bg-gray-100 p-3 rounded-xl text-xs font-mono overflow-x-auto mt-2 border border-gray-200">
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
              className={`absolute top-4 w-4 h-4 transform rotate-45 ${
                isUser
                  ? "bg-gradient-to-br from-blue-600 to-indigo-600 -right-2"
                  : "bg-white/80 border-l border-t border-gray-200/50 -left-2"
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
    <div className="flex justify-start mb-6 px-4">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {character?.avatar_url ? (
            <div className="relative">
              <Image
                src={character.avatar_url}
                alt={character.name}
                width={44}
                height={44}
                className="w-11 h-11 rounded-full object-cover shadow-lg border-2 border-white"
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></div>
            </div>
          ) : (
            <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg border-2 border-white bg-gradient-to-br from-gray-500 to-gray-600">
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

        <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl px-5 py-4 shadow-lg border border-gray-200/50 flex items-center gap-4">
          {/* Character name */}
          {character && (
            <div className="text-sm font-bold text-indigo-600 flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              {character.name}
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="flex space-x-1">
              <div
                className="w-2.5 h-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="w-2.5 h-2.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="w-2.5 h-2.5 bg-gradient-to-r from-pink-500 to-indigo-500 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
            <span className="text-sm text-gray-600 font-medium">
              Thinking...
            </span>
          </div>

          {/* Message tail */}
          <div className="absolute top-4 w-4 h-4 transform rotate-45 bg-white/80 border-l border-t border-gray-200/50 -left-2" />
        </div>
      </div>
    </div>
  );

  if (!session) {
    return (
      <div
        className={`flex-1 flex flex-col items-center justify-center p-8 min-h-screen transition-all duration-300 bg-gradient-to-br from-slate-50 via-white to-indigo-50 relative overflow-hidden ${
          sidebarOpen ? "md:ml-0" : "md:-ml-80"
        }`}
      >
        {/* Animated background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-300/15 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-60 right-20 w-96 h-96 bg-purple-300/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-40 left-1/3 w-80 h-80 bg-pink-300/15 rounded-full blur-3xl animate-pulse delay-2000"></div>
        </div>

        <div className="relative text-center">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-full blur-2xl opacity-30 animate-pulse"></div>
            <div className="relative w-28 h-28 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-2xl mx-auto">
              <svg
                className="w-14 h-14 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
          <h2 className="text-5xl font-extrabold mb-6">
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Ready to Chat!
            </span>
          </h2>
          <p className="text-xl text-gray-600 font-medium max-w-md mx-auto mb-8 leading-relaxed">
            You can now start chatting...
          </p>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto mb-8">
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Share Images</h3>
              <p className="text-sm text-gray-600">
                Upload, drag & drop, or paste images
              </p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">
                Rich Conversations
              </h3>
              <p className="text-sm text-gray-600">
                Engaging character interactions
              </p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-indigo-500 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">
                Smart Responses
              </h3>
              <p className="text-sm text-gray-600">AI-powered understanding</p>
            </div>
          </div>

          {/* Decorative element */}
          <div className="flex items-center justify-center gap-2 text-gray-400">
            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-1000"></div>
            <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse delay-2000"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 flex flex-col h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Subtle background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-300/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-300/10 rounded-full blur-3xl"></div>
      </div>

      {/* Drag overlay */}
      {dragActive && (
        <div
          className="fixed inset-0 bg-indigo-500/20 backdrop-blur-sm flex items-center justify-center z-50 border-4 border-dashed border-indigo-400"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div
            className="text-center pointer-events-none"
            style={{ userSelect: "none" }}
          >
            <div className="w-20 h-20 bg-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl animate-bounce">
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-indigo-700 mb-3">
              Drop Images Here
            </h3>
            <p className="text-lg text-indigo-600 font-medium">
              Release to upload your images instantly
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="relative bg-white/80 backdrop-blur-xl border-b border-gray-200/50 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          {/* Menu button for mobile */}
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2.5 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all duration-200 transform hover:scale-105"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <div className="flex items-center gap-3">
            {character?.avatar_url && (
              <div className="relative">
                <Image
                  src={character.avatar_url}
                  alt={character.name}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover shadow-md border-2 border-white"
                />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white"></div>
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {session?.title || character?.name || "Chat"}
              </h1>
              {character?.name && session?.title !== character.name && (
                <p className="text-sm text-gray-500">with {character.name}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto relative"
      >
        <div className="py-8 px-4">
          {memoizedMessages}
          {typing && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div
        className="relative bg-white/80 backdrop-blur-xl border-t border-gray-200/50 p-6 shadow-lg"
        style={{
          paddingBottom: keyboardHeight ? keyboardHeight + 24 : undefined,
        }}
      >
        {/* Upload Progress Indicators */}
        {Object.keys(uploadProgress).length > 0 && (
          <div className="max-w-4xl mx-auto mb-4">
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
              <h4 className="text-sm font-semibold text-indigo-700 mb-3">
                Uploading images...
              </h4>
              <div className="space-y-2">
                {Object.entries(uploadProgress).map(([id, progress]) => (
                  <div key={id} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs text-indigo-600 mb-1">
                        <span>{id.split("-")[0]}</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-indigo-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Selected Images Preview */}
        {selectedImages.length > 0 && (
          <div className="max-w-4xl mx-auto mb-6">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200/50 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-indigo-700 flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {selectedImages.length} image
                  {selectedImages.length > 1 ? "s" : ""} selected
                </h4>
                <button
                  onClick={() => setSelectedImages([])}
                  className="text-xs text-red-600 hover:text-red-700 font-medium hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
                >
                  Clear all
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {selectedImages.map((image) => (
                  <div key={image.id} className="relative group">
                    <div className="aspect-square relative overflow-hidden rounded-xl border-2 border-white shadow-md bg-white">
                      <Image
                        src={image.url}
                        alt="Selected image"
                        width={120}
                        height={120}
                        className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <button
                        onClick={() => removeImage(image.id)}
                        className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg transform hover:scale-110 transition-all duration-200"
                      >
                        ×
                      </button>
                    </div>
                    <div className="mt-2 text-xs text-indigo-600 font-medium truncate text-center">
                      {image.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
        >
          <div className="relative max-w-4xl mx-auto">
            <div className="relative bg-white rounded-3xl border border-gray-300 shadow-lg focus-within:border-indigo-400 focus-within:shadow-xl transition-all duration-300">
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
                placeholder={
                  !hasCredits
                    ? "Chat credits exhausted - upgrade to continue chatting!"
                    : "Type your message here... You can also paste or drag & drop images!"
                }
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading || !hasCredits}
                className="w-full px-6 py-4 pr-32 bg-transparent rounded-3xl resize-none min-h-[56px] max-h-32 overflow-y-auto text-gray-900 placeholder-gray-500 focus:outline-none"
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

              <div className="absolute right-3 bottom-3 flex items-center gap-2">
                {/* Image Upload Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading || uploadingImages || !hasCredits}
                  className={`p-3 transition-all duration-200 rounded-xl transform hover:scale-105 ${
                    !hasCredits
                      ? "text-gray-300 cursor-not-allowed opacity-50"
                      : "text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 focus:outline-none focus:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  }`}
                  title={
                    !hasCredits
                      ? "Chat credits exhausted - upgrade to upload images"
                      : "Upload images (or drag & drop / paste)"
                  }
                >
                  {uploadingImages ? (
                    <svg
                      className="w-5 h-5 animate-spin text-indigo-600"
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
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  )}
                </button>

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={
                    (!inputMessage.trim() && selectedImages.length === 0) ||
                    loading ||
                    !hasCredits
                  }
                  className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200 shadow-lg disabled:hover:scale-100"
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

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>
        </form>

        {/* Enhanced disclosure message */}
        <div className="mt-4 max-w-4xl mx-auto text-center">
          <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            This AI assistant may make mistakes. Please verify important
            information.
          </p>
        </div>
      </div>
    </div>
  );
}
