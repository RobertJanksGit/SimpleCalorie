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
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Home",
          headerStyle: { backgroundColor: "#FFFFFF" },
        }}
      />
    </Stack>
  );
}
