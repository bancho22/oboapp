import { useEffect } from "react";

/**
 * Hook to handle ESC key press
 * @param onEscape - Callback to execute when ESC is pressed
 * @param enabled - Whether the hook is enabled (default: true)
 */
export function useEscapeKey(onEscape: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onEscape();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onEscape, enabled]);
}
