import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { CartLine } from '@/types';

/**
 * Client-side shopping cart, persisted to localStorage.
 *
 * Lines are keyed by item + variant (size/color), so the same garment in two
 * sizes stays two lines. Display fields (name/price/image) are denormalized
 * from the catalog at add-time for the drawer UI; checkout sends only
 * itemId/quantity/variant and the backend recomputes prices from the items
 * table, so stale display prices can never be charged.
 */

const STORAGE_KEY = 'polaris.cart.v1';

/** Stable identity of a cart line: same item + same variant = same line. */
export function cartLineKey(itemId: string, size?: string, color?: string): string {
  return `${itemId}|${size ?? ''}|${color ?? ''}`;
}

interface CartContextValue {
  lines: CartLine[];
  /** Total quantity across all lines (header badge). */
  count: number;
  /** Display total from denormalized prices (toman). */
  total: number;
  add: (line: CartLine) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

function loadLines(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is CartLine =>
        typeof l === 'object' &&
        l !== null &&
        typeof (l as CartLine).itemId === 'string' &&
        typeof (l as CartLine).quantity === 'number' &&
        (l as CartLine).quantity > 0,
    );
  } catch {
    return [];
  }
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lines, setLines] = useState<CartLine[]>(loadLines);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines]);

  const add = useCallback((line: CartLine) => {
    setLines((prev) => {
      const key = cartLineKey(line.itemId, line.size, line.color);
      const existing = prev.find((l) => cartLineKey(l.itemId, l.size, l.color) === key);
      if (existing) {
        return prev.map((l) =>
          cartLineKey(l.itemId, l.size, l.color) === key
            ? { ...l, quantity: l.quantity + line.quantity }
            : l,
        );
      }
      return [...prev, line];
    });
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => cartLineKey(l.itemId, l.size, l.color) !== key)
        : prev.map((l) =>
            cartLineKey(l.itemId, l.size, l.color) === key ? { ...l, quantity } : l,
          ),
    );
  }, []);

  const remove = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => cartLineKey(l.itemId, l.size, l.color) !== key));
  }, []);

  const clear = useCallback(() => setLines([]), []);
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const count = useMemo(() => lines.reduce((sum, l) => sum + l.quantity, 0), [lines]);
  const total = useMemo(() => lines.reduce((sum, l) => sum + l.price * l.quantity, 0), [lines]);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count,
      total,
      add,
      setQuantity,
      remove,
      clear,
      isOpen,
      openCart,
      closeCart,
    }),
    [lines, count, total, add, setQuantity, remove, clear, isOpen, openCart, closeCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
