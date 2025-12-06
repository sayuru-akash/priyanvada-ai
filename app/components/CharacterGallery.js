"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

export default function CharacterGallery({
  user,
  onStartChat,
  onViewChatHistory,
  onLogout,
  hasCredits,
  showCreditExhaustionModal,
}) {
  const [characters, setCharacters] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [startingChatId, setStartingChatId] = useState(null);

  const characterOrderByName = [
    "ප්‍රියංවදා",
    "අහිංසා",
    "ශානක",
    "කහ කිරිල්ලි",
    "ලොවීනා",
    "පුන්නි",
    "පිංචි",
    "දස්කොන්",
    "මන්දෝදරී",
    "සුරංග වික්‍රමසිංහ",
    "රුවන් හේවගේ",
    "අන්දිරිස්",
  ];

  const loadCharacters = useCallback(async () => {
    setLoading(true);
    try {
      // Simple, fast character fetch - no extra parameters
      const response = await fetch("/api/characters?isPublic=true");
      const result = await response.json();

      if (result.success) {
        setCharacters(result.characters);
      }
    } catch (error) {
      console.error("Failed to load characters:", error);
    }
    setLoading(false);
  }, []); // No dependencies - characters don't change based on user

  useEffect(() => {
    loadCharacters();
  }, [loadCharacters]);

  const handleStartChat = async (character) => {
    if (!hasCredits) {
      if (showCreditExhaustionModal) {
        showCreditExhaustionModal();
      }
      return;
    }

    setStartingChatId(character.id);
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          characterId: character.id,
          title: `Chat with ${character.name}`,
        }),
      });

      const result = await response.json();
      if (result.success) {
        onStartChat(result.session, character);
      }
    } catch (error) {
      console.error("Failed to start chat:", error);
    } finally {
      setStartingChatId(null);
    }
  };

  const filteredCharacters = characters.filter(
    (character) =>
      character.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      character.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (character.tags &&
        character.tags.some((tag) =>
          tag.toLowerCase().includes(searchTerm.toLowerCase())
        ))
  );

  const orderedCharacters = filteredCharacters.sort((a, b) => {
    const indexA = characterOrderByName.indexOf(a.name);
    const indexB = characterOrderByName.indexOf(b.name);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  console.log("Ordered Characters:", orderedCharacters); // Debugging line

  const CharacterCard = ({ character }) => (
    <div className="group relative bg-white rounded-3xl shadow-xl border border-gray-200/50 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-3 hover:border-indigo-300/50 backdrop-blur-sm flex flex-col h-full">
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-indigo-500/5 group-hover:via-purple-500/5 group-hover:to-pink-500/5 transition-all duration-500 pointer-events-none z-10"></div>

      {/* Character Image/Avatar */}
      <div className="relative h-56 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50">
        {character.avatar_url ? (
          <Image
            src={character.avatar_url}
            alt={character.name}
            width={400}
            height={224}
            className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:rotate-1"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center relative">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full blur-xl opacity-50 animate-pulse"></div>
              <div className="relative w-20 h-20 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-2xl">
                <svg
                  className="w-10 h-10 text-white"
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
            </div>
          </div>
        )}

        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>

        {/* Badges */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
          {character.is_public ? (
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/95 text-white backdrop-blur-md border border-white/30 shadow-lg">
              <svg
                className="w-3.5 h-3.5 mr-1.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 009 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z"
                  clipRule="evenodd"
                />
              </svg>
              Public
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/95 text-white backdrop-blur-md border border-white/30 shadow-lg">
              <svg
                className="w-3.5 h-3.5 mr-1.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
              Private
            </span>
          )}
        </div>

        {/* Decorative corner accent */}
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-white/10 to-transparent rounded-tr-full"></div>
      </div>

      {/* Character Info */}
      <div className="relative p-6 flex flex-col flex-grow">
        <div className="mb-3">
          <h3 className="text-xl font-bold text-gray-900 line-clamp-1 mb-1.5 group-hover:text-indigo-700 transition-colors duration-300">
            {character.name}
          </h3>
          {character.title && (
            <p className="text-sm text-indigo-600 font-semibold italic bg-indigo-50 px-2.5 py-1 rounded-lg inline-block">
              {character.title}
            </p>
          )}
        </div>

        <p className="text-gray-600 text-sm leading-relaxed line-clamp-3 mb-4">
          {character.description}
        </p>

        {character.tags && character.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {character.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2.5 py-1 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200/50 hover:border-indigo-300 hover:shadow-sm transition-all duration-200"
              >
                {tag}
              </span>
            ))}
            {character.tags.length > 3 && (
              <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg border border-gray-200">
                +{character.tags.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="mt-auto">
          {/* Action button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleStartChat(character);
            }}
            disabled={startingChatId === character.id}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-5 py-3.5 rounded-xl font-bold shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-300 transform hover:scale-[1.02] transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {startingChatId === character.id ? (
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
                    d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                    clipRule="evenodd"
                  />
                </svg>
                Start Conversation
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 pb-12 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-300/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-60 right-20 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-40 left-1/3 w-80 h-80 bg-pink-300/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-2xl p-8 mb-10 overflow-hidden">
          {/* Decorative gradient overlay */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-500/10 via-purple-500/10 to-transparent rounded-full blur-3xl"></div>

          <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="flex items-center gap-5">
              <div className="relative flex-shrink-0 group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
                <div className="relative bg-white rounded-2xl p-2 shadow-xl">
                  <Image
                    src="/images/logo.png"
                    alt="Priyanvada AI Logo"
                    width={80}
                    height={80}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">
                  <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                    PRIYANVADA AI
                  </span>
                </h1>
                <p className="text-base sm:text-lg text-gray-700 font-semibold flex items-center gap-2">
                  <span className="inline-block w-1.5 h-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full animate-pulse"></span>
                  මොහාන්ගේ ලෝකයට පිවිසෙමු...
                </p>
              </div>
            </div>

            {/* User Info Card */}
            <div className="hidden sm:block">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200/50 px-5 py-3 shadow-lg">
                <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  {user?.full_name || user?.username || "User"}
                </p>
                <p className="text-xs text-gray-600 mt-1">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Navigation */}
        <div className="mb-10">
          {/* Search Section */}
          <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl border border-white/50 shadow-2xl p-6 overflow-hidden">
            {/* Decorative gradient */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600"></div>

            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
              <div className="flex-1 relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <svg
                    className="h-6 w-6 text-indigo-500 group-focus-within:text-purple-600 transition-colors duration-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search characters by name, description, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-14 pr-5 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-400 transition-all duration-300 bg-white text-gray-900 placeholder-gray-400 font-medium shadow-sm hover:border-gray-300"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                {/* Chat History Button */}
                <button
                  onClick={() => onViewChatHistory && onViewChatHistory()}
                  className="flex items-center gap-2.5 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-300 transform hover:scale-105 transition-all duration-200 whitespace-nowrap"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="hidden sm:inline">Chat History</span>
                  <span className="sm:hidden">History</span>
                </button>

                {searchTerm && (
                  <div className="flex items-center px-5 py-3 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 rounded-2xl text-sm font-bold border-2 border-indigo-200 shadow-lg">
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path
                        fillRule="evenodd"
                        d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {filteredCharacters.length}{" "}
                    {filteredCharacters.length === 1 ? "result" : "results"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {Array.from(new Array(8)).map((_, index) => (
              <div
                key={index}
                className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xl animate-pulse"
              >
                <div className="h-56 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100"></div>
                <div className="p-6 space-y-4">
                  <div className="space-y-2">
                    <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg"></div>
                    <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-100 rounded w-2/3"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                    <div className="h-3 bg-gray-200 rounded w-4/6"></div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-7 bg-gray-200 rounded-lg w-20"></div>
                    <div className="h-7 bg-gray-200 rounded-lg w-24"></div>
                    <div className="h-7 bg-gray-200 rounded-lg w-16"></div>
                  </div>
                  <div className="h-14 bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 rounded-xl"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredCharacters.length === 0 ? (
          <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl border-2 border-dashed border-indigo-300 p-16 text-center overflow-hidden shadow-2xl">
            {/* Decorative background */}
            <div className="absolute top-0 left-0 w-full h-full">
              <div className="absolute top-10 left-10 w-32 h-32 bg-indigo-200/30 rounded-full blur-2xl"></div>
              <div className="absolute bottom-10 right-10 w-40 h-40 bg-purple-200/30 rounded-full blur-2xl"></div>
            </div>

            <div className="relative max-w-md mx-auto">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full blur-2xl opacity-30 animate-pulse"></div>
                <div className="relative w-24 h-24 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-2xl mx-auto">
                  <svg
                    className="w-12 h-12 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>

              <h3 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
                {searchTerm ? `No characters found` : "No characters available"}
              </h3>

              {searchTerm && (
                <p className="text-lg text-gray-600 font-medium mb-3">
                  for &ldquo;
                  <span className="text-indigo-600 font-bold">
                    {searchTerm}
                  </span>
                  &rdquo;
                </p>
              )}

              <p className="text-gray-600 mb-10 leading-relaxed">
                {searchTerm
                  ? "Try adjusting your search terms or browse all available characters"
                  : "Discover amazing characters in our gallery"}
              </p>

              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-300 transform hover:scale-105 transition-all duration-200"
                >
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  Clear Search
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {orderedCharacters.map((character, index) => (
              <div
                key={character.id}
                className="animate-fadeIn"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CharacterCard character={character} />
              </div>
            ))}
          </div>
        )}

        {/* Logout Button at Bottom */}
        <div className="mt-16 flex justify-center">
          <button
            onClick={() => onLogout && onLogout()}
            className="group relative overflow-hidden flex items-center gap-3 px-8 py-4 bg-white/95 backdrop-blur-xl border-2 border-red-200 text-red-600 rounded-2xl font-bold hover:bg-red-50 hover:border-red-400 hover:text-red-700 focus:outline-none focus:ring-4 focus:ring-red-300 transform hover:scale-105 transition-all duration-300 shadow-2xl hover:shadow-red-200"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-50 to-pink-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <svg
              className="relative w-6 h-6 group-hover:rotate-12 transition-transform duration-300"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
                clipRule="evenodd"
              />
            </svg>
            <span className="relative font-bold">Logout</span>
            <svg
              className="relative w-4 h-4 group-hover:translate-x-1 transition-transform duration-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
