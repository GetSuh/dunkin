import RootNavigator from "./src/navigation/RootNavigator";
import { CartProvider } from "./src/state/CartContext";

export default function App() {
  return (
    <CartProvider>
      <RootNavigator />
    </CartProvider>
  );
}
