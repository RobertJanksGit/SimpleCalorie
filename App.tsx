import { SafeAreaProvider } from "react-native-safe-area-context";
import { AchievementProvider } from "./src/contexts/AchievementContext";

// ... existing imports ...

export default function App() {
  return (
    <SafeAreaProvider>
      <AchievementProvider>
        {/* ... existing app content ... */}
      </AchievementProvider>
    </SafeAreaProvider>
  );
}
