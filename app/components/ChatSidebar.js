"use client";

import { useState } from "react";
import Image from "next/image";

export default function ChatSidebar({
  open,
  sessions,
  currentSession,
  selectedCharacter,
  onSessionSelect,
  onNewSession,
  onDeleteSession,
  onToggle,
  onBackToGallery,
  user,
  onLogout,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [isStartingConversation, setIsStartingConversation] = useState(false);

  const handleSessionMenu = (event, session) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setMenuPosition({
      x: rect.left - 200, // Position to the left of the button
      y: rect.top,
    });
    setSelectedSession(session);
    setMenuOpen(true);
  };

  const handleCloseMenu = () => {
    setMenuOpen(false);
    setSelectedSession(null);
  };

  const handleDeleteSession = () => {
    if (selectedSession) {
      onDeleteSession(selectedSession.id);
    }
    handleCloseMenu();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffInHours < 48) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString();
    }
  };

  const getInstructionColor = (type) => {
    const colors = {
      default: "bg-gray-100 text-gray-700",
      coding: "bg-blue-100 text-blue-700",
      creative: "bg-purple-100 text-purple-700",
    };
    return colors[type] || colors.default;
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-80 bg-white border-r border-gray-200 shadow-sm">
        {/* Header */}
        <div className="flex items-center p-4 border-b border-blue-100">
          <button
            onClick={onBackToGallery}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-gray-900 flex-1 text-center">
            Chat History
          </h2>
        </div>

        {/* New Chat Button */}
        <div className="p-4 border-b border-blue-100">
          <button
            onClick={async () => {
              if (selectedCharacter) {
                setIsStartingConversation(true);
                try {
                  await onNewSession(
                    selectedCharacter.id,
                    `Chat with ${selectedCharacter.name}`
                  );
                } finally {
                  setIsStartingConversation(false);
                }
              }
            }}
            disabled={!selectedCharacter || isStartingConversation}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl"
          >
            {isStartingConversation ? (
              <>
                <div className="animate-spin mr-2 h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                Starting...
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
                New Chat
              </>
            )}
          </button>
        </div>

        {/* Chat Sessions List */}
        <div className="flex-1 overflow-y-auto">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-all duration-200 ${
                currentSession?.id === session.id
                  ? "bg-blue-100 border-l-4 border-l-blue-600"
                  : ""
              }`}
              onClick={() => onSessionSelect(session)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
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

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {session.title}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getInstructionColor(
                        session.instruction_type
                      )}`}
                    >
                      {session.instruction_type}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{session.message_count} messages</span>
                    <span>{formatDate(session.updated_at)}</span>
                  </div>
                </div>

                <button
                  onClick={(e) => handleSessionMenu(e, session)}
                  className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors duration-200"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* User Profile Section */}
        <div className="p-4 border-t border-blue-100 bg-gray-50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.username}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user.email || "No email"}
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors duration-200"
          >
            <svg
              className="w-4 h-4 mx-auto"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm"
          onClick={onToggle}
        />
        <div
          className={`fixed left-0 top-0 h-full w-80 bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-blue-100">
            <button
              onClick={onBackToGallery}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <h2 className="text-lg font-semibold text-gray-900 flex-1 text-center">
              Chat History
            </h2>
            <button
              onClick={onToggle}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          {/* New Chat Button */}
          <div className="p-4 border-b border-blue-100">
            <button
              onClick={async () => {
                if (selectedCharacter) {
                  setIsStartingConversation(true);
                  try {
                    await onNewSession(
                      selectedCharacter.id,
                      `Chat with ${selectedCharacter.name}`
                    );
                  } finally {
                    setIsStartingConversation(false);
                  }
                }
                onToggle();
              }}
              disabled={!selectedCharacter || isStartingConversation}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl"
            >
              {isStartingConversation ? (
                <>
                  <div className="animate-spin mr-2 h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                  Starting...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  New Chat
                </>
              )}
            </button>
          </div>

          {/* Chat Sessions List */}
          <div className="flex-1 overflow-y-auto">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-all duration-200 ${
                  currentSession?.id === session.id
                    ? "bg-blue-100 border-l-4 border-l-blue-600"
                    : ""
                }`}
                onClick={() => {
                  onSessionSelect(session);
                  onToggle();
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-white"
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

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {session.title}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getInstructionColor(
                          session.instruction_type
                        )}`}
                      >
                        {session.instruction_type}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{session.message_count} messages</span>
                      <span>{formatDate(session.updated_at)}</span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleSessionMenu(e, session)}
                    className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors duration-200"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* User Profile Section */}
          <div className="p-4 border-t border-blue-100 bg-gray-50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.username}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user.email || "No email"}
                </p>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="w-full p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors duration-200"
            >
              <svg
                className="w-4 h-4 mx-auto"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {menuOpen && selectedSession && (
        <div className="fixed inset-0 z-50" onClick={handleCloseMenu}>
          <div
            className="absolute bg-white rounded-lg shadow-xl border border-gray-200 min-w-48 max-w-xs"
            style={{
              left: `${menuPosition.x}px`,
              top: `${menuPosition.y}px`,
              transform:
                menuPosition.x < 100 ? "translateX(0)" : "translateX(-100%)",
            }}
          >
            <div className="p-1">
              <button
                onClick={handleDeleteSession}
                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center rounded-md transition-colors duration-200"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Delete Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
