import React, { createContext, useContext, useState } from "react";
import { AVAILABLE_TERMS, type Term } from "@/lib/terms";

export { AVAILABLE_TERMS };
export type { Term };

interface TermContextType {
  term: string;
  setTerm: (term: string) => void;
  terms: Term[];
}

const TermContext = createContext<TermContextType | undefined>(undefined);

export const TermProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [term, setTermState] = useState<string>(() => {
    return localStorage.getItem("selectedTerm") || AVAILABLE_TERMS[0].value;
  });

  const setTerm = (newTerm: string) => {
    setTermState(newTerm);
    localStorage.setItem("selectedTerm", newTerm);
  };

  return (
    <TermContext.Provider value={{ term, setTerm, terms: AVAILABLE_TERMS }}>
      {children}
    </TermContext.Provider>
  );
};

export const useTerm = () => {
  const context = useContext(TermContext);
  if (context === undefined) {
    throw new Error("useTerm must be used within a TermProvider");
  }
  return context;
};
