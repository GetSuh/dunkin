import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { supabase } from "../services/supabase";
import { useFocusEffect } from "@react-navigation/native";

type ReservationStatus = "scheduled" | "picked_up" | "cancelled" | "pending";

type Reservation = {
  id: string;
  store_id: string;
  pickup_at: string;
  status: ReservationStatus;
  created_at: string;

  customer_name: string | null;
  total_price: number | null;

  store?: { name: string | null } | null;
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

export default function ReservationsScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  // ✅ load doet alleen fetch + setReservations (geen loading toggles hier)
  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("reservations")
      .select("id,store_id,pickup_at,status,created_at,customer_name,total_price,store:stores(name)")
      .order("created_at", { ascending: false });

    if (error) throw error;

    setReservations(((data ?? []) as unknown) as Reservation[]);
  }, []);

  // ✅ Auto refresh wanneer je terugkomt van detail screen
  useFocusEffect(
    useCallback(() => {
      let active = true;

      (async () => {
        try {
          setLoading(true);
          await load();
        } catch (e: any) {
          console.error(e);
          if (active) Alert.alert("Fout", e?.message ?? "Kon reserveringen niet laden.");
        } finally {
          if (active) setLoading(false);
        }
      })();

      return () => {
        active = false;
      };
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    try {
      await load();
    } catch (e: any) {
      console.error(e);
      Alert.alert("Fout", e?.message ?? "Kon reserveringen niet laden.");
    } finally {
      setRefreshing(false);
    }
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
      data={reservations}
      keyExtractor={(r) => r.id}
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 10 }}
      ListEmptyComponent={<Text style={s.muted}>Nog geen reserveringen.</Text>}
      renderItem={({ item }) => {
        const d = new Date(item.pickup_at);
        const badge = statusBadge(item.status);

        const storeName = item.store?.name ?? "Onbekende winkel";
        const customer = item.customer_name?.trim() ? item.customer_name : "Klant";
        const total =
          item.total_price != null ? `€ ${Number(item.total_price).toFixed(2)}` : "—";

        return (
          <Pressable
            onPress={() => navigation.navigate("ReservationDetail", { id: item.id })}
            style={({ pressed }) => [s.card, pressed && s.pressed]}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.title}>{storeName}</Text>

                <Text style={s.muted}>
                  {customer} • {total}
                </Text>

                <Text style={s.muted}>
                  Afhalen: {d.toLocaleDateString()}{" "}
                  {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>

                <Text style={s.mutedSmall}>ID: {item.id.slice(0, 8)}</Text>
              </View>

              <View style={[s.badge, { backgroundColor: badge.bg }]}>
                <Text style={[s.badgeText, { color: badge.fg }]}>{badge.text}</Text>
              </View>
            </View>
          </Pressable>
        );
      }}
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
  mutedSmall: { color: "#777", fontSize: 12 },

  card: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 14,
    padding: 12,
    backgroundColor: "white",
  },
  title: { fontWeight: "900", fontSize: 16 },

  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: { fontSize: 12, fontWeight: "900" },

  pressed: { opacity: 0.85 },
});
