import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useCart, CartItem } from "../state/CartContext";
import { supabase } from "../services/supabase";

export default function CheckoutScreen({ navigation }: any) {
  const { items, totalPrice, clear, removeItem } = useCart();

  // 🔹 donutId -> donutName
  const [donutMap, setDonutMap] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name")
        .eq("type", "donut");

      if (!error && data) {
        const map: Record<string, string> = {};
        data.forEach((d) => {
          map[d.id] = d.name;
        });
        setDonutMap(map);
      }
    })();
  }, []);

  function onClear() {
    Alert.alert("Mandje leegmaken?", "Alles verwijderen uit je mandje.", [
      { text: "Annuleer", style: "cancel" },
      { text: "Leegmaken", style: "destructive", onPress: clear },
    ]);
  }

  function onConfirm() {
    if (items.length === 0) {
      Alert.alert("Leeg mandje", "Voeg eerst iets toe aan je mandje.");
      return;
    }
    navigation.navigate("Pickup");
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Checkout</Text>
        <Pressable onPress={onClear} style={({ pressed }) => [s.linkBtn, pressed && s.pressed]}>
          <Text style={s.linkText}>Leegmaken</Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingBottom: 140 }}
        ListEmptyComponent={
          <View style={{ padding: 16 }}>
            <Text style={s.muted}>Je mandje is leeg.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <CartRow
            item={item}
            donutMap={donutMap}
            onRemove={() => removeItem(item.id)}
          />
        )}
      />

      <View style={s.bottomBar}>
        <View style={{ flex: 1 }}>
          <Text style={s.totalLabel}>Totaal</Text>
          <Text style={s.totalPrice}>€ {totalPrice.toFixed(2)}</Text>
        </View>

        <Pressable onPress={onConfirm} style={({ pressed }) => [s.primaryBtn, pressed && s.pressed]}>
          <Text style={s.primaryBtnText}>Verder</Text>
        </Pressable>
      </View>
    </View>
  );
}

function CartRow({
  item,
  onRemove,
  donutMap,
}: {
  item: CartItem;
  onRemove: () => void;
  donutMap: Record<string, string>;
}) {
  const subtitle =
    item.type === "donut"
      ? `${item.qty}x • € ${item.unitPrice.toFixed(2)}${item.variant ? ` • ${item.variant}` : ""}`
      : `1x doos • € ${item.unitPrice.toFixed(2)} • ${item.choices?.boxSize ?? ""} stuks`;

  const boxContents =
    item.type === "box" && item.choices?.donuts?.length
      ? item.choices.donuts
          .map((d) => `${d.qty}x ${donutMap[d.donutId] ?? d.donutId.slice(0, 6)}`)
          .join(" • ")
      : null;

  return (
    <View style={s.row}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={s.thumb} />
      ) : (
        <View style={[s.thumb, s.thumbPlaceholder]}>
          <Text style={s.mutedSmall}>—</Text>
        </View>
      )}

      <View style={{ flex: 1, gap: 4 }}>
        <Text style={s.rowTitle}>{item.name}</Text>
        <Text style={s.muted}>{subtitle}</Text>

        {boxContents ? (
          <Text style={s.mutedSmall} numberOfLines={2}>
            Inhoud: {boxContents}
          </Text>
        ) : null}
      </View>

      <Pressable onPress={onRemove} style={({ pressed }) => [s.removeBtn, pressed && s.pressed]}>
        <Text style={s.removeText}>✕</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },

  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 22, fontWeight: "900" },
  linkBtn: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10 },
  linkText: { color: "#991b1b", fontWeight: "900" },

  row: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "white",
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  thumb: { width: 64, height: 64, borderRadius: 12, backgroundColor: "#fafafa" },
  thumbPlaceholder: { alignItems: "center", justifyContent: "center" },

  rowTitle: { fontSize: 16, fontWeight: "900" },
  muted: { color: "#666" },
  mutedSmall: { color: "#777", fontSize: 12 },

  removeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
    justifyContent: "center",
  },
  removeText: { fontSize: 16, fontWeight: "900", color: "#991b1b" },

  bottomBar: {
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
  totalLabel: { color: "#666", fontWeight: "800" },
  totalPrice: { fontSize: 18, fontWeight: "900" },

  primaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: "#16a34a",
  },
  primaryBtnText: { color: "white", fontWeight: "900" },

  pressed: { opacity: 0.85 },
});
