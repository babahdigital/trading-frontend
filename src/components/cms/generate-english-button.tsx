'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/auth-context';

interface GenerateEnglishButtonProps {
  type: 'landing-section' | 'pricing-tier' | 'faq' | 'all-landing' | 'all-pricing' | 'all-faq';
  id?: string;
  onSuccess?: () => void;
}

export function GenerateEnglishButton({ type, id, onSuccess }: GenerateEnglishButtonProps) {
  const { getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/i18n/generate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ type, id }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult('English generated!');
        onSuccess?.();
      } else {
        setResult(`Error: ${data.error}`);
      }
    } catch (err) {
      setResult(`Error: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleGenerate}
        disabled={loading}
      >
        {loading ? 'Generating...' : '🌐 Generate English'}
      </Button>
      {result && (
        <span className={`text-xs ${result.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
          {result}
        </span>
      )}
    </div>
  );
}
