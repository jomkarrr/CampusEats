import React, { createContext, useContext, useState, useMemo } from 'react';
import { Alert } from 'react-native';
import { Database } from '../lib/database.types';

export type MenuItemRow = Database['public']['Tables']['menu_items']['Row'];

export interface CartItem {
  menuItem: MenuItemRow;
  qty: number;
  outletId: string;
  outletName?: string;
}

export interface CartContextValue {
  items: CartItem[];
  outletId: string | null;
  outletName: string | null;
  itemCount: number;
  subtotal: number;
  addItem: (item: MenuItemRow, outletId: string, outletName?: string) => void;
  addItemQty: (
    item: MenuItemRow,
    outletId: string,
    outletName?: string,
    qty?: number,
    onSuccess?: () => void
  ) => boolean;
  removeItem: (menuItemId: string) => void;
  removeLine: (menuItemId: string) => void;
  setQty: (menuItemId: string, qty: number) => void;
  getItemQty: (menuItemId: string) => number;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export { formatINR } from '../lib/format';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [outletId, setOutletId] = useState<string | null>(null);
  const [outletName, setOutletName] = useState<string | null>(null);

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.qty, 0),
    [items]
  );

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.menuItem.price * item.qty, 0),
    [items]
  );

  const addItem = (item: MenuItemRow, newOutletId: string, newOutletName?: string) => {
    if (items.length > 0 && outletId && outletId !== newOutletId) {
      Alert.alert(
        'Start new cart?',
        `Your cart already has items from ${outletName ?? 'another outlet'}. Reset cart to add items from ${newOutletName ?? 'this outlet'}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reset & Add',
            style: 'destructive',
            onPress: () => {
              setItems([{ menuItem: item, qty: 1, outletId: newOutletId, outletName: newOutletName }]);
              setOutletId(newOutletId);
              setOutletName(newOutletName ?? null);
            },
          },
        ]
      );
      return;
    }

    setItems((prev) => {
      const existing = prev.find((i) => i.menuItem.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.menuItem.id === item.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { menuItem: item, qty: 1, outletId: newOutletId, outletName: newOutletName }];
    });
    setOutletId(newOutletId);
    if (newOutletName) setOutletName(newOutletName);
  };

  const addItemQty = (
    item: MenuItemRow,
    newOutletId: string,
    newOutletName: string | undefined,
    qty = 1,
    onSuccess?: () => void
  ): boolean => {
    if (items.length > 0 && outletId && outletId !== newOutletId) {
      Alert.alert(
        'Start new cart?',
        `Your cart already has items from ${outletName ?? 'another outlet'}. Reset cart to add items from ${newOutletName ?? 'this outlet'}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reset & Add',
            style: 'destructive',
            onPress: () => {
              setItems([{ menuItem: item, qty, outletId: newOutletId, outletName: newOutletName }]);
              setOutletId(newOutletId);
              setOutletName(newOutletName ?? null);
              if (onSuccess) onSuccess();
            },
          },
        ]
      );
      return false;
    }

    setItems((prev) => {
      const existing = prev.find((i) => i.menuItem.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.menuItem.id === item.id ? { ...i, qty: i.qty + qty } : i
        );
      }
      return [...prev, { menuItem: item, qty, outletId: newOutletId, outletName: newOutletName }];
    });
    setOutletId(newOutletId);
    if (newOutletName) setOutletName(newOutletName);
    if (onSuccess) onSuccess();
    return true;
  };

  const removeItem = (menuItemId: string) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.menuItem.id === menuItemId);
      if (!existing) return prev;
      if (existing.qty <= 1) {
        const remaining = prev.filter((i) => i.menuItem.id !== menuItemId);
        if (remaining.length === 0) {
          setOutletId(null);
          setOutletName(null);
        }
        return remaining;
      }
      return prev.map((i) =>
        i.menuItem.id === menuItemId ? { ...i, qty: i.qty - 1 } : i
      );
    });
  };

  const removeLine = (menuItemId: string) => {
    setItems((prev) => {
      const remaining = prev.filter((i) => i.menuItem.id !== menuItemId);
      if (remaining.length === 0) {
        setOutletId(null);
        setOutletName(null);
      }
      return remaining;
    });
  };

  const setQty = (menuItemId: string, qty: number) => {
    if (qty <= 0) {
      setItems((prev) => {
        const remaining = prev.filter((i) => i.menuItem.id !== menuItemId);
        if (remaining.length === 0) {
          setOutletId(null);
          setOutletName(null);
        }
        return remaining;
      });
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.menuItem.id === menuItemId ? { ...i, qty } : i
      )
    );
  };

  const getItemQty = (menuItemId: string): number => {
    const found = items.find((i) => i.menuItem.id === menuItemId);
    return found ? found.qty : 0;
  };

  const clearCart = () => {
    setItems([]);
    setOutletId(null);
    setOutletName(null);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        outletId,
        outletName,
        itemCount,
        subtotal,
        addItem,
        addItemQty,
        removeItem,
        removeLine,
        setQty,
        getItemQty,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
}
