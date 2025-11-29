"use client";

import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function PaidPlanInterestForm({ onClose }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    interestedInPaidPlan: true,
    budgetRange: "",
    currentUsageFrequency: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Auto-fill user information
  useEffect(() => {
    if (user) {
      // Pre-fill with user data if available
      // Note: budgetRange and currentUsageFrequency will be manually selected
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const submissionData = {
        userId: user?.id || null,
        userEmail: user?.email || "",
        userName: user?.full_name || user?.username || "",
        ...formData,
        userAgent: navigator.userAgent,
        ipAddress: null, // Will be captured server-side
      };

      const response = await fetch("/api/paid-plan-interest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submissionData),
      });

      const result = await response.json();

      if (result.success) {
        setSubmitted(true);
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        throw new Error(result.error || "Submission failed");
      }
    } catch (error) {
      console.error("Form submission error:", error);
      alert("Failed to submit form. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">Thank You!</h2>
            </div>
          </div>
          <div className="px-6 py-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Response Recorded Successfully
            </h3>
            <p className="text-gray-600 text-sm">
              Thank you for your feedback! We&apos;ll use this information to create
              better plans for our users.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full mx-4 my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-6 py-4">
          <div className="flex items-center justify-between">
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">
                Tell Us About Your Interest
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <svg
                className="w-5 h-5 text-white"
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
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          {/* Budget Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monthly Budget Range (LKR) *
            </label>
            <select
              name="budgetRange"
              value={formData.budgetRange}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            >
              <option value="">Select budget range...</option>
              <option value="1000_2500">LKR 1,000 - 2,500</option>
              <option value="2500_5000">LKR 2,500 - 5,000</option>
              <option value="5000_10000">LKR 5,000 - 10,000</option>
            </select>
          </div>

          {/* Usage Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              How often do you currently use Priyanvada? *
            </label>
            <select
              name="currentUsageFrequency"
              value={formData.currentUsageFrequency}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            >
              <option value="">Select frequency...</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="occasional">Occasionally</option>
            </select>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3 px-4 rounded-xl hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin w-5 h-5"
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
                  Submitting...
                </span>
              ) : (
                "Submit Response"
              )}
            </button>
          </div>

          {/* Privacy Note */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Your responses help us create better plans. We respect your
              privacy.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
