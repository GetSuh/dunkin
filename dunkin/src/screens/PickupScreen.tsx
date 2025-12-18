import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Location from "expo-location";
import { supabase } from "../services/supabase";
import { useCart } from "../state/CartContext";

type Store = {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
};

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s1 = Math.sin(dLat / 2) ** 2;
  const s2 = Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s1 + s2));
}

export default function PickupScreen({ navigation }: any) {
  const { items, totalPrice } = useCart();

  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  const [pickupAt, setPickupAt] = useState<Date>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 30);
    return d;
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("stores")
          .select("id,name,address,lat,lng")
          .order("name", { ascending: true });

        if (error) throw error;

        const list = (data ?? []) as Store[];
        setStores(list);
        setSelectedStoreId(list[0]?.id ?? null);
      } catch (e: any) {
        console.error(e);
        Alert.alert("Fout", "Kon winkels niet laden.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const storesWithDistance = useMemo(() => {
    if (!userLoc) return stores.map((s) => ({ ...s, distanceKm: null as number | null }));
    return stores.map((s) => {
      if (s.lat == null || s.lng == null) return { ...s, distanceKm: null as number | null };
      return {
        ...s,
        distanceKm: haversineKm(userLoc.lat, userLoc.lng, s.lat, s.lng),
      };
    });
  }, [stores, userLoc]);

  const sortedStores = useMemo(() => {
    if (!userLoc) return storesWithDistance;
    return [...storesWithDistance].sort((a, b) => {
      const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
      const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
      return da - db;
    });
  }, [storesWithDistance, userLoc]);

  async function useMyLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Locatie", "Toestemming geweigerd.");
        return;
      }

      const pos = await Location.getCurrentPositionAsync({});
      setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch (e) {
      console.error(e);
      Alert.alert("Locatie", "Kon locatie niet ophalen.");
    }
  }

  function onNext() {
    if (items.length === 0) {
      Alert.alert("Leeg mandje", "Voeg eerst iets toe aan je mandje.");
      navigation.navigate("Tabs"); 
      return;
    }
    if (!selectedStoreId) {
      Alert.alert("Winkel kiezen", "Kies een winkel om af te halen.");
      return;
    }

    
    navigation.navigate("ConfirmReservation", {
      storeId: selectedStoreId,
      pickupAt: pickupAt.toISOString(),
    });
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator />
        <Text style={s.muted}>Winkels laden…</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Afhalen</Text>
        <Pressable onPress={useMyLocation} style={({ pressed }) => [s.locBtn, pressed && s.pressed]}>
          <Text style={s.locText}>📍 Gebruik mijn locatie</Text>
        </Pressable>
      </View>

      <Text style={s.sectionTitle}>Kies winkel</Text>

      <FlatList
        data={sortedStores}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingBottom: 180 }}
        renderItem={({ item }) => {
          const active = item.id === selectedStoreId;
          return (
            <Pressable
              onPress={() => setSelectedStoreId(item.id)}
              style={({ pressed }) => [s.storeCard, active && s.storeCardActive, pressed && s.pressed]}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.storeName}>{item.name}</Text>
                {item.address ? <Text style={s.muted}>{item.address}</Text> : null}
                {item.distanceKm != null ? (
                  <Text style={s.mutedSmall}>{item.distanceKm.toFixed(1)} km</Text>
                ) : null}
              </View>

              <View style={[s.radio, active && s.radioActive]}>
                {active ? <View style={s.radioDot} /> : null}
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={{ padding: 16 }}>
            <Text style={s.muted}>Geen winkels gevonden.</Text>
          </View>
        }
      />

      
      <View style={s.bottomBar}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={s.smallLabel}>Afhaaltijd</Text>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={({ pressed }) => [s.pillBtn, pressed && s.pressed]}
            >
              <Text style={s.pillText}>
                {pickupAt.toLocaleDateString()}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setShowTimePicker(true)}
              style={({ pressed }) => [s.pillBtn, pressed && s.pressed]}
            >
              <Text style={s.pillText}>
                {pickupAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </Pressable>
          </View>

          <Text style={s.mutedSmall}>Totaal: € {totalPrice.toFixed(2)}</Text>
        </View>

        <Pressable onPress={onNext} style={({ pressed }) => [s.primaryBtn, pressed && s.pressed]}>
          <Text style={s.primaryText}>Verder</Text>
        </Pressable>
      </View>

      {/* Pickers */}
      {showDatePicker && (
        <DateTimePicker
          value={pickupAt}
          mode="date"
          onChange={(_, d) => {
            setShowDatePicker(false);
            if (!d) return;
            const next = new Date(pickupAt);
            next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
            setPickupAt(next);
          }}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={pickupAt}
          mode="time"
          is24Hour
          onChange={(_, d) => {
            setShowTimePicker(false);
            if (!d) return;
            const next = new Date(pickupAt);
            next.setHours(d.getHours(), d.getMinutes(), 0, 0);
            setPickupAt(next);
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "white" },
  muted: { color: "#666" },
  mutedSmall: { color: "#777", fontSize: 12 },

  header: { padding: 16, gap: 8 },
  title: { fontSize: 22, fontWeight: "900" },

  locBtn: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "white",
  },
  locText: { fontWeight: "900" },

  sectionTitle: { paddingHorizontal: 16, paddingBottom: 6, fontWeight: "900" },

  storeCard: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#eee",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "white",
  },
  storeCardActive: { borderColor: "#16a34a", backgroundColor: "#f0fdf4" },
  storeName: { fontSize: 16, fontWeight: "900" },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: { borderColor: "#16a34a" },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#16a34a" },

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
  smallLabel: { color: "#666", fontWeight: "900", fontSize: 12 },

  pillBtn: {
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "white",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  pillText: { fontWeight: "900" },

  primaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: "#16a34a",
  },
  primaryText: { color: "white", fontWeight: "900" },

  pressed: { opacity: 0.85 },
});
