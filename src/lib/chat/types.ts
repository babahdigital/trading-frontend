/**
 * Shared types for the chat skill system.
 */

export type ChatLocale = 'id' | 'en';

export interface ChatPromptContext {
  locale: ChatLocale;
  /** Concatenated text of last N user messages — used for skill detection */
  recentUserText: string;
  /** Authenticated context kalau user sudah login (cookie session valid). */
  authenticated?: import('./skills/authenticated').AuthenticatedContext;
}
