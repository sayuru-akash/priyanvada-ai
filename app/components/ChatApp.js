"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import ChatSidebar from "./ChatSidebar";
import ChatInterface from "./ChatInterface";
import AuthComponent from "./AuthComponent";
import CharacterGallery from "./CharacterGallery";

export default function ChatApp() {
  const { user, userProfile, signOut, loading } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isClient, setIsClient] = useState(false);

  // Ensure component is hydrated before accessing window
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Auto-manage sidebar state based on screen size
  useEffect(() => {
    if (!isClient) return;

    const handleResize = () => {
      const isMobile = window.innerWidth < 900;
      setSidebarOpen(!isMobile);
    };

    handleResize(); // Initial check
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isClient]);
  const [currentView, setCurrentView] = useState("gallery"); // 'gallery', 'chat'
  const [selectedCharacter, setSelectedCharacter] = useState(null);

  // Load user sessions when user is authenticated
  useEffect(() => {
    if (user && userProfile) {
      loadSessions(user.id);
    }
  }, [user, userProfile]);

  const loadSessions = async (userId) => {
    try {
      const response = await fetch(`/api/sessions?userId=${userId}`);
      const result = await response.json();
      if (result.success) {
        setSessions(result.sessions);
      }
    } catch (error) {
      console.error("Failed to load sessions:", error);
    }
  };

  const createNewSession = async (characterId, title = "New Chat") => {
    if (!user) return;

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          characterId,
          title,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setSessions((prev) => [result.session, ...prev]);
        setCurrentSession(result.session);

        // Ensure character state is updated for new session
        if (selectedCharacter?.id !== characterId) {
          try {
            const charResponse = await fetch(`/api/characters/${characterId}`);
            const charResult = await charResponse.json();
            if (charResult.success) {
              setSelectedCharacter(charResult.character);
            }
          } catch (error) {
            console.error("Failed to fetch character for new session:", error);
          }
        }

        setCurrentView("chat");
        return result.session;
      }
    } catch (error) {
      console.error("Failed to create session:", error);
    }
  };

  const handleStartChat = (session, character) => {
    setCurrentSession(session);
    setSelectedCharacter(character);
    setCurrentView("chat");
    if (user) {
      loadSessions(user.id);
    }
  };

  const handleSessionSelect = async (session) => {
    setCurrentSession(session);
    setCurrentView("chat");

    // Fetch character data for the session
    try {
      const response = await fetch(`/api/characters/${session.character_id}`);
      const result = await response.json();
      if (result.success) {
        setSelectedCharacter(result.character);
      } else {
        // Fallback: create character object from session data
        setSelectedCharacter({
          id: session.character_id,
          name:
            session.character_name ||
            session.characters?.name ||
            "AI Assistant",
          avatar_url: session.avatar_url || session.characters?.avatar_url,
        });
      }
    } catch (error) {
      console.error("Failed to fetch character:", error);
      // Fallback: create character object from session data
      setSelectedCharacter({
        id: session.character_id,
        name:
          session.character_name || session.characters?.name || "AI Assistant",
        avatar_url: session.avatar_url || session.characters?.avatar_url,
      });
    }

    // Auto-close sidebar on mobile after selection
    if (isClient && window.innerWidth < 900) {
      setSidebarOpen(false);
    }
  };

  const handleBackToGallery = () => {
    setCurrentView("gallery");
    setCurrentSession(null);
    setSelectedCharacter(null);
  };

  const handleViewChatHistory = () => {
    setCurrentView("chat");
    setCurrentSession(null);
    setSelectedCharacter(null);
    // Ensure sidebar is open to show chat history
    setSidebarOpen(true);
  };

  const deleteSession = async (sessionId) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: "DELETE",
      });

      const result = await response.json();
      if (result.success) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (currentSession?.id === sessionId) {
          setCurrentSession(null);
          setSelectedCharacter(null);
        }
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      setSessions([]);
      setCurrentSession(null);
      setCurrentView("gallery");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Show loading screen while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-300/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-60 right-20 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-40 left-1/3 w-80 h-80 bg-pink-300/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
        </div>

        <div className="relative text-center">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full blur-2xl opacity-30 animate-pulse"></div>
            <div
              className="relative w-24 h-24 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-2xl mx-auto animate-spin"
              style={{ animationDuration: "3s" }}
            >
              <div className="w-20 h-20 bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 rounded-full"></div>
            </div>
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Loading...
          </h2>
          <p className="text-gray-600">
            Please wait while we prepare your experience
          </p>
        </div>
      </div>
    );
  }

  // Show auth component if user is not authenticated
  if (!user || !userProfile) {
    return <AuthComponent />;
  }

  // Create user object compatible with existing components
  const userData = {
    id: user.id,
    username: userProfile.username,
    email: user.email,
    full_name: userProfile.full_name,
    last_login: userProfile.last_login,
  };

  return (
    <>
      {currentView === "gallery" ? (
        <CharacterGallery
          user={userData}
          onStartChat={handleStartChat}
          onViewChatHistory={handleViewChatHistory}
          onLogout={handleLogout}
        />
      ) : (
        <div className="flex h-screen w-full overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100">
          <ChatSidebar
            open={sidebarOpen}
            sessions={sessions}
            currentSession={currentSession}
            selectedCharacter={selectedCharacter}
            onSessionSelect={handleSessionSelect}
            onNewSession={createNewSession}
            onDeleteSession={deleteSession}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            onBackToGallery={handleBackToGallery}
            user={userData}
            onLogout={handleLogout}
          />
          <ChatInterface
            session={currentSession}
            character={selectedCharacter}
            onCreateSession={createNewSession}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          />
        </div>
      )}
    </>
  );
}
