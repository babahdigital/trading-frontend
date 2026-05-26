'use client';

import { ReactNode } from 'react';

interface AnimatedSectionProps {
  children: ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  duration?: number;
  className?: string;
}

export function AnimatedSection({
  children,
  delay = 0,
  className,
}: AnimatedSectionProps) {
  return (
    <div
      className={className}
      style={{
        animationDelay: delay ? `${delay}s` : undefined,
      }}
    >
      {children}
    </div>
  );
}
