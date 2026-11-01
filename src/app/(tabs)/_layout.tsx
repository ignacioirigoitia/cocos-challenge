import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useTheme } from '@/shared/ui/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface TabIconProps {
  active: IconName;
  inactive: IconName;
  focused: boolean;
}

// Ícono lleno cuando la pestaña está activa, de contorno cuando no.
function TabIcon({ active, inactive, focused }: TabIconProps) {
  const { colors } = useTheme();

  return (
    <Ionicons
      name={focused ? active : inactive}
      size={24}
      color={focused ? colors.text : colors.textSecondary}
    />
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Mercado',
          tabBarIcon: ({ focused }) => (
            <TabIcon active="trending-up" inactive="trending-up-outline" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portfolio',
          tabBarIcon: ({ focused }) => (
            <TabIcon active="pie-chart" inactive="pie-chart-outline" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Órdenes',
          tabBarIcon: ({ focused }) => (
            <TabIcon active="receipt" inactive="receipt-outline" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ focused }) => (
            <TabIcon active="settings" inactive="settings-outline" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
