import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";

type CartItemType = "donut" | "box";

export type BoxChoice = {
  donutId: string;
  qty: number;
};

export type CartItem = {
  id: string;               
  type: CartItemType;

  productId: string;        
  name: string;
  unitPrice: number;       
  qty: number;              

  imageUrl?: string | null;

  
  variant?: string | null;

  
  choices?: {
    boxSize: number;
    donuts: BoxChoice[];
  };
};

type State = {
  items: CartItem[];
};

type Action =
  | { type: "LOAD"; items: CartItem[] }
  | { type: "CLEAR" }
  | { type: "REMOVE_ITEM"; cartItemId: string }
  | { type: "ADD_DONUT"; payload: Omit<CartItem, "id" | "type" | "choices"> & { variant?: string | null } }
  | { type: "ADD_BOX"; payload: Omit<CartItem, "id" | "type" | "variant"> & { choices: CartItem["choices"] } }
  | { type: "SET_DONUT_QTY"; cartItemId: string; qty: number };

const STORAGE_KEY = "dunkin.cart.v1";

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "LOAD":
      return { items: action.items };

    case "CLEAR":
      return { items: [] };

    case "REMOVE_ITEM":
      return { items: state.items.filter((i) => i.id !== action.cartItemId) };

    case "ADD_DONUT": {
      const p = action.payload;

      
      const idx = state.items.findIndex(
        (i) =>
          i.type === "donut" &&
          i.productId === p.productId &&
          (i.variant ?? null) === (p.variant ?? null)
      );

      if (idx >= 0) {
        const copy = [...state.items];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + p.qty };
        return { items: copy };
      }

      const newItem: CartItem = {
        id: makeId(),
        type: "donut",
        productId: p.productId,
        name: p.name,
        unitPrice: p.unitPrice,
        qty: p.qty,
        imageUrl: p.imageUrl ?? null,
        variant: p.variant ?? null,
      };
      return { items: [newItem, ...state.items] };
    }

    case "ADD_BOX": {
      const p = action.payload;

      
      const newItem: CartItem = {
        id: makeId(),
        type: "box",
        productId: p.productId,
        name: p.name,
        unitPrice: p.unitPrice,
        qty: p.qty, 
        imageUrl: p.imageUrl ?? null,
        choices: p.choices,
      };
      return { items: [newItem, ...state.items] };
    }

    case "SET_DONUT_QTY": {
      const copy = state.items.map((i) => {
        if (i.id !== action.cartItemId) return i;
        if (i.type !== "donut") return i;
        return { ...i, qty: Math.max(1, action.qty) };
      });
      return { items: copy };
    }

    default:
      return state;
  }
}

type CartContextValue = {
  items: CartItem[];
  totalCount: number;
  totalPrice: number;

  addDonut: (p: {
    productId: string;
    name: string;
    unitPrice: number;
    qty: number;
    imageUrl?: string | null;
    variant?: string | null;
  }) => void;

  addBox: (p: {
    productId: string;
    name: string;
    unitPrice: number; 
    boxSize: number;
    donuts: BoxChoice[];
    imageUrl?: string | null;
  }) => void;

  removeItem: (cartItemId: string) => void;
  clear: () => void;
  setDonutQty: (cartItemId: string, qty: number) => void;
};

const CartCtx = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { items: [] });

 
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as CartItem[];
        dispatch({ type: "LOAD", items: parsed });
      } catch (e) {
        console.error("Failed to load cart", e);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
      } catch (e) {
        console.error("Failed to save cart", e);
      }
    })();
  }, [state.items]);

  const totalCount = useMemo(
    () => state.items.reduce((sum, i) => sum + (i.type === "donut" ? i.qty : i.qty), 0),
    [state.items]
  );

  const totalPrice = useMemo(
    () => state.items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0),
    [state.items]
  );

  const value: CartContextValue = {
    items: state.items,
    totalCount,
    totalPrice,

    addDonut: (p) => dispatch({ type: "ADD_DONUT", payload: p }),
    addBox: (p) =>
      dispatch({
        type: "ADD_BOX",
        payload: {
          productId: p.productId,
          name: p.name,
          unitPrice: p.unitPrice,
          qty: 1,
          imageUrl: p.imageUrl ?? null,
          choices: { boxSize: p.boxSize, donuts: p.donuts },
        },
      }),
    removeItem: (id) => dispatch({ type: "REMOVE_ITEM", cartItemId: id }),
    clear: () => dispatch({ type: "CLEAR" }),
    setDonutQty: (id, qty) => dispatch({ type: "SET_DONUT_QTY", cartItemId: id, qty }),
  };

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
