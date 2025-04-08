import { Stack } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { Redirect } from "expo-router";

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading screen while checking authentication
  if (isLoading) {
    return null;
  }

  // Redirect to auth if not authenticated
  if (!isAuthenticated) {
    return <Redirect href="/auth" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="history" />
      <Stack.Screen
        name="camera"
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
    </Stack>
  );
}
