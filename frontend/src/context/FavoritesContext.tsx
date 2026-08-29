import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

/**
 * Client-side favorites (wishlist) — a set of public item ids persisted to
 * localStorage. No backend persistence; the profile page resolves ids against
 * the live public catalog and silently drops items that no longer exist.
 */

const STORAGE_KEY = 'polaris.favorites.v1';

interface FavoritesContextValue {
  /** Item ids, newest first. */
  favorites: string[];
  isFavorite: (itemId: string) => boolean;
  toggle: (itemId: string) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
}

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const isFavorite = useCallback((itemId: string) => favorites.includes(itemId), [favorites]);

  const toggle = useCallback((itemId: string) => {
    setFavorites((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [itemId, ...prev],
    );
  }, []);

  const value = useMemo<FavoritesContextValue>(
    () => ({ favorites, isFavorite, toggle }),
    [favorites, isFavorite, toggle],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
};

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
