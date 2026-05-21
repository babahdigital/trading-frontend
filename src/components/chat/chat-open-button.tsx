'use client';

/**
 * ChatOpenButton — button yang dispatch `babahalgo:open-chat` event ke window.
 * ChatWidget listen event ini dan auto-open panel.
 *
 * Decoupled architecture: caller (footer, contact page, dll) tidak perlu
 * import ChatWidget langsung — cuma dispatch custom event.
 *
 * Variants:
 *   - 'channel-card': matching ChannelCard pattern di contact page
 *   - 'icon': flat icon button (untuk footer compact)
 */
import type { ReactNode } from 'react';
import { useCallback } from 'react';

interface ChatOpenButtonProps {
  variant?: 'channel-card' | 'icon';
  icon: ReactNode;
  title: string;
  value: string;
  className?: string;
}

export function ChatOpenButton({ variant = 'channel-card', icon, title, value, className }: ChatOpenButtonProps) {
  const handleClick = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('babahalgo:open-chat'));
    }
  }, []);

  if (variant === 'channel-card') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`flex w-full items-center gap-4 p-4 rounded-lg border border-border/60 bg-card hover:border-amber-500/30 transition-all group text-left ${className ?? ''}`}
        aria-label={title}
      >
        <div className="icon-container shrink-0">{icon}</div>
        <div className="min-w-0">
          <p className="text-sm font-medium group-hover:text-amber-400 transition-colors truncate">{title}</p>
          <p className="text-xs text-foreground/50 font-mono mt-0.5 truncate">{value}</p>
        </div>
      </button>
    );
  }

  return (
    <button type="button" onClick={handleClick} className={className} aria-label={title}>
      {icon}
    </button>
  );
}
