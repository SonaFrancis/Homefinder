import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { View, ActivityIndicator, StyleSheet, Image, Text } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { queryClient } from '@/lib/queryClient';

export default function RootLayout() {
  const initialize = useAuthStore((state) => state.initialize);
  const initialized = useAuthStore((state) => state.initialized);
  const loading = useAuthStore((state) => state.loading);

  useEffect(() => {
    // Initialize auth store on app start
    initialize();
  }, []);

  // Show loading screen while initializing
  if (!initialized || loading) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <Image
            source={require('@/assets/images/logo.jpg')}
            style={styles.logo}
            resizeMode="contain"
          />
          <ActivityIndicator size="large" color="#10B981" style={styles.spinner} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="property/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="marketplace/[id]" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 30,
  },
  spinner: {
    marginVertical: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
});