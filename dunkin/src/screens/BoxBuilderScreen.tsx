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

type Donut = {
  id: string;
  name: string;
  base_price: number;
  image_url: string | null;
  tags: string[] | null;
  sort_priority: number;
  available?: boolean;
};

type SelectedMap = Record<string, number>;  

export default function BoxBuilderScreen({ route, navigation }: any) {
  const { boxId, boxSize, boxName, boxPrice, boxImageUrl } = route.params as {
    boxId: string;
    boxSize: number; 
    boxName: string;
    boxPrice: number;
    boxImageUrl?: string | null;
  };

  const { addBox } = useCart();

  const [loading, setLoading] = useState(true);
  const [donuts, setDonuts] = useState<Donut[]>([]);
  const [selected, setSelected] = useState<SelectedMap>({});

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("products")
          .select("id,name,base_price,image_url,tags,sort_priority,available,type")
          .eq("available", true)
          .eq("type", "donut")
          .order("sort_priority", { ascending: false })
          .order("name", { ascending: true });

        if (error) throw error;
        setDonuts((data ?? []) as Donut[]);
      } catch (e: any) {
        console.error(e);
        Alert.alert("Fout", "Kon donuts niet laden.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalSelected = useMemo(
    () => Object.values(selected).reduce((sum, n) => sum + n, 0),
    [selected]
  );

  const remaining = boxSize - totalSelected;

  const selectedList = useMemo(() => {
    
    const map = new Map(donuts.map((d) => [d.id, d]));
    return Object.entries(selected)
      .map(([donutId, qty]) => ({ donut: map.get(donutId), donutId, qty }))
      .filter((x) => !!x.donut)
      .sort((a, b) => (b.qty ?? 0) - (a.qty ?? 0));
  }, [selected, donuts]);

  function tagLabel(tags?: string[] | null) {
    if (!tags || tags.length === 0) return null;
    if (tags.includes("kerst")) return { text: "KERST", bg: "#fee2e2", fg: "#991b1b" };
    if (tags.includes("special")) return { text: "SPECIAL", bg: "#fee2e2", fg: "#991b1b" };
    if (tags.includes("new")) return { text: "NEW", bg: "#dcfce7", fg: "#166534" };
    return null;
  }

  function inc(donutId: string) {
    if (remaining <= 0) return;

    setSelected((prev) => {
      const current = prev[donutId] ?? 0;
      return { ...prev, [donutId]: current + 1 };
    });
  }

  function dec(donutId: string) {
    setSelected((prev) => {
      const current = prev[donutId] ?? 0;
      if (current <= 1) {
        const copy = { ...prev };
        delete copy[donutId];
        return copy;
      }
      return { ...prev, [donutId]: current - 1 };
    });
  }

  function clearSelection() {
    Alert.alert("Resetten?", "Je selectie leegmaken.", [
      { text: "Annuleer", style: "cancel" },
      { text: "Reset", style: "destructive", onPress: () => setSelected({}) },
    ]);
  }

  function addToCart() {
    if (totalSelected !== boxSize) {
      Alert.alert("Doos niet vol", `Kies nog ${boxSize - totalSelected} donut(s).`);
      return;
    }

    const donutsChoices = Object.entries(selected).map(([donutId, qty]) => ({
      donutId,
      qty,
    }));

    addBox({
      productId: boxId,
      name: boxName,
      unitPrice: Number(boxPrice),
      boxSize,
      donuts: donutsChoices,
      imageUrl: boxImageUrl ?? null,
    });

    Alert.alert("Toegevoegd !", `${boxName} is toegevoegd aan je mandje.`);
    navigation.navigate("Checkout");
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator />
        <Text style={s.muted}>Donuts laden…</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      
      <View style={s.top}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{boxName}</Text>
          <Text style={s.muted}>Vul je doos met {boxSize} donuts</Text>
          <Text style={s.muted}>
            Gekozen: {totalSelected}/{boxSize} • Nog: {Math.max(0, remaining)}
          </Text>
        </View>

        <Pressable onPress={clearSelection} style={({ pressed }) => [s.resetBtn, pressed && s.pressed]}>
          <Text style={s.resetText}>Reset</Text>
        </Pressable>
      </View>

      
      <FlatList
        data={donuts}
        keyExtractor={(d) => d.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 220 }}
        renderItem={({ item }) => {
          const qty = selected[item.id] ?? 0;
          const badge = tagLabel(item.tags);

          return (
            <View style={s.card}>
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={s.image} resizeMode="cover" />
              ) : (
                <View style={[s.image, s.imagePlaceholder]}>
                  <Text style={s.muted}>Geen foto</Text>
                </View>
              )}

              <View style={s.cardBody}>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <Text style={s.cardTitle}>{item.name}</Text>
                    {badge && (
                      <View style={[s.badge, { backgroundColor: badge.bg }]}>
                        <Text style={[s.badgeText, { color: badge.fg }]}>{badge.text}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.mutedSmall}>Los: € {Number(item.base_price).toFixed(2)}</Text>
                </View>

                <View style={s.counter}>
                  <Pressable
                    onPress={() => dec(item.id)}
                    disabled={qty === 0}
                    style={({ pressed }) => [
                      s.counterBtn,
                      qty === 0 && { opacity: 0.4 },
                      pressed && s.pressed,
                    ]}
                  >
                    <Text style={s.counterBtnText}>−</Text>
                  </Pressable>

                  <Text style={s.counterQty}>{qty}</Text>

                  <Pressable
                    onPress={() => inc(item.id)}
                    disabled={remaining <= 0}
                    style={({ pressed }) => [
                      s.counterBtn,
                      remaining <= 0 && { opacity: 0.4 },
                      pressed && s.pressed,
                    ]}
                  >
                    <Text style={s.counterBtnText}>+</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={{ paddingVertical: 20 }}>
            <Text style={s.muted}>Geen donuts gevonden.</Text>
          </View>
        }
      />

      <View style={s.bottom}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={s.sectionTitle}>Jouw selectie</Text>
          {selectedList.length === 0 ? (
            <Text style={s.mutedSmall}>Nog niets gekozen.</Text>
          ) : (
            <Text style={s.mutedSmall} numberOfLines={2}>
              {selectedList
                .map((x) => `${x.qty}× ${x.donut?.name ?? x.donutId.slice(0, 6)}`)
                .join(" • ")}
            </Text>
          )}

          <Text style={s.priceLine}>Doosprijs: € {Number(boxPrice).toFixed(2)}</Text>
        </View>

        <Pressable
          onPress={addToCart}
          style={({ pressed }) => [
            s.primaryBtn,
            pressed && s.pressed,
            totalSelected !== boxSize && { opacity: 0.6 },
          ]}
        >
          <Text style={s.primaryText}>Voeg doos toe</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "white" },
  muted: { color: "#666" },
  mutedSmall: { color: "#777", fontSize: 12 },

  top: { padding: 16, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  title: { fontSize: 20, fontWeight: "900" },

  resetBtn: {
    borderWidth: 1,
    borderColor: "#eee",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "white",
  },
  resetText: { fontWeight: "900", color: "#991b1b" },

  card: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#eee",
    overflow: "hidden",
    backgroundColor: "white",
  },
  image: { width: "100%", height: 140, backgroundColor: "#fafafa" },
  imagePlaceholder: { alignItems: "center", justifyContent: "center" },

  cardBody: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  cardTitle: { fontSize: 16, fontWeight: "900" },

  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: "900" },

  counter: { flexDirection: "row", alignItems: "center", gap: 10 },
  counterBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
    justifyContent: "center",
  },
  counterBtnText: { fontSize: 20, fontWeight: "900" },
  counterQty: { width: 20, textAlign: "center", fontWeight: "900", fontSize: 16 },

  bottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sectionTitle: { fontWeight: "900" },
  priceLine: { marginTop: 2, fontWeight: "900" },

  primaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#16a34a",
  },
  primaryText: { color: "white", fontWeight: "900" },

  pressed: { opacity: 0.85 },
});
