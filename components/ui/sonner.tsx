"use client";

import { useEffect, useState } from "react";
import { Toaster as Sonner } from "sonner";

/** Bóng shadow-md — menu, tooltip, toast (§6). */
const TOAST_SHADOW =
  "0 4px 12px -2px hsl(222 25% 11% / 0.10), 0 2px 6px -2px hsl(222 25% 11% / 0.06)";

/**
 * Toaster — MỘT instance duy nhất trong toàn app (§16).
 * Vị trí theo thiết bị: đáy giữa ở màn hẹp, đáy phải ở màn rộng;
 * lùi trên thanh điều hướng đáy mobile + safe-area iOS.
 */
export function Toaster() {
  const [position, setPosition] = useState<"bottom-center" | "bottom-right">("bottom-right");

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const apply = () => setPosition(mq.matches ? "bottom-center" : "bottom-right");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return (
    <Sonner
      position={position}
      richColors
      closeButton
      offset={16}
      mobileOffset={{ bottom: "calc(env(safe-area-inset-bottom) + 72px)" }}
      toastOptions={{
        style: {
          background: "hsl(var(--card))",
          color: "hsl(var(--foreground))",
          border: "1px solid hsl(var(--border))",
          borderRadius: "var(--radius)",
          boxShadow: TOAST_SHADOW,
        },
      }}
    />
  );
}
