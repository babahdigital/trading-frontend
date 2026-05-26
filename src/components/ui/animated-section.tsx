'use client';

import { ReactNode, useEffect, useRef } from 'react';

interface AnimatedSectionProps {
  children: ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  duration?: number;
  className?: string;
}

const observed = new WeakSet<Element>();
let observer: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver {
  if (observer) return observer;
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
          observer!.unobserve(entry.target);
        }
      }
    },
    { rootMargin: '0px 0px -40px 0px', threshold: 0.01 },
  );
  return observer;
}

export function AnimatedSection({
  children,
  delay = 0,
  className,
}: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || observed.has(el)) return;
    observed.add(el);
    getObserver().observe(el);
  }, []);

  return (
    <div
      ref={ref}
      className={`animate-section ${className ?? ''}`}
      style={delay ? { animationDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}
