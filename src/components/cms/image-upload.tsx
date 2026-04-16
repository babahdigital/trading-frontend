'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload } from 'lucide-react';
import Image from 'next/image';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export function ImageUpload({ value, onChange, label = 'Image URL' }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        onChange(data.url);
      } else {
        const err = await res.json();
        alert(err.error || 'Upload gagal');
      }
    } catch {
      alert('Upload gagal');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium mb-1 block">{label}</label>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://... atau /uploads/..."
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          title="Upload gambar"
        >
          <Upload className="w-4 h-4" />
        </Button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
          e.target.value = '';
        }}
      />
      {value && (
        <div className="mt-2">
          <Image src={value} alt="Preview" width={200} height={96} className="max-h-24 rounded border object-cover" />
        </div>
      )}
    </div>
  );
}
