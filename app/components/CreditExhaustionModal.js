"use client";

import React, { useState } from "react";
import { useCredit } from "../contexts/CreditContext";
import PaidPlanInterestForm from "./PaidPlanInterestForm";

export default function CreditExhaustionModal() {
  const { showCreditModal, hideCreditModal } = useCredit();
  const [showInterestForm, setShowInterestForm] = useState(false);

  if (!showCreditModal) return null;

  const handleInterestedClick = () => {
    setShowInterestForm(true);
  };

  const handleNotInterestedClick = () => {
    hideCreditModal();
  };

  const handleFormClose = () => {
    setShowInterestForm(false);
    hideCreditModal();
  };

  if (showInterestForm) {
    return <PaidPlanInterestForm onClose={handleFormClose} />;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
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
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">
              Free Credits Exhausted
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Thank You for Using Priyanvada Daily! 🌟
            </h3>

            <p className="text-gray-600 text-sm leading-relaxed mb-4">
              Your free credits have run out. To continue chatting with your
              favorite characters, we need to cover our AI and server costs.
            </p>

            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 mb-6">
              <p className="text-gray-800 text-sm font-medium mb-2">
                Would you be interested in a paid plan?
              </p>
              <p className="text-gray-600 text-xs">
                Help us understand your preferences so we can create suitable
                plans for our community.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleInterestedClick}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3 px-4 rounded-xl hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
            >
              <span className="flex items-center justify-center gap-2">
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Yes, I&#39;m Interested
              </span>
            </button>

            <button
              onClick={handleNotInterestedClick}
              className="w-full bg-gray-100 text-gray-700 font-medium py-3 px-4 rounded-xl hover:bg-gray-200 transition-colors duration-200"
            >
              Not Right Now
            </button>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Your feedback helps us improve Priyanvada AI for everyone
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
