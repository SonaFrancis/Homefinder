import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fontSize, spacing, scale } from '@/utils/responsive';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#10B981',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: '#F3F4F6',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          // Use safe area insets for both platforms to stay above system navigation
          height: Platform.OS === 'ios' ? 65 + insets.bottom : 60 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : spacing.sm,
          paddingTop: spacing.sm,
          paddingHorizontal: spacing.xs,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: fontSize.sm,
          fontWeight: '700',
          marginBottom: Platform.OS === 'android' ? scale(4) : scale(2),
        },
        tabBarIconStyle: {
          marginTop: Platform.OS === 'android' ? scale(4) : spacing.xs,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'My Rooms',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={scale(28)} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: 'Marketplace',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="storefront" size={scale(28)} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={scale(28)} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}