import { derive, sig } from "@vaakx-dev/vrui";

export type Part = {
  id: number;
  location: string;
  name: string;
  reorder_at: number;
  sku: string;
  stock: number;
};

const initial: Part[] = [
  { id: 1, location: "A1", name: "Shimano B05S brake pads", reorder_at: 6, sku: "BR-B05S", stock: 4 },
  { id: 2, location: "B3", name: "KMC X10 chain", reorder_at: 4, sku: "CH-X10", stock: 8 },
  { id: 3, location: "C2", name: "700 x 28-32 tube", reorder_at: 12, sku: "TU-70032", stock: 9 },
  { id: 4, location: "A4", name: "Jagwire shift cable", reorder_at: 8, sku: "CA-SHIFT", stock: 18 },
  { id: 5, location: "D1", name: "Tubeless sealant 1 L", reorder_at: 3, sku: "TL-SEAL", stock: 2 },
  { id: 6, location: "B1", name: "11-speed quick link", reorder_at: 5, sku: "QL-11", stock: 11 },
];

export function create_parts() {
  const parts = sig(initial);
  const query = sig("");
  const low_only = sig(false);
  const visible = derive(() => {
    const term = query.get().trim().toLowerCase();
    return parts.get().filter((part) => {
      const matches_query = !term ||
        part.name.toLowerCase().includes(term) ||
        part.sku.toLowerCase().includes(term) ||
        part.location.toLowerCase().includes(term);
      const matches_stock = !low_only.get() || part.stock <= part.reorder_at;
      return matches_query && matches_stock;
    });
  });
  const empty = derive(() => visible.get().length === 0);
  const low_count = derive(() => parts.get().filter((part) => part.stock <= part.reorder_at).length);

  function receive(id: number): void {
    parts.update((items) => items.map((part) => (
      part.id === id ? { ...part, stock: part.stock + 6 } : part
    )));
  }

  return { empty, low_count, low_only, parts, query, receive, visible };
}

export type PartsModel = ReturnType<typeof create_parts>;
