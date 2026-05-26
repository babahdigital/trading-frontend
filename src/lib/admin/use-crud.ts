'use client';

import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/lib/auth/auth-context';

export interface UseCrudOptions<T> {
  endpoint: string;
  idField?: keyof T & string;
  onFetchTransform?: (data: unknown) => T[];
}

export interface UseCrudReturn<T> {
  items: T[];
  editing: T | null;
  loading: boolean;
  saving: boolean;
  setEditing: (item: T | null) => void;
  updateField: <K extends keyof T>(field: K, value: T[K]) => void;
  fetchItems: () => Promise<void>;
  handleSave: () => Promise<boolean>;
  handleDelete: (id: string) => Promise<boolean>;
  startCreate: (template: T) => void;
  startEdit: (item: T) => void;
  cancelEdit: () => void;
}

export function useCrud<T extends Record<string, unknown>>({
  endpoint,
  idField = 'id' as keyof T & string,
  onFetchTransform,
}: UseCrudOptions<T>): UseCrudReturn<T> {
  const [items, setItems] = useState<T[]>([]);
  const [editing, setEditing] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { getAuthHeaders } = useAuth();
  const { push } = useToast();

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch(endpoint, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setItems(onFetchTransform ? onFetchTransform(data) : (data as T[]));
      } else {
        push({ title: 'Fetch failed', description: `HTTP ${res.status}`, tone: 'error' });
      }
    } catch (err) {
      push({ title: 'Network error', description: String(err), tone: 'error' });
    } finally {
      setLoading(false);
    }
  }, [endpoint, getAuthHeaders, push, onFetchTransform]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount is the standard pattern
    fetchItems();
  }, [fetchItems]);

  const updateField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setEditing((prev) => prev ? { ...prev, [field]: value } : prev);
  }, []);

  const handleSave = useCallback(async (): Promise<boolean> => {
    if (!editing) return false;
    setSaving(true);
    try {
      const id = editing[idField] as string | undefined;
      const method = id ? 'PUT' : 'POST';
      const res = await fetch(endpoint, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(editing),
      });
      if (res.ok) {
        push({ title: 'Saved', tone: 'success' });
        setEditing(null);
        await fetchItems();
        return true;
      }
      const body = await res.json().catch(() => ({}));
      push({ title: 'Save failed', description: body.error ?? `HTTP ${res.status}`, tone: 'error' });
      return false;
    } catch (err) {
      push({ title: 'Network error', description: String(err), tone: 'error' });
      return false;
    } finally {
      setSaving(false);
    }
  }, [editing, endpoint, idField, getAuthHeaders, push, fetchItems]);

  const handleDelete = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`${endpoint}?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        push({ title: 'Deleted', tone: 'success' });
        await fetchItems();
        return true;
      }
      push({ title: 'Delete failed', description: `HTTP ${res.status}`, tone: 'error' });
      return false;
    } catch (err) {
      push({ title: 'Network error', description: String(err), tone: 'error' });
      return false;
    }
  }, [endpoint, getAuthHeaders, push, fetchItems]);

  const startCreate = useCallback((template: T) => {
    setEditing(template);
  }, []);

  const startEdit = useCallback((item: T) => {
    setEditing({ ...item });
  }, []);

  const cancelEdit = useCallback(() => {
    setEditing(null);
  }, []);

  return {
    items, editing, loading, saving,
    setEditing, updateField,
    fetchItems, handleSave, handleDelete,
    startCreate, startEdit, cancelEdit,
  };
}
