"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

const CreditContext = createContext({});

export const useCredit = () => {
  const context = useContext(CreditContext);
  if (!context) {
    throw new Error("useCredit must be used within a CreditProvider");
  }
  return context;
};

export const CreditProvider = ({ children }) => {
  const [remainingCredits, setRemainingCredits] = useState(null);
  const [hasCredits, setHasCredits] = useState(true);
  const [showCreditModal, setShowCreditModal] = useState(false);

  useEffect(() => {
    // Get remaining credits from environment variable
    const credits = process.env.NEXT_PUBLIC_REMAINING_CREDITS;
    const creditCount = credits ? parseInt(credits, 10) : 10; // Default to 10 if not set

    setRemainingCredits(creditCount);
    setHasCredits(creditCount > 0);
  }, []);

  const checkCredits = () => {
    return hasCredits;
  };

  const showCreditExhaustionModal = () => {
    setShowCreditModal(true);
  };

  const hideCreditModal = () => {
    setShowCreditModal(false);
  };

  // Make the function globally available for components that can't use the hook
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.showCreditExhaustionModal = showCreditExhaustionModal;
    }
  }, []);

  const value = {
    remainingCredits,
    hasCredits,
    checkCredits,
    showCreditExhaustionModal,
    hideCreditModal,
    showCreditModal,
  };

  return (
    <CreditContext.Provider value={value}>{children}</CreditContext.Provider>
  );
};
