import { useLocalSearchParams, useRouter } from 'expo-router';

import { OrderModal } from '@/features/orders/screens/OrderModal';

export default function OrderRoute() {
  const params = useLocalSearchParams();
  const router = useRouter();

  return <OrderModal rawParams={params} onClose={() => router.back()} />;
}
