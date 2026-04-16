'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface PopupData {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaLink: string | null;
  trigger: string;
  triggerValue: string | null;
}

export function PopupManager() {
  const [popups, setPopups] = useState<PopupData[]>([]);
  const [activePopup, setActivePopup] = useState<PopupData | null>(null);
  const [shown, setShown] = useState<Set<string>>(new Set());

  const showPopup = useCallback((popup: PopupData) => {
    if (shown.has(popup.id)) return;
    setActivePopup(popup);
    setShown((prev) => new Set(prev).add(popup.id));
  }, [shown]);

  useEffect(() => {
    fetch('/api/public/popups')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setPopups(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const popup of popups) {
      if (popup.trigger === 'DELAY' && popup.triggerValue) {
        const delay = parseInt(popup.triggerValue);
        if (!isNaN(delay)) {
          timers.push(setTimeout(() => showPopup(popup), delay));
        }
      } else if (popup.trigger === 'PAGE_LOAD') {
        showPopup(popup);
      }
    }
    return () => timers.forEach(clearTimeout);
  }, [popups, showPopup]);

  useEffect(() => {
    const scrollPopups = popups.filter((p) => p.trigger === 'SCROLL');
    if (scrollPopups.length === 0) return;

    function onScroll() {
      const scrollPct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
      for (const popup of scrollPopups) {
        const threshold = parseInt(popup.triggerValue || '50');
        if (scrollPct >= threshold) showPopup(popup);
      }
    }
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [popups, showPopup]);

  useEffect(() => {
    const exitPopups = popups.filter((p) => p.trigger === 'EXIT_INTENT');
    if (exitPopups.length === 0) return;

    function onMouseLeave(e: MouseEvent) {
      if (e.clientY <= 0) {
        for (const popup of exitPopups) showPopup(popup);
      }
    }
    document.addEventListener('mouseleave', onMouseLeave);
    return () => document.removeEventListener('mouseleave', onMouseLeave);
  }, [popups, showPopup]);

  return (
    <AnimatePresence>
      {activePopup && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setActivePopup(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="relative bg-card border rounded-xl max-w-md w-full mx-4 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setActivePopup(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-lg">&#10005;</button>
            {activePopup.imageUrl && (
              <Image src={activePopup.imageUrl} alt="" width={400} height={300} className="w-full rounded-lg mb-4" />
            )}
            <h3 className="text-xl font-bold mb-2">{activePopup.title}</h3>
            <p className="text-muted-foreground text-sm mb-4">{activePopup.content}</p>
            {activePopup.ctaLink && (
              <Link href={activePopup.ctaLink} className="block text-center px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
                {activePopup.ctaLabel || 'Learn More'}
              </Link>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
