'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccordionItem {
  id: string;
  question: string;
  answer: string;
}

interface SmoothAccordionProps {
  items: AccordionItem[];
  className?: string;
}

export function SmoothAccordion({ items, className }: SmoothAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className={cn('space-y-2', className)}>
      {items.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div key={item.id} className="rounded-lg border bg-card">
            <button
              onClick={() => setOpenId(isOpen ? null : item.id)}
              className="flex w-full items-center justify-between p-4 text-left font-medium hover:bg-accent/50 transition-colors rounded-lg"
            >
              {item.question}
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </motion.div>
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                  className="overflow-hidden"
                >
                  <p className="px-4 pb-4 text-muted-foreground leading-relaxed">
                    {item.answer}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
