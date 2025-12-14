import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../services/supabase";
import { useCart, CartItem } from "../state/CartContext";

type Store = { id: string; name: string | null };

export default function ConfirmReservationScreen({ route, navigation }: any) {
  const { storeId, pickupAt } = route.params as { storeId: string; pickupAt: string };

  const { items, totalPrice, clear } = useCart();

  const [store, setStore] = useState<Store | null>(null);
  const [loadingStore, setLoadingStore] = useState(true);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const pickupDate = useMemo(() => new Date(pickupAt), [pickupAt]);

  useEffect(() => {
    (async () => {
      try {
        setLoadingStore(true);
        const { data, error } = await supabase
          .from("stores")
          .select("id,name")
          .eq("id", storeId)
          .single();

        if (error) throw error;
        setStore(data as Store);
      } catch (e) {
        console.error(e);
        setStore(null);
      } finally {
        setLoadingStore(false);
      }
    })();
  }, [storeId]);

  function formatPickup(d: Date) {
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }

  async function onPlaceReservation() {
    if (items.length === 0) {
      Alert.alert("Leeg mandje", "Voeg eerst iets toe.");
      navigation.navigate("Tabs");
      return;
    }

    if (!customerName.trim()) {
      Alert.alert("Naam nodig", "Vul je naam in.");
      return;
    }

    try {
      setSubmitting(true);

      // 1) Insert reservation (nieuw schema)
      const { data: reservation, error: resError } = await supabase
        .from("reservations")
        .insert({
          store_id: storeId,
          pickup_at: pickupAt,
          status: "pending",
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim() || null,
          total_price: totalPrice,
        })
        .select("id")
        .single();

      if (resError) throw resError;

      const reservationId = reservation.id as string;

      // 2) Insert reservation_items
      // Let op: product_type is NOT NULL in jouw DB
      const rows = items.map((i) => ({
        reservation_id: reservationId,
        product_id: i.productId,
        product_type: i.type, // ✅ donut/box
        qty: i.qty,
        unit_price: i.unitPrice,
        name: i.name,
        variant: i.variant ?? null,
        choices: i.choices ?? null,
      }));

      const { error: itemsError } = await supabase.from("reservation_items").insert(rows);
      if (itemsError) throw itemsError;

      // 3) Clear cart + navigate
      clear();
      Alert.alert("Gelukt ✅", "Je reservering is geplaatst.");
      navigation.navigate("Tabs", { screen: "Reserveringen" });
    } catch (e: any) {
      console.error(e);
      Alert.alert("Fout", e?.message ?? "Reservering plaatsen mislukt.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingStore) {
    return (
      <View style={s.center}>
        <ActivityIndicator />
        <Text style={s.muted}>Laden…</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Bevestigen</Text>
        <Text style={s.muted}>
          Winkel: {store?.name ?? "Onbekend"}{"\n"}
          Afhalen: {formatPickup(pickupDate)}
        </Text>
      </View>

      {/* Customer info */}
      <View style={s.formCard}>
        <Text style={s.sectionTitle}>Jouw gegevens</Text>

        <Text style={s.label}>Naam</Text>
        <TextInput
          value={customerName}
          onChangeText={setCustomerName}
          placeholder="bv. Tom Jacobs"
          style={s.input}
          autoCapitalize="words"
        />

        <Text style={s.label}>Telefoon (optioneel)</Text>
        <TextInput
          value={customerPhone}
          onChangeText={setCustomerPhone}
          placeholder="bv. 04xx xx xx xx"
          style={s.input}
          keyboardType="phone-pad"
        />
      </View>

      {/* Items */}
      <Text style={[s.sectionTitle, { paddingHorizontal: 16, marginTop: 10 }]}>Overzicht</Text>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140, gap: 10 }}
        renderItem={({ item }) => <ItemRow item={item} />}
        ListEmptyComponent={<Text style={s.muted}>Je mandje is leeg.</Text>}
      />

      {/* Bottom bar */}
      <View style={s.bottomBar}>
        <View style={{ flex: 1 }}>
          <Text style={s.totalLabel}>Totaal</Text>
          <Text style={s.totalPrice}>€ {totalPrice.toFixed(2)}</Text>
        </View>

        <Pressable
          onPress={onPlaceReservation}
          disabled={submitting}
          style={({ pressed }) => [
            s.primaryBtn,
            pressed && s.pressed,
            submitting && { opacity: 0.6 },
          ]}
        >
          <Text style={s.primaryText}>{submitting ? "Bezig…" : "Plaats reservering"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ItemRow({ item }: { item: CartItem }) {
  const subtitle =
    item.type === "donut"
      ? `${item.qty}x • € ${item.unitPrice.toFixed(2)}${item.variant ? ` • ${item.variant}` : ""}`
      : `1x doos • € ${item.unitPrice.toFixed(2)} • ${item.choices?.boxSize ?? ""} stuks`;

  const boxContent =
    item.type === "box" && item.choices?.donuts?.length
      ? item.choices.donuts.map((d) => `${d.qty}x ${d.donutId.slice(0, 6)}`).join(" • ")
      : null;

  return (
    <View style={s.itemCard}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={s.itemTitle}>{item.name}</Text>
        <Text style={s.muted}>{subtitle}</Text>
        {boxContent ? (
          <Text style={s.mutedSmall} numberOfLines={2}>
            Inhoud: {boxContent}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "white" },

  header: { padding: 16, gap: 8 },
  title: { fontSize: 22, fontWeight: "900" },

  formCard: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 14,
    padding: 12,
    backgroundColor: "white",
    gap: 8,
  },

  sectionTitle: { fontWeight: "900" },
  label: { fontSize: 12, color: "#666", fontWeight: "800" },

  input: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "white",
  },

  itemCard: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 14,
    padding: 12,
    backgroundColor: "white",
  },
  itemTitle: { fontSize: 15, fontWeight: "900" },

  muted: { color: "#666" },
  mutedSmall: { color: "#777", fontSize: 12 },

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
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#16a34a",
  },
  primaryText: { color: "white", fontWeight: "900" },

  pressed: { opacity: 0.85 },
});
