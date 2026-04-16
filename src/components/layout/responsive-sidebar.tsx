'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface ResponsiveSidebarProps {
  children: React.ReactNode;
}

export function ResponsiveSidebar({ children }: ResponsiveSidebarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Tutup sidebar saat navigasi
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Tutup saat tekan Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      {/* Hamburger button — hanya muncul di mobile/tablet */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2.5 rounded-xl
                   bg-background/80 backdrop-blur-md border shadow-lg
                   hover:bg-accent transition-colors"
        aria-label="Buka menu navigasi"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Desktop sidebar — tetap visible */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:bg-card">
        {children}
      </aside>

      {/* Mobile overlay + slide sidebar */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop gelap */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setOpen(false)}
            />

            {/* Sidebar panel */}
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-64
                         bg-card border-r shadow-2xl lg:hidden
                         overflow-y-auto flex flex-col"
            >
              {/* Tombol tutup */}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg
                           hover:bg-accent transition-colors"
                aria-label="Tutup menu"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Konten sidebar yang sama dengan desktop */}
              {children}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
