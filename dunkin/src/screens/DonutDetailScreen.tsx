import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { supabase } from "../services/supabase";
import { useCart } from "../state/CartContext";




type Product = {
  id: string;
  type: "donut" | "drink" | "box";
  name: string;
  base_price: number;
  image_url: string | null;
  description: string | null;

  variants?: string[] | null;
  tags?: string[] | null;

  // als je enums/arrays gebruikte:
  diet_labels?: string[] | null; // bv ["vegan"]
  allergens?: string[] | null;   // bv ["nuts","milk"]
};

export default function DonutDetailScreen({ route, navigation }: any) {
  const { id } = route.params as { id: string };

  const { addDonut } = useCart();

  const [loading, setLoading] = useState(true);
  const [donut, setDonut] = useState<Product | null>(null);

  const [variant, setVariant] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("products")
          .select(
            "id,type,name,base_price,image_url,description,variants,tags,diet_labels,allergens,available"
          )
          .eq("id", id)
          .single();

        if (error) throw error;

        const p = data as Product & { available?: boolean };
        if (p.type !== "donut") {
          Alert.alert("Niet gevonden", "Dit product is geen donut.");
          navigation.goBack();
          return;
        }

        setDonut(p);
        setVariant(p.variants?.[0] ?? null);
      } catch (e: any) {
        console.error(e);
        Alert.alert("Fout", "Kon donut niet laden.");
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigation]);

  const isVegan = !!donut?.diet_labels?.includes("vegan");
  const hasNuts =
    !!donut?.allergens?.includes("nuts") || !!donut?.allergens?.includes("peanuts");

  const badge = useMemo(() => {
    const tags = donut?.tags ?? [];
    if (tags.includes("kerst")) return { text: "KERST", bg: "#fee2e2", fg: "#991b1b" };
    if (tags.includes("special")) return { text: "SPECIAL", bg: "#fee2e2", fg: "#991b1b" };
    if (tags.includes("new")) return { text: "NEW", bg: "#dcfce7", fg: "#166534" };
    return null;
  }, [donut?.tags]);

  function decQty() {
    setQty((q) => Math.max(1, q - 1));
  }
  function incQty() {
    setQty((q) => q + 1);
  }

  function onAdd() {
  if (!donut) return;

  addDonut({
    productId: donut.id,
    name: donut.name,
    unitPrice: Number(donut.base_price),
    qty,
    imageUrl: donut.image_url,
    variant,
  });

  Alert.alert("Toegevoegd", `${qty}x ${donut.name}`);
  navigation.goBack();
}


  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator />
        <Text style={s.muted}>Laden…</Text>
      </View>
    );
  }

  if (!donut) return null;

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Image */}
      {donut.image_url ? (
        <Image source={{ uri: donut.image_url }} style={s.image} resizeMode="cover" />
      ) : (
        <View style={[s.image, s.imagePlaceholder]}>
          <Text style={s.muted}>Geen foto</Text>
        </View>
      )}

      <View style={s.body}>
        {/* Title row */}
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <Text style={s.title}>{donut.name}</Text>

            {badge && (
              <View style={[s.badge, { backgroundColor: badge.bg }]}>
                <Text style={[s.badgeText, { color: badge.fg }]}>{badge.text}</Text>
              </View>
            )}

            {isVegan && (
              <View style={[s.badge, { backgroundColor: "#dcfce7" }]}>
                <Text style={[s.badgeText, { color: "#166534" }]}>VEGAN</Text>
              </View>
            )}

            {hasNuts && (
              <View style={[s.badge, { backgroundColor: "#fee2e2" }]}>
                <Text style={[s.badgeText, { color: "#991b1b" }]}>NOTEN</Text>
              </View>
            )}
          </View>

          <Text style={s.price}>€ {Number(donut.base_price).toFixed(2)}</Text>

          {donut.description ? <Text style={s.desc}>{donut.description}</Text> : null}
        </View>

        {/* Allergenen lijst */}
        {donut.allergens && donut.allergens.length > 0 && (
          <View style={{ marginTop: 14, gap: 8 }}>
            <Text style={s.sectionTitle}>Allergenen</Text>
            <View style={s.pillsRow}>
              {donut.allergens.map((a) => (
                <View key={a} style={[s.pill, { backgroundColor: "#fef2f2" }]}>
                  <Text style={[s.pillText, { color: "#991b1b" }]}>{a.toUpperCase()}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Variants */}
        {donut.variants && donut.variants.length > 0 && (
          <View style={{ marginTop: 14, gap: 8 }}>
            <Text style={s.sectionTitle}>Variant</Text>
            <View style={s.pillsRow}>
              {donut.variants.map((v) => {
                const active = v === variant;
                return (
                  <Pressable
                    key={v}
                    onPress={() => setVariant(v)}
                    style={({ pressed }) => [
                      s.pill,
                      {
                        backgroundColor: active ? "#f3e8ff" : "#f3f4f6",
                        borderColor: active ? "#6b21a8" : "transparent",
                        borderWidth: 1,
                      },
                      pressed && s.pressed,
                    ]}
                  >
                    <Text style={[s.pillText, { color: active ? "#6b21a8" : "#111" }]}>{v}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Quantity + Add */}
        <View style={s.bottomRow}>
          <View style={s.qtyRow}>
            <Pressable onPress={decQty} style={({ pressed }) => [s.qtyBtn, pressed && s.pressed]}>
              <Text style={s.qtyBtnText}>−</Text>
            </Pressable>
            <Text style={s.qtyText}>{qty}</Text>
            <Pressable onPress={incQty} style={({ pressed }) => [s.qtyBtn, pressed && s.pressed]}>
              <Text style={s.qtyBtnText}>+</Text>
            </Pressable>
          </View>

          <Pressable onPress={onAdd} style={({ pressed }) => [s.addBtn, pressed && s.pressed]}>
            <Text style={s.addBtnText}>Voeg toe</Text>
          </Pressable>
        </View>

        <Text style={s.disclaimer}>
          Allergenen-info is indicatief. Vraag in de winkel bij twijfel.
        </Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "white" },
  muted: { color: "#666" },

  image: { width: "100%", height: 260, backgroundColor: "#fafafa" },
  imagePlaceholder: { alignItems: "center", justifyContent: "center" },

  body: { padding: 16, gap: 10 },
  title: { fontSize: 22, fontWeight: "900" },
  price: { fontSize: 16, fontWeight: "800", marginTop: 2 },
  desc: { color: "#555", marginTop: 6, lineHeight: 20 },

  sectionTitle: { fontSize: 14, fontWeight: "900" },

  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: "900" },

  pillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, backgroundColor: "#f3f4f6" },
  pillText: { fontSize: 12, fontWeight: "900" },

  bottomRow: { marginTop: 18, flexDirection: "row", alignItems: "center", gap: 12 },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnText: { fontSize: 20, fontWeight: "900" },
  qtyText: { minWidth: 22, textAlign: "center", fontWeight: "900", fontSize: 16 },

  addBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#16a34a",
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnText: { color: "white", fontWeight: "900" },

  pressed: { opacity: 0.85 },
  disclaimer: { marginTop: 14, color: "#777", fontSize: 12 },
});
