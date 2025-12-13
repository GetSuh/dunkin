import { supabase } from "./supabase";
import { Product } from "../types/Product";

export async function fetchProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("available", true);

  if (error) throw error;
  return data as Product[];
}
