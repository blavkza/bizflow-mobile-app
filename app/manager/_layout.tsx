import { Stack } from 'expo-router';

export default function ManagerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="team" />
      <Stack.Screen name="approvals" />
      <Stack.Screen name="projects" />
      <Stack.Screen name="map" />
      <Stack.Screen name="ai-assistant" />
    </Stack>
  );
}
