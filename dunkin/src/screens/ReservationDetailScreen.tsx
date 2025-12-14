import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { supabase } from "../services/supabase";

type ReservationStatus = "scheduled" | "picked_up" | "cancelled" | "pending";
type BoxChoice = { donutId: string; qty: number };

type ReservationItem = {
  id?: string | null;
  name?: string | null;
  product_id?: string | null;
  qty?: number | null;
  unit_price?: number | null;
  product_type?: "donut" | "box" | string | null;
  variant?: string | null;
  choices?: { boxSize?: number; donuts?: BoxChoice[] } | null;
};

type Reservation = {
  id: string;
  pickup_at: string;
  status: ReservationStatus;
  created_at: string;
  customer_name?: string | null;
  total_price?: number | null;
  stores?: { name: string | null }[] | null;
  reservation_items?: ReservationItem[] | null;
};

function statusBadge(status: ReservationStatus) {
  switch (status) {
    case "pending":
      return { text: "PENDING", bg: "#fef9c3", fg: "#854d0e" };
    case "scheduled":
      return { text: "SCHEDULED", bg: "#dbeafe", fg: "#1e40af" };
    case "picked_up":
      return { text: "PICKED UP", bg: "#dcfce7", fg: "#166534" };
    case "cancelled":
      return { text: "CANCELLED", bg: "#fee2e2", fg: "#991b1b" };
  }
}

export default function ReservationDetailScreen({ route, navigation }: any) {
  const id: string | undefined = route?.params?.id;

  const [loading, setLoading] = useState(true);
  const [res, setRes] = useState<Reservation | null>(null);

  // ✅ Hooks ALTIJD bovenaan (geen hooks na returns!)
  const items = useMemo(() => {
    return (res?.reservation_items ?? []).filter(Boolean);
  }, [res]);

  const computedTotal = useMemo(() => {
    return items.reduce((acc, it) => {
      const qty = it.qty ?? 1;
      const price = it.unit_price ?? 0;
      return acc + qty * price;
    }, 0);
  }, [items]);

  const total = useMemo(() => {
    if (res?.total_price != null) return Number(res.total_price);
    return Number(computedTotal);
  }, [res, computedTotal]);

  const storeName = useMemo(() => {
    return res?.stores?.[0]?.name ?? "Onbekende winkel";
  }, [res]);

  const pickupDate = useMemo(() => {
    return res?.pickup_at ? new Date(res.pickup_at) : null;
  }, [res]);

  useEffect(() => {
    if (!id) {
      Alert.alert("Fout", "Geen reserverings-id meegegeven.");
      navigation.goBack();
    }
  }, [id, navigation]);

  async function load() {
    if (!id) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("reservations")
        .select(`
          id,
          pickup_at,
          status,
          created_at,
          customer_name,
          total_price,
          stores(name),
          reservation_items(
            id,
            name,
            product_id,
            qty,
            unit_price,
            product_type,
            variant,
            choices
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      setRes(data as Reservation);
    } catch (e: any) {
      console.error(e);
      Alert.alert("Fout", e?.message ?? "Kon reservering niet laden.");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function cancelReservation() {
    if (!res) return;
    if (res.status === "cancelled" || res.status === "picked_up") {
      Alert.alert("Niet mogelijk", "Deze reservering kan je niet meer annuleren.");
      return;
    }

    Alert.alert("Annuleren?", "Ben je zeker dat je wil annuleren?", [
      { text: "Nee", style: "cancel" },
      {
        text: "Ja, annuleer",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase
              .from("reservations")
              .update({ status: "cancelled" })
              .eq("id", res.id);

            if (error) throw error;

            Alert.alert("Geannuleerd", "Je reservering is geannuleerd.");
            await load();
          } catch (e: any) {
            console.error(e);
            Alert.alert("Fout", e?.message ?? "Annuleren mislukt.");
          }
        },
      },
    ]);
  }

  // ✅ returns pas NA alle hooks
  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator />
        <Text style={s.muted}>Laden…</Text>
      </View>
    );
  }

  if (!res) return null;

  const badge = statusBadge(res.status);

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
      <View style={s.card}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.h1}>{storeName}</Text>

            <Text style={s.muted}>
              Afhalen:{" "}
              {pickupDate
                ? `${pickupDate.toLocaleDateString()} ${pickupDate.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : "—"}
            </Text>

            {res.customer_name ? <Text style={s.muted}>Klant: {res.customer_name}</Text> : null}
            <Text style={s.mutedSmall}>ID: {res.id}</Text>
          </View>

          <View style={[s.badge, { backgroundColor: badge.bg }]}>
            <Text style={[s.badgeText, { color: badge.fg }]}>{badge.text}</Text>
          </View>
        </View>

        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Totaal</Text>
          <Text style={s.totalValue}>€ {total.toFixed(2)}</Text>
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.h2}>Bestelling</Text>

        {items.length === 0 ? (
          <Text style={s.muted}>Geen items gevonden.</Text>
        ) : (
          items.map((it, idx) => (
            <View key={it.id ?? `${it.product_id ?? "item"}_${idx}`} style={s.itemBlock}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.itemTitle}>
                    {(it.qty ?? 1)}× {it.name ?? it.product_id?.slice(0, 8) ?? "Item"}
                  </Text>
                  <Text style={s.mutedSmall}>
                    {it.product_type ?? ""}
                    {it.variant ? ` • ${it.variant}` : ""}
                  </Text>
                </View>

                <Text style={s.itemPrice}>
                  {it.unit_price != null ? `€ ${Number(it.unit_price).toFixed(2)}` : "—"}
                </Text>
              </View>

              {it.product_type === "box" && it.choices?.donuts?.length ? (
                <View style={s.boxContent}>
                  <Text style={s.boxTitle}>Inhoud ({it.choices.boxSize ?? ""})</Text>
                  {it.choices.donuts.map((c, j) => (
                    <Text key={`${c.donutId}_${j}`} style={s.boxLine}>
                      • {c.qty}× donut {c.donutId.slice(0, 6)}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          ))
        )}
      </View>

      <Pressable
        onPress={cancelReservation}
        style={({ pressed }) => [
          s.cancelBtn,
          pressed && s.pressed,
          (res.status === "cancelled" || res.status === "picked_up") && { opacity: 0.5 },
        ]}
        disabled={res.status === "cancelled" || res.status === "picked_up"}
      >
        <Text style={s.cancelText}>Annuleer reservering</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "white" },

  card: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 14,
    padding: 12,
    backgroundColor: "white",
    gap: 10,
    marginBottom: 12,
  },

  h1: { fontSize: 18, fontWeight: "900" },
  h2: { fontSize: 14, fontWeight: "900" },

  muted: { color: "#666" },
  mutedSmall: { color: "#777", fontSize: 12 },

  badge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: "900" },

  totalRow: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f1f1",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { color: "#666", fontWeight: "800" },
  totalValue: { fontSize: 18, fontWeight: "900" },

  itemBlock: {
    borderTopWidth: 1,
    borderTopColor: "#f1f1f1",
    paddingTop: 10,
    marginTop: 10,
    gap: 8,
  },
  itemTitle: { fontWeight: "900", fontSize: 15 },
  itemPrice: { fontWeight: "900" },

  boxContent: {
    backgroundColor: "#fafafa",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#eee",
    gap: 4,
  },
  boxTitle: { fontWeight: "900" },
  boxLine: { color: "#444" },

  cancelBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fee2e2",
    borderWidth: 1,
    borderColor: "#fecaca",
    marginBottom: 12,
  },
  cancelText: { color: "#991b1b", fontWeight: "900" },

  pressed: { opacity: 0.85 },
});
