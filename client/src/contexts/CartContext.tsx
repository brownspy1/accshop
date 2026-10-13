import { createContext, useContext, useMemo, useState } from "react";

type CartLine = { serviceKey: string; quantity: number; maxQuantity: number };
type CartContextValue = {
  items: CartLine[];
  itemCount: number;
  add: (serviceKey: string, quantity?: number, maxQuantity?: number) => void;
  setQuantity: (serviceKey: string, quantity: number, maxQuantity?: number) => void;
  adjustMany: (changes: Array<{ serviceKey: string; quantity: number; maxQuantity: number }>) => void;
  remove: (serviceKey: string) => void;
  clear: () => void;
};
const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "acczone-shop-cart-v1";

function initialItems(): CartLine[] {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(saved)) return [];
    return saved.flatMap(item => typeof item?.serviceKey === "string" && Number.isInteger(item.quantity) && item.quantity > 0
      ? [{ serviceKey: item.serviceKey, quantity: Math.min(100, item.quantity), maxQuantity: Math.max(1, Math.min(100, Number.isInteger(item.maxQuantity) ? item.maxQuantity : 10)) }] : []);
  } catch { return []; }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartLine[]>(initialItems);
  const update = (next: CartLine[]) => {
    setItems(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* private mode */ }
  };
  const value = useMemo<CartContextValue>(() => ({
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    add: (serviceKey, quantity = 1, maxQuantity = 10) => {
      const cap = Math.max(1, Math.min(100, maxQuantity));
      update(items.some(item => item.serviceKey === serviceKey)
        ? items.map(item => item.serviceKey === serviceKey ? { ...item, maxQuantity: cap, quantity: Math.min(cap, item.quantity + quantity) } : item)
        : [...items, { serviceKey, quantity: Math.min(cap, quantity), maxQuantity: cap }]);
    },
    setQuantity: (serviceKey, quantity, maxQuantity = 10) => {
      const cap = Math.max(1, Math.min(100, maxQuantity));
      update(quantity < 1 ? items.filter(item => item.serviceKey !== serviceKey)
        : items.map(item => item.serviceKey === serviceKey ? { ...item, maxQuantity: cap, quantity: Math.min(cap, quantity) } : item));
    },
    adjustMany: changes => {
      const lookup = new Map(changes.map(change => [change.serviceKey, change]));
      update(items.map(item => {
        const change = lookup.get(item.serviceKey);
        if (!change || change.quantity < 1) return item;
        const cap = Math.max(1, Math.min(100, change.maxQuantity));
        return { ...item, maxQuantity: cap, quantity: Math.min(cap, change.quantity) };
      }));
    },
    remove: serviceKey => update(items.filter(item => item.serviceKey !== serviceKey)),
    clear: () => update([]),
  }), [items]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
