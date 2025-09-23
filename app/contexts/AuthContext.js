"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Check for existing session/token in localStorage
    const checkExistingSession = async () => {
      try {
        // Ensure we're on the client side before accessing localStorage
        if (typeof window === "undefined") {
          setLoading(false);
          return;
        }

        const token = localStorage.getItem("auth_token");
        if (token) {
          // Verify token with backend
          const response = await fetch("/api/auth/me", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              setUser(data.user);
              setUserProfile(data.user);
              setSession({ access_token: token });
            } else {
              // Invalid token, remove it
              localStorage.removeItem("auth_token");
            }
          } else {
            // Invalid token, remove it
            localStorage.removeItem("auth_token");
          }
        }
      } catch (error) {
        console.error("Error checking existing session:", error);
        localStorage.removeItem("auth_token");
      } finally {
        setLoading(false);
      }
    };

    checkExistingSession();
  }, []);

  const signUp = async (email, password, username, fullName) => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, username, fullName }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      // Store user info but don't auto-login (in case email confirmation is needed)
      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error };
    }
  };

  const signIn = async (email, password) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      // Store token in localStorage
      if (data.session?.access_token && typeof window !== "undefined") {
        localStorage.setItem("auth_token", data.session.access_token);
      }

      // Update state
      setUser(data.user);
      setUserProfile(data.user);
      setSession(data.session);

      return { user: data.user, session: data.session, error: null };
    } catch (error) {
      return { user: null, session: null, error };
    }
  };

  const signInWithGoogle = async (idToken) => {
    try {
      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      // Store token in localStorage
      if (data.session?.access_token && typeof window !== "undefined") {
        localStorage.setItem("auth_token", data.session.access_token);
      }

      // Update state
      setUser(data.user);
      setUserProfile(data.user);
      setSession(data.session);

      return { user: data.user, session: data.session, error: null };
    } catch (error) {
      return { user: null, session: null, error };
    }
  };

  const getGoogleAuthUrl = async () => {
    try {
      const response = await fetch("/api/auth/google");
      const data = await response.json();

      if (data.success && data.authUrl) {
        return { authUrl: data.authUrl, error: null };
      } else {
        throw new Error("Failed to get Google auth URL");
      }
    } catch (error) {
      return { authUrl: null, error };
    }
  };

  const signOut = async () => {
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("auth_token")
          : null;

      if (token) {
        // Call logout endpoint
        await fetch("/api/auth/me", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }

      // Clear local state and storage
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth_token");
      }
      setUser(null);
      setUserProfile(null);
      setSession(null);

      return { error: null };
    } catch (error) {
      // Even if the API call fails, clear local state
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth_token");
      }
      setUser(null);
      setUserProfile(null);
      setSession(null);

      return { error };
    }
  };

  const value = {
    user,
    userProfile,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    getGoogleAuthUrl,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
