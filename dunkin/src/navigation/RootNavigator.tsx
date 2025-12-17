import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import HomeScreen from "../screens/HomeScreen";
import DonutDetailScreen from "../screens/DonutDetailScreen";
import CheckoutScreen from "../screens/CheckoutScreen";
import PickupScreen from "../screens/PickupScreen";
import ConfirmReservationScreen from "../screens/ConfirmReservationScreen";
import BoxBuilderScreen from "../screens/BoxBuilderScreen";
import ReservationsScreen from "../screens/ReservationScreen";
import ReservationDetailScreen from "../screens/ReservationDetailScreen";



const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function TabsNavigator() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: { height: 64, paddingBottom: 10, paddingTop: 8 },

        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === "Home") {
            return (
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={size}
                color={color}
              />
            );
          }

          if (route.name === "Reserveringen") {
            return (
              <Ionicons
                name={focused ? "receipt" : "receipt-outline"}
                size={size}
                color={color}
              />
            );
          }

          return null;
        },
      })}
    >
      <Tabs.Screen name="Home" component={HomeScreen} />
      <Tabs.Screen name="Reserveringen" component={ReservationsScreen} />
    </Tabs.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        {/* Tabs */}
        <Stack.Screen
          name="Tabs"
          component={TabsNavigator}
          options={{ headerShown: false }}
        />

        {/* Detail */}
        <Stack.Screen
          name="ProductDetail"
          component={DonutDetailScreen}
          options={{ title: "Donut" }}
        />
        <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: "Checkout" }} />
        <Stack.Screen name="Pickup" component={PickupScreen} options={{ title: "Afhalen" }} />
        <Stack.Screen name="ConfirmReservation" component={ConfirmReservationScreen} options={{ title: "Bevestigen" }}/>
        <Stack.Screen name="BoxBuilder" component={BoxBuilderScreen} options={{ title: "Doos samenstellen" }} />
        
        <Stack.Screen name="ReservationDetail" component={ReservationDetailScreen} options={{ title: "Reservering in detail" }} />


  
      </Stack.Navigator>
    </NavigationContainer>
  );
}
