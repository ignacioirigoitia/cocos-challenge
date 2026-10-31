import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';

import { createQueryClient } from '@/shared/api/queryClient';
import { useTheme } from '@/shared/ui/theme';

export default function RootLayout() {
  // useState garantiza un único QueryClient durante toda la vida de la app.
  const [queryClient] = useState(createQueryClient);
  const { scheme, colors } = useTheme();

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
      />
    </QueryClientProvider>
  );
}
