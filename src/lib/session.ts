/**
 * Anonymous session management.
 * Uses localStorage to persist a UUID-based session ID across page reloads.
 * This allows anonymous history without requiring user sign-in.
 */

const SESSION_KEY = "writeiq_session_id";

function generateUUID(): string {
  return crypto.randomUUID();
}

export function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = generateUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}
