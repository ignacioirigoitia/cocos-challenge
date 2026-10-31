import { useSettings } from './settings';

const initial = useSettings.getState();

beforeEach(() => useSettings.setState(initial, true));

describe('useSettings', () => {
  it('arranca con el camino feliz: modo de bugs en off, tema del sistema y mi candidate id', () => {
    const s = useSettings.getState();

    expect(s.bugMode).toBe('off');
    expect(s.theme).toBe('system');
    expect(s.candidateId).toBe('ignacio-irigoitia');
  });

  it('cambia el modo de bugs', () => {
    useSettings.getState().setBugMode('hard');

    expect(useSettings.getState().bugMode).toBe('hard');
  });

  it('cambia el tema', () => {
    useSettings.getState().setTheme('dark');

    expect(useSettings.getState().theme).toBe('dark');
  });
});
