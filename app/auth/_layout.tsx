import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="email-signin"
        options={{
          title: "Sign In",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "#FFFFFF" },
        }}
      />
      <Stack.Screen
        name="email-signup"
        options={{
          title: "Create Account",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "#FFFFFF" },
        }}
      />
    </Stack>
  );
}
