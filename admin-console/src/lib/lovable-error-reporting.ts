// Simple error reporting replacing Lovable's third-party capture
export function reportLovableError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  
  console.error("[App Error]", {
    error,
    route: window.location.pathname,
    ...context
  });

  // Optional: Could integrate with Firestore here if needed in the future
}
