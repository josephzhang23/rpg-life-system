"use client";
import { createContext, useContext, useState } from "react";

interface XpState {
  level: number;
  xpInLevel: number;
  xpNeeded: number;
}

const XpContext = createContext<{
  xp: XpState;
  setXp: (v: XpState) => void;
}>({
  xp: { level: 1, xpInLevel: 0, xpNeeded: 500 },
  setXp: () => {},
});

export function XpProvider({ children }: { children: React.ReactNode }) {
  const [xp, setXp] = useState<XpState>({ level: 1, xpInLevel: 0, xpNeeded: 500 });
  return <XpContext.Provider value={{ xp, setXp }}>{children}</XpContext.Provider>;
}

export function useXp() { return useContext(XpContext); }
