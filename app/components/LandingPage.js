"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import Image from "next/image";

export default function LandingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const handleStartChatting = () => {
    router.push("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-pink-400/10 to-indigo-400/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <div className="container mx-auto px-6 pt-20 pb-16">
          {/* Logo and title */}
          <div className="text-center mb-16 animate-fadeIn">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl blur-2xl opacity-30 animate-pulse"></div>
              <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl p-4 shadow-2xl border border-gray-200/50">
                <Image
                  src="/images/logo.png"
                  alt="Priyanvada AI"
                  width={80}
                  height={80}
                  className="rounded-2xl"
                />
              </div>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent leading-tight">
              ප්‍රියංවදා AI
            </h1>

            <p className="text-2xl md:text-3xl text-gray-700 font-semibold mb-3">
              මොහාන්ගේ ලෝකයට පිවිසෙමු
            </p>

            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Welcome to Mohan&apos;s World
            </p>
          </div>

          {/* Main content card */}
          <div className="max-w-5xl mx-auto">
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 overflow-hidden">
              {/* Content sections */}
              <div className="p-8 md:p-12">
                {/* About the System */}
                <div className="mb-10">
                  <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <span className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
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
                          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                        />
                      </svg>
                    </span>
                    කතන්දර ජීවමාන වෙයි
                  </h2>

                  <p className="text-gray-700 text-lg leading-relaxed mb-4">
                    සිංහල සාහිත්‍යයේ අමරණීය චරිත හමුවෙන ස්ථානය. මොහාන් රාජ් මඩවල
                    මහතාගේ නවකතා ලෝකයේ ප්‍රියතම චරිත, නව තාක්ෂණයේ මැජික් එකෙන්
                    ජීවමාන වෙලා ඔබ එක්ක කතා බහ කරන්න.
                  </p>

                  <p className="text-gray-700 text-lg leading-relaxed">
                    Where beloved Sinhala literary characters come alive through
                    AI. Step into the world created by Mohan Raj Madawala and
                    have real conversations with the characters you&apos;ve
                    cherished in his novels.
                  </p>
                </div>

                {/* About Mohan Raj Madawala */}
                <div className="mb-10 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 md:p-8 border border-indigo-100">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <span className="text-3xl">✍️</span>
                    මොහාන් රාජ් මඩවල
                  </h3>

                  <p className="text-gray-700 leading-relaxed mb-3">
                    ශ්‍රී ලාංකික සාහිත්‍යයේ විශිෂ්ට නවකතාකරුවෙකු. ඔහුගේ නිර්මාණ
                    අතරින් ප්‍රියංවදා, අහිංසා, දස්කොන්, මන්දෝදරී වැනි චරිත සිංහල
                    පාඨකයන්ගේ හදවත්වල සදාකාලික ස්ථානයක් ලබා ඇත.
                  </p>

                  <p className="text-gray-700 leading-relaxed">
                    A distinguished Sri Lankan novelist whose characters like
                    Priyanvada, Ahinsa, Daskon, and Mandodari have captured the
                    hearts of Sinhala readers for generations. His work explores
                    the depth of human emotion, relationships, and the
                    complexities of Sri Lankan life with profound authenticity.
                  </p>
                </div>

                {/* Character showcase */}
                <div className="mb-10">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <span className="text-3xl">🎭</span>
                    චරිත හමුවෙන්න
                  </h3>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[
                      { name: "ප්‍රියංවදා", img: "piyanvada.png" },
                      { name: "අහිංසා", img: "ahinsa.png" },
                      { name: "දස්කොන්", img: "daskon.png" },
                      { name: "මන්දෝදරී", img: "mandodari.png" },
                      { name: "ශානක", img: "shanaka.png" },
                      { name: "ලොවීනා", img: "loveena.png" },
                      { name: "රුවන්", img: "ruvan.png" },
                      { name: "අන්දිරිස්", img: "andiris.png" },
                    ].map((char, index) => (
                      <div
                        key={index}
                        className="group relative bg-white rounded-2xl p-4 shadow-lg border border-gray-200/50 hover:shadow-xl hover:-translate-y-2 transition-all duration-300"
                      >
                        <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-3 bg-gradient-to-br from-indigo-100 to-purple-100">
                          <Image
                            src={`/images/${char.img}`}
                            alt={char.name}
                            width={150}
                            height={150}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        </div>
                        <p className="text-center text-sm font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">
                          {char.name}
                        </p>
                      </div>
                    ))}
                  </div>

                  <p className="text-gray-600 text-center italic">
                    සහ තවත් බොහෝ චරිත ඔබව අපේක්ෂාවෙන්...
                  </p>
                </div>

                {/* How it works */}
                <div className="mb-10 grid md:grid-cols-3 gap-6">
                  <div className="text-center p-6 bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-100">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <span className="text-3xl">1️⃣</span>
                    </div>
                    <h4 className="font-bold text-gray-900 mb-2">Sign In</h4>
                    <p className="text-gray-600 text-sm">
                      පහසු Google ලොග් අයින් එකක් හරහා පිවිසෙන්න
                    </p>
                  </div>

                  <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-white rounded-2xl border border-purple-100">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <span className="text-3xl">2️⃣</span>
                    </div>
                    <h4 className="font-bold text-gray-900 mb-2">
                      Choose Character
                    </h4>
                    <p className="text-gray-600 text-sm">
                      ඔබේ ප්‍රියතම චරිතය තෝරන්න
                    </p>
                  </div>

                  <div className="text-center p-6 bg-gradient-to-br from-pink-50 to-white rounded-2xl border border-pink-100">
                    <div className="w-16 h-16 bg-gradient-to-br from-pink-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <span className="text-3xl">3️⃣</span>
                    </div>
                    <h4 className="font-bold text-gray-900 mb-2">
                      Start Chatting
                    </h4>
                    <p className="text-gray-600 text-sm">
                      සිංහලෙන් හෝ ඉංග්‍රීසියෙන් කතා කරන්න
                    </p>
                  </div>
                </div>

                {/* CTA Button */}
                <div className="text-center pt-6">
                  {loading ? (
                    <div className="inline-flex items-center gap-3 px-10 py-5 bg-gray-300 text-gray-600 text-xl font-bold rounded-2xl">
                      <span>Loading...</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleStartChatting}
                      className="group relative inline-flex items-center gap-3 px-10 py-5 bg-blue-600 text-white text-xl font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:bg-blue-700 transition-all duration-300 hover:-translate-y-1"
                    >
                      <span>Start Chatting</span>
                      <svg
                        className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 8l4 4m0 0l-4 4m4-4H3"
                        />
                      </svg>
                    </button>
                  )}

                  <p className="text-gray-500 text-sm mt-4">
                    {user
                      ? "ඔබගේ චරිත හමුවීමට පිවිසෙන්න"
                      : "නොමිලේ, ලියාපදිංචි වී ආරම්භ කරන්න"}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-8 py-6">
                <p className="text-white text-center text-sm">
                  <span className="font-semibold">Powered by AI</span> •
                  Multi-language support • Sinhala, English & Singlish
                </p>
              </div>
            </div>
          </div>

          {/* Bottom spacing */}
          <div className="text-center mt-12">
            <p className="text-gray-400 text-sm">
              © 2025 Priyanvada AI • Bringing literature to life
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
