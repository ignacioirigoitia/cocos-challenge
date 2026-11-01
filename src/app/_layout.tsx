import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';

import { createQueryClient } from '@/shared/api/queryClient';
import { useTheme } from '@/shared/ui/theme';

function CloseButton() {
  const router = useRouter();
  const { colors, fontSize } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Cerrar"
      onPress={() => router.back()}
      hitSlop={8}
      style={{ minHeight: 44, justifyContent: 'center' }}
    >
      <Text style={{ color: colors.textSecondary, fontSize: fontSize.lg, fontWeight: '600' }}>
        Cerrar
      </Text>
    </Pressable>
  );
}

export default function RootLayout() {
  // useState garantiza un único QueryClient durante toda la vida de la app.
  const [queryClient] = useState(createQueryClient);
  const { scheme, colors } = useTheme();

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
      >
        <Stack.Screen
          name="order"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Orden',
            headerShadowVisible: false,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerRight: () => <CloseButton />,
          }}
        />
      </Stack>
    </QueryClientProvider>
  );
}
