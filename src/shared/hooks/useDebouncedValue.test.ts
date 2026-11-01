import { act, renderHook } from '@testing-library/react-native';

import { useDebouncedValue } from './useDebouncedValue';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

describe('useDebouncedValue', () => {
  it('arranca con el valor inicial', async () => {
    const { result } = await renderHook(() => useDebouncedValue('a', 300));

    expect(result.current).toBe('a');
  });

  it('actualiza el valor recién cuando pasa el tiempo sin nuevos cambios', async () => {
    const { result, rerender } = await renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'a' } },
    );

    await rerender({ value: 'ab' });
    await advance(299);
    expect(result.current).toBe('a');

    await advance(1);
    expect(result.current).toBe('ab');
  });

  it('si el valor cambia de nuevo antes de tiempo, reinicia la espera', async () => {
    const { result, rerender } = await renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'a' } },
    );

    await rerender({ value: 'ab' });
    await advance(200);
    await rerender({ value: 'abc' });
    await advance(200);
    expect(result.current).toBe('a'); // pasaron 400 ms en total, pero solo 200 desde el último cambio

    await advance(100);
    expect(result.current).toBe('abc');
  });
});
