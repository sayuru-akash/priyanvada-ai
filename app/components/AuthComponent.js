"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`auth-tabpanel-${index}`}
      aria-labelledby={`auth-tab-${index}`}
      {...other}
    >
      {value === index && <div className="p-6">{children}</div>}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `auth-tab-${index}`,
    "aria-controls": `auth-tabpanel-${index}`,
  };
}

export default function AuthComponent() {
  const { signIn, signUp, signInWithGoogle, getGoogleAuthUrl, loading } =
    useAuth();
  const [tab, setTab] = useState(0);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
    fullName: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
    setError("");
    setSuccess("");
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const { user, error } = await signIn(formData.email, formData.password);

      if (error) {
        setError(error.message || "Login failed");
      } else if (user) {
        setSuccess("Login successful!");
      }
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      setIsLoading(false);
      return;
    }

    try {
      const { user, error } = await signUp(
        formData.email,
        formData.password,
        formData.username,
        formData.fullName
      );

      if (error) {
        setError(error.message || "Registration failed");
      } else if (user) {
        setSuccess(
          "Registration successful! Please check your email to confirm your account."
        );
        setFormData({ email: "", password: "", username: "", fullName: "" });
        // Auto-switch to login tab after successful registration
        setTimeout(() => {
          setTab(0);
          setSuccess("");
        }, 2000);
      }
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError("");

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    if (!clientId) {
      setError(
        "Google Sign-In is not configured. Please check your environment variables."
      );
      setGoogleLoading(false);
      return;
    }

    try {
      // Use redirect flow instead of FedCM to avoid browser restrictions
      const { authUrl, error } = await getGoogleAuthUrl();
      if (error) {
        setError(error.message || "Failed to initialize Google sign-in");
        setGoogleLoading(false);
      } else if (authUrl) {
        // Redirect to Google OAuth
        window.location.href = authUrl;
        // Don't set loading to false here as we're redirecting
      } else {
        setError("Failed to get Google authorization URL");
        setGoogleLoading(false);
      }
    } catch (err) {
      console.error("Google sign-in error:", err);
      setError(err.message || "Google sign-in failed");
      setGoogleLoading(false);
    }
  };

  // Handle OAuth callback and load Google Sign-In script
  useEffect(() => {
    // Check for OAuth callback parameters
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get("auth");
    const token = urlParams.get("token");
    const message = urlParams.get("message");

    if (authStatus === "success" && token) {
      // Handle successful OAuth
      localStorage.setItem("auth_token", token);
      setSuccess("Successfully signed in with Google!");
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Reload to trigger auth context update
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else if (authStatus === "error") {
      setError(message || "Google sign-in failed");
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const loadGoogleScript = () => {
      if (document.getElementById("google-signin-script")) return;

      const script = document.createElement("script");
      script.id = "google-signin-script";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log("Google Sign-In script loaded successfully");
      };
      script.onerror = () => {
        console.error("Failed to load Google Sign-In script");
      };
      document.head.appendChild(script);
    };

    loadGoogleScript();
  }, []);

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
            <div className="relative w-24 h-24 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-2xl mx-auto animate-spin" style={{animationDuration: '3s'}}>
              <div className="w-20 h-20 bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 rounded-full"></div>
            </div>
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">Loading...</h2>
          <p className="text-gray-600">Please wait while we prepare your experience</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-300/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-60 right-20 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-40 left-1/3 w-80 h-80 bg-pink-300/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 overflow-hidden transform transition-all duration-300 hover:shadow-indigo-500/20">
          {/* Header */}
          <div className="relative text-center py-10 px-6 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
            <div className="relative">
              <p>Welcome to </p>
              <h1 className="text-3xl font-extrabold text-white mb-2">
                PRIYANVADA AI
              </h1>
              <p className="text-white/90 text-sm">
                Sign in to continue your conversations
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 bg-gray-50/50">
            <button
              className={`flex-1 py-4 px-6 text-sm font-bold transition-all duration-300 relative ${
                tab === 0
                  ? "text-indigo-600 bg-white"
                  : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
              }`}
              onClick={() => handleTabChange(null, 0)}
              {...a11yProps(0)}
            >
              {tab === 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600"></div>
              )}
              Sign In
            </button>
            <button
              className={`flex-1 py-4 px-6 text-sm font-bold transition-all duration-300 relative ${
                tab === 1
                  ? "text-indigo-600 bg-white"
                  : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
              }`}
              onClick={() => handleTabChange(null, 1)}
              {...a11yProps(1)}
            >
              {tab === 1 && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600"></div>
              )}
              Sign Up
            </button>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mx-6 mt-6 p-4 bg-red-50 border-2 border-red-200 rounded-2xl shadow-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mr-3">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span className="text-red-700 text-sm font-medium">{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="mx-6 mt-6 p-4 bg-emerald-50 border-2 border-emerald-200 rounded-2xl shadow-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center mr-3">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span className="text-emerald-700 text-sm font-medium">{success}</span>
              </div>
            </div>
          )}

          {/* Sign In Form */}
          <TabPanel value={tab} index={0}>
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-400 transition-all duration-300 bg-white text-gray-900 placeholder-gray-400 font-medium shadow-sm hover:border-gray-300"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-400 transition-all duration-300 bg-white text-gray-900 placeholder-gray-400 font-medium shadow-sm hover:border-gray-300"
                  placeholder="Enter your password"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                    Signing In...
                  </div>
                ) : (
                  "Sign In"
                )}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path
                    fill="#4285f4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34a853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#fbbc05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#ea4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {googleLoading ? "Signing In..." : "Continue with Google"}
              </button>
            </form>
          </TabPanel>

          {/* Sign Up Form */}
          <TabPanel value={tab} index={1}>
            <form onSubmit={handleRegister} className="space-y-6">
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-400 transition-all duration-300 bg-white text-gray-900 placeholder-gray-400 font-medium shadow-sm hover:border-gray-300"
                  placeholder="Choose a username"
                />
              </div>

              <div>
                <label
                  htmlFor="fullName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Full Name <span className="text-gray-400">(Optional)</span>
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-400 transition-all duration-300 bg-white text-gray-900 placeholder-gray-400 font-medium shadow-sm hover:border-gray-300"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label
                  htmlFor="signup-email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Email Address
                </label>
                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-400 transition-all duration-300 bg-white text-gray-900 placeholder-gray-400 font-medium shadow-sm hover:border-gray-300"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label
                  htmlFor="signup-password"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Password
                </label>
                <input
                  id="signup-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-400 transition-all duration-300 bg-white text-gray-900 placeholder-gray-400 font-medium shadow-sm hover:border-gray-300"
                  placeholder="Create a password"
                />
                <p className="mt-2 text-sm text-gray-600">
                  Password must be at least 6 characters long
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 px-4 rounded-xl font-bold shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                    Creating Account...
                  </div>
                ) : (
                  "Create Account"
                )}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full flex items-center justify-center px-4 py-3.5 border-2 border-gray-200 rounded-xl shadow-lg bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-4 focus:ring-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path
                    fill="#4285f4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34a853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#fbbc05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#ea4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {googleLoading ? "Signing Up..." : "Sign up with Google"}
              </button>
            </form>
          </TabPanel>
        </div>
      </div>
    </div>
  );
}
