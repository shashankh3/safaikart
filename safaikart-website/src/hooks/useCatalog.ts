import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { getDb } from "@/lib/firebase";

export type Category = { id: string; name?: string; iconName?: string };
export type ServiceAddon = { name: string; priceMinor: number };
export type Service = {
  id: string;
  categoryId?: string;
  name?: string;
  priceMinor?: number;
  unit?: string;
  priceType?: "fixed" | "variable" | string;
  addons?: ServiceAddon[];
};

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<Category[]> => {
      const db = getDb();
      const snap = await getDocs(query(collection(db, "categories"), orderBy("name")));
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as Category[];
    },
  });
}

export function useServices() {
  return useQuery({
    queryKey: ["services"],
    queryFn: async (): Promise<Service[]> => {
      const db = getDb();
      const snap = await getDocs(collection(db, "services"));
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as Service[];
    },
  });
}
