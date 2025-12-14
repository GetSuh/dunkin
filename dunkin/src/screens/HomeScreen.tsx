import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { supabase } from "../services/supabase";
import { useCart } from "../state/CartContext";

type ProductType = "donut" | "drink" | "box";

type Product = {
  id: string;
  type: ProductType;
  name: string;
  base_price: number;
  image_url: string | null;
  description: string | null;
  tags: string[] | null;
  sort_priority: number;
  options: any | null; 
};

export default function HomeScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const { totalCount } = useCart();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("products")
          .select(
            "id,type,name,base_price,image_url,description,tags,sort_priority,options,available"
          )
          .eq("available", true)
          .in("type", ["donut", "box"])
          .order("sort_priority", { ascending: false })
          .order("name", { ascending: true });

        if (error) throw error;
        setProducts((data ?? []) as Product[]);
      } catch (e: any) {
        console.error(e);
        Alert.alert("Fout", "Kon producten niet laden.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const boxes = useMemo(() => products.filter((p) => p.type === "box"), [products]);
  const donuts = useMemo(() => products.filter((p) => p.type === "donut"), [products]);

  function tagLabel(tags?: string[] | null) {
    if (!tags || tags.length === 0) return null;
    if (tags.includes("kerst")) return { text: "KERST", bg: "#fee2e2", fg: "#991b1b" };
    if (tags.includes("special")) return { text: "SPECIAL", bg: "#fee2e2", fg: "#991b1b" };
    if (tags.includes("new")) return { text: "NEW", bg: "#dcfce7", fg: "#166534" };
    return { text: tags[0].toUpperCase(), bg: "#e5e7eb", fg: "#111827" };
  }

  function openBox(box: Product) {
    const boxSize = box.options?.boxSize ?? (box.name.includes("12") ? 12 : 6);
    navigation.navigate("BoxBuilder", {
      boxId: box.id,
      boxSize,
      boxName: box.name,
      boxPrice: box.base_price,
      boxImageUrl: box.image_url,
    });
  }

  function openDonut(donut: Product) {
    navigation.navigate("ProductDetail", { id: donut.id });
  }

  function openCart() {
    navigation.navigate("Checkout");
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator />
        <Text style={s.muted}>Laden…</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={donuts}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingBottom: 24 }}
      ListHeaderComponent={
        <View style={{ paddingTop: 12 }}>
          
          <View style={s.topBar}>
            <View>
              <Text style={s.title}>Dunkin</Text>
              <Text style={s.subtitle}>Kies een donut of stel een doos samen</Text>
            </View>

            <Pressable onPress={openCart} style={({ pressed }) => [s.cartBtn, pressed && s.pressed]}>
              <Text style={s.cartIcon}>🛒</Text>

              {totalCount > 0 && (
                <View style={s.cartBadge}>
                  <Text style={s.cartBadgeText}>{totalCount}</Text>
                </View>
              )}
            </Pressable>
          </View>

          
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Dozen</Text>
            <Text style={s.mutedSmall}>Vaste prijs</Text>
          </View>

          <FlatList
            horizontal
            data={boxes}
            keyExtractor={(b) => b.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8, gap: 12 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => openBox(item)}
                style={({ pressed }) => [s.boxCard, pressed && s.pressed]}
              >
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={s.boxImage} resizeMode="cover" />
                ) : (
                  <View style={[s.boxImage, s.imagePlaceholder]}>
                    <Text style={s.mutedSmall}>Geen foto</Text>
                  </View>
                )}
                <View style={{ padding: 10, gap: 4 }}>
                  <Text style={s.boxTitle}>{item.name}</Text>
                  <Text style={s.muted}>€ {Number(item.base_price).toFixed(2)}</Text>
                  <View style={s.primaryPill}>
                    <Text style={s.primaryPillText}>Samenstellen</Text>
                  </View>
                </View>
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={{ paddingHorizontal: 16 }}>
                <Text style={s.muted}>Geen box producten gevonden.</Text>
              </View>
            }
          />

          {/* Donuts section */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Donuts</Text>
            <Text style={s.mutedSmall}>Specials staan bovenaan</Text>
          </View>
        </View>
      }
      renderItem={({ item }) => {
        const badge = tagLabel(item.tags);

        return (
          <Pressable
            onPress={() => openDonut(item)}
            style={({ pressed }) => [s.card, pressed && s.pressed]}
          >
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={s.image} resizeMode="cover" />
            ) : (
              <View style={[s.image, s.imagePlaceholder]}>
                <Text style={s.muted}>Geen foto</Text>
              </View>
            )}

            <View style={s.cardBody}>
              <View style={{ flex: 1, gap: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={s.cardTitle}>{item.name}</Text>
                  {badge && (
                    <View style={[s.badge, { backgroundColor: badge.bg }]}>
                      <Text style={[s.badgeText, { color: badge.fg }]}>{badge.text}</Text>
                    </View>
                  )}
                </View>

                <Text style={s.muted}>€ {Number(item.base_price).toFixed(2)}</Text>

                {item.description ? (
                  <Text style={s.desc} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
              </View>

              <View style={s.chevronWrap}>
                <Text style={s.chevron}>›</Text>
              </View>
            </View>
          </Pressable>
        );
      }}
      ListEmptyComponent={
        <View style={{ padding: 16 }}>
          <Text style={s.muted}>Geen donuts gevonden.</Text>
        </View>
      }
    />
  );
}

const s = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "white",
  },

  muted: { color: "#666" },
  mutedSmall: { color: "#666", fontSize: 12 },

  // ✅ top bar
  topBar: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  title: { fontSize: 24, fontWeight: "900" },
  subtitle: { marginTop: 6, color: "#555" },

  cartBtn: {
    position: "relative",
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    marginTop: 2,
  },
  cartIcon: { fontSize: 20 },
  cartBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  cartBadgeText: { color: "white", fontSize: 11, fontWeight: "900" },

  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 18, fontWeight: "900" },

  boxCard: {
    width: 210,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#eee",
    overflow: "hidden",
    backgroundColor: "white",
  },
  boxImage: { width: "100%", height: 110 },

  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fafafa",
  },

  boxTitle: { fontSize: 16, fontWeight: "900" },

  primaryPill: {
    marginTop: 6,
    alignSelf: "flex-start",
    backgroundColor: "#16a34a",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  primaryPillText: { color: "white", fontWeight: "900", fontSize: 12 },

  card: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#eee",
    overflow: "hidden",
    backgroundColor: "white",
  },
  image: { width: "100%", height: 160 },

  cardBody: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  cardTitle: { fontSize: 16, fontWeight: "900" },
  desc: { color: "#555", fontSize: 13 },

  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: "900" },

  chevronWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
    justifyContent: "center",
  },
  chevron: { fontSize: 22, fontWeight: "900", color: "#111" },

  pressed: { opacity: 0.85 },
});
