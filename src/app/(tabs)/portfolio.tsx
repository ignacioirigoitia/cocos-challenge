import { useRouter } from 'expo-router';

import { orderHref } from '@/features/orders/params';
import { PortfolioScreen } from '@/features/portfolio/screens/PortfolioScreen';

export default function PortfolioRoute() {
  const router = useRouter();

  return (
    <PortfolioScreen
      onSelect={(h) =>
        router.push(
          orderHref({
            instrumentId: h.instrumentId,
            ticker: h.ticker,
            name: '',
            lastPrice: h.lastPrice,
            side: 'SELL',
          }),
        )
      }
    />
  );
}
