import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { EditorFeatureToggles, DEFAULT_FEATURE_TOGGLES } from '../../shared/types';
import { getEditorFeatureToggles, saveEditorFeatureToggles, subscribeToEditorFeatures } from '../services/appwrite';

interface EditorFeaturesContextValue {
  featureToggles: EditorFeatureToggles;
  updateFeatureToggles: (toggles: EditorFeatureToggles) => Promise<{ success: boolean; error?: string }>;
  loading: boolean;
}

const EditorFeaturesContext = createContext<EditorFeaturesContextValue | null>(null);

export function EditorFeaturesProvider({ children }: { children: ReactNode }) {
  const [featureToggles, setFeatureToggles] = useState<EditorFeatureToggles>({ ...DEFAULT_FEATURE_TOGGLES });
  const [loading, setLoading] = useState(true);

  // Fetch initial state from Appwrite
  useEffect(() => {
    let cancelled = false;
    getEditorFeatureToggles()
      .then((toggles) => {
        if (!cancelled) {
          setFeatureToggles(toggles);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Subscribe to real-time changes
  useEffect(() => {
    const unsub = subscribeToEditorFeatures((key, value) => {
      setFeatureToggles((prev) => ({ ...prev, [key]: value }));
    });
    return unsub;
  }, []);

  const updateFeatureToggles = useCallback(async (toggles: EditorFeatureToggles) => {
    setFeatureToggles(toggles);
    return saveEditorFeatureToggles(toggles);
  }, []);

  return (
    <EditorFeaturesContext.Provider value={{ featureToggles, updateFeatureToggles, loading }}>
      {children}
    </EditorFeaturesContext.Provider>
  );
}

export function useEditorFeatures(): EditorFeaturesContextValue {
  const ctx = useContext(EditorFeaturesContext);
  if (!ctx) throw new Error('useEditorFeatures must be used inside EditorFeaturesProvider');
  return ctx;
}
