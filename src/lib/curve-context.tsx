"use client";

import * as React from "react";
import type { FonteCurva } from "@/types";
import { FONTE_CURVA_DEFAULT } from "@/lib/finance/constants";

interface CurveContextValue {
  fonteCurva: FonteCurva;
  setFonteCurva: (fonte: FonteCurva) => void;
}

const CurveContext = React.createContext<CurveContextValue | undefined>(
  undefined,
);

export function CurveProvider({ children }: { children: React.ReactNode }) {
  const [fonteCurva, setFonteCurva] =
    React.useState<FonteCurva>(FONTE_CURVA_DEFAULT);
  const value = React.useMemo(
    () => ({ fonteCurva, setFonteCurva }),
    [fonteCurva],
  );
  return (
    <CurveContext.Provider value={value}>{children}</CurveContext.Provider>
  );
}

/** Lê a fonte de curva ativa. Cai no default se usado fora do provider. */
export function useFonteCurva(): CurveContextValue {
  const ctx = React.useContext(CurveContext);
  if (!ctx) {
    return {
      fonteCurva: FONTE_CURVA_DEFAULT,
      setFonteCurva: () => {
        /* noop fora do provider */
      },
    };
  }
  return ctx;
}
