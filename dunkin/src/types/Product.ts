export type ProductType = "donut" | "drink";

export type Product = {
  id: string;
  type: ProductType;
  name: string;
  base_price: number;
  image_url: string | null;
  description: string | null;
  variants: string[] | null;
  options: any | null;
};
