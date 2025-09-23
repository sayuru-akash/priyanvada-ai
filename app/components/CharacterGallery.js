"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

export default function CharacterGallery({
  user,
  onCharacterSelect,
  onCreateCharacter,
  onStartChat,
  onEditCharacter,
  refreshTrigger,
}) {
  const [characters, setCharacters] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const loadCharacters = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/characters";
      const params = new URLSearchParams();

      // Load all public characters
      params.append("isPublic", "true");

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setCharacters(result.characters);
      }
    } catch (error) {
      console.error("Failed to load characters:", error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCharacters();
  }, [loadCharacters, refreshTrigger]);

  const handleStartChat = async (character) => {
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

  const CharacterCard = ({ character }) => (
    <div className="group bg-white rounded-2xl shadow-lg border border-blue-100 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.02] hover:border-blue-300">
      {/* Character Image/Avatar */}
      <div className="relative h-48 overflow-hidden">
        {character.avatar_url ? (
          <Image
            src={character.avatar_url}
            alt={character.name}
            width={400}
            height={192}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center relative">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
              <svg
                className="w-8 h-8 text-white"
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
        )}

        {/* Edit Overlay */}
        {onEditCharacter && (
          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center group-hover:opacity-100 opacity-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditCharacter(character);
              }}
              className="px-4 py-2 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black transform hover:scale-105 transition-all duration-200 flex items-center shadow-lg"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              Edit
            </button>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          {/* Quick Actions Menu */}
          {onEditCharacter && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditCharacter(character);
              }}
              className="p-2 bg-white/90 hover:bg-white text-gray-700 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-110 backdrop-blur-sm border border-white/20"
              title="Edit Character"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
          )}

          {/* Visibility Badge */}
          {character.is_public ? (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/90 text-white backdrop-blur-sm border border-white/20">
              <svg
                className="w-3 h-3 mr-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z"
                  clipRule="evenodd"
                />
              </svg>
              Public
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-500/90 text-white backdrop-blur-sm border border-white/20">
              <svg
                className="w-3 h-3 mr-1"
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

        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {/* Edit Indicator */}
          {onEditCharacter && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/90 text-white backdrop-blur-sm border border-white/20">
              <svg
                className="w-3 h-3 mr-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              Editable
            </span>
          )}

          {/* Chat Count Badge */}
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-600/90 text-white backdrop-blur-sm border border-white/20">
            <svg
              className="w-3 h-3 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                clipRule="evenodd"
              />
            </svg>
            {character.chat_count || 0} chats
          </span>
        </div>

        {character.rating && (
          <div className="absolute bottom-3 right-3">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/90 text-white backdrop-blur-sm border border-white/20">
              <svg
                className="w-3 h-3 mr-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {character.rating.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* Character Info */}
      <div className="p-5">
        <div className="mb-3">
          <h3 className="text-lg font-bold text-gray-900 line-clamp-1">
            {character.name}
          </h3>
          {character.title && (
            <p className="text-sm text-blue-600 font-medium italic">
              {character.title}
            </p>
          )}
        </div>

        <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3">
          {character.description}
        </p>

        {character.tags && character.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {character.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors duration-200"
              >
                {tag}
              </span>
            ))}
            {character.tags.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg">
                +{character.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-3">
          {onEditCharacter && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditCharacter(character);
              }}
              className="w-full px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-semibold hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transform hover:scale-[1.02] transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              Edit Character
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleStartChat(character);
            }}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform hover:scale-[1.02] transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl"
          >
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
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pb-8">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-2xl border border-blue-200 p-8 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <Image
                  src="/images/logo.png"
                  alt="Priyanvada AI Logo"
                  width={80}
                  height={80}
                  className="rounded-lg shadow-lg"
                />
              </div>
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                  PRIYANVADA AI
                </h1>
                <p className="text-lg text-gray-600 font-medium">
                  මොහාන්ගේ ලෝකයට පිවිසෙමු ...
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onCreateCharacter}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center"
              >
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
                Create Character
              </button>
            </div>
          </div>
        </div>

        {/* Search and Navigation */}
        <div className="mb-8">
          {/* Search Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-100 p-6 mb-6 shadow-lg">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-72 relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-blue-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search characters by name, description, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
                />
              </div>
              {searchTerm && (
                <span className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium border border-blue-200">
                  {filteredCharacters.length} results
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from(new Array(8)).map((_, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl border border-blue-100 overflow-hidden shadow-lg animate-pulse"
              >
                <div className="h-48 bg-blue-100"></div>
                <div className="p-5">
                  <div className="h-5 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6 mb-4"></div>
                  <div className="flex gap-1 mb-4">
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                    <div className="h-6 bg-gray-200 rounded w-12"></div>
                  </div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredCharacters.length === 0 ? (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl border-2 border-dashed border-blue-200 p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg mx-auto mb-6">
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

              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {searchTerm
                  ? `No characters found for "${searchTerm}"`
                  : "No characters available"}
              </h3>

              <p className="text-gray-600 mb-8 leading-relaxed">
                {searchTerm
                  ? "Try adjusting your search terms or browse all available characters"
                  : "Be the first to discover amazing characters in our gallery"}
              </p>

              <div className="flex flex-wrap gap-3 justify-center">
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="px-6 py-2 border border-blue-300 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
                  >
                    Clear Search
                  </button>
                )}
                <button
                  onClick={onCreateCharacter}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center"
                >
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
                  Create Character
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Create Character Card */}
            <div className="group bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-dashed border-blue-300 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.02] hover:border-blue-500 hover:from-blue-100 hover:to-indigo-100 cursor-pointer">
              <div
                className="h-full p-8 flex flex-col items-center justify-center text-center"
                onClick={onCreateCharacter}
              >
                <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg
                    className="w-10 h-10 text-white group-hover:rotate-90 transition-transform duration-300"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Create New Character
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  Design your own unique character with custom personality,
                  appearance, and conversation style
                </p>
                <div className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold text-sm shadow-md group-hover:shadow-lg transition-shadow duration-200">
                  Get Started
                </div>
              </div>
            </div>

            {filteredCharacters.map((character) => (
              <CharacterCard key={character.id} character={character} />
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8 z-40">
        <button
          onClick={onCreateCharacter}
          className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-2xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform hover:scale-110 transition-all duration-200 flex items-center justify-center group"
          title="Create New Character"
        >
          <svg
            className="w-8 h-8 group-hover:rotate-90 transition-transform duration-200"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
