'use client';

import { ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReorderButtonsProps {
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function ReorderButtons({ index, total, onMoveUp, onMoveDown }: ReorderButtonsProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        disabled={index === 0}
        onClick={onMoveUp}
        title="Pindah ke atas"
      >
        <ArrowUp className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        disabled={index === total - 1}
        onClick={onMoveDown}
        title="Pindah ke bawah"
      >
        <ArrowDown className="h-3 w-3" />
      </Button>
    </div>
  );
}
