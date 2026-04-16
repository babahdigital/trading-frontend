'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface BannerData {
  id: string;
  title: string;
  content: string;
  linkUrl: string | null;
  linkLabel: string | null;
  position: string;
  bgColor: string | null;
  textColor: string | null;
}

export function BannerBar() {
  const [banners, setBanners] = useState<BannerData[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/public/banners')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setBanners(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const topBanners = banners.filter((b) => b.position === 'TOP' && !dismissed.has(b.id));
  const bottomBanners = banners.filter((b) => b.position === 'BOTTOM' && !dismissed.has(b.id));
  const floatingBanners = banners.filter((b) => b.position === 'FLOATING' && !dismissed.has(b.id));

  function dismiss(id: string) {
    setDismissed((prev) => new Set(prev).add(id));
  }

  return (
    <>
      <AnimatePresence>
        {topBanners.map((b) => (
          <motion.div
            key={b.id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="relative text-center px-4 py-2 text-sm" style={{ backgroundColor: b.bgColor || '#0ea5e9', color: b.textColor || '#fff' }}>
              <span>{b.content}</span>
              {b.linkUrl && (
                <Link href={b.linkUrl} className="underline ml-2 font-semibold">{b.linkLabel || 'Learn more'}</Link>
              )}
              <button onClick={() => dismiss(b.id)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100">&#10005;</button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {bottomBanners.map((b) => (
          <motion.div
            key={b.id}
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed bottom-0 left-0 right-0 z-50 text-center px-4 py-3 text-sm"
            style={{ backgroundColor: b.bgColor || '#0ea5e9', color: b.textColor || '#fff' }}
          >
            <span>{b.content}</span>
            {b.linkUrl && <Link href={b.linkUrl} className="underline ml-2 font-semibold">{b.linkLabel || 'Learn more'}</Link>}
            <button onClick={() => dismiss(b.id)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100">&#10005;</button>
          </motion.div>
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {floatingBanners.map((b) => (
          <motion.div
            key={b.id}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed bottom-6 right-6 z-50 max-w-sm rounded-lg shadow-xl p-4 text-sm"
            style={{ backgroundColor: b.bgColor || '#0ea5e9', color: b.textColor || '#fff' }}
          >
            <button onClick={() => dismiss(b.id)} className="absolute right-2 top-2 opacity-70 hover:opacity-100">&#10005;</button>
            <div className="font-semibold mb-1">{b.title}</div>
            <div>{b.content}</div>
            {b.linkUrl && <Link href={b.linkUrl} className="underline mt-2 block font-semibold">{b.linkLabel || 'Learn more'}</Link>}
          </motion.div>
        ))}
      </AnimatePresence>
    </>
  );
}
