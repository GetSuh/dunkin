import { useEffect, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { fetchProducts } from "../services/products";
import { Product } from "../types/Product";

export default function HomeScreen() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetchProducts().then(setProducts).catch(console.error);
  }, []);

  return (
    <FlatList
      data={products}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={{ padding: 16, borderBottomWidth: 1 }}>
          <Text style={{ fontWeight: "600" }}>{item.name}</Text>
          <Text>€ {item.base_price.toFixed(2)}</Text>
        </View>
      )}
    />
  );
}
