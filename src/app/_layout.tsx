import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';

import { createQueryClient } from '@/shared/api/queryClient';
import { AppErrorFallback } from '@/shared/ui/AppErrorFallback';
import { useTheme } from '@/shared/ui/theme';

// Límite global de errores: si algo inesperado rompe una pantalla, se muestra este aviso con
// "Reintentar" en lugar de dejar la app en blanco.
export { AppErrorFallback as ErrorBoundary };

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
            // Pantalla transparente: la hoja (BottomSheet) la dibuja la propia pantalla, con el
            // alto de su contenido y un fondo oscuro que cierra al tocarlo.
            presentation: 'transparentModal',
            // Sin animación de ruta: la hoja anima su propia entrada y el fondo hace un fundido.
            animation: 'none',
            headerShown: false,
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
      </Stack>
    </QueryClientProvider>
  );
}
