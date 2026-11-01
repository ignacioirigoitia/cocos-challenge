import { useRouter } from 'expo-router';

import { InstrumentsScreen } from '@/features/instruments/screens/InstrumentsScreen';
import { orderHref } from '@/features/orders/params';

export default function MarketRoute() {
  const router = useRouter();

  return (
    <InstrumentsScreen
      onSelect={(i) =>
        router.push(
          orderHref({ instrumentId: i.id, ticker: i.ticker, name: i.name, lastPrice: i.lastPrice }),
        )
      }
    />
  );
}
