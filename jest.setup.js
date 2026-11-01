// AsyncStorage es un módulo nativo: en los tests se reemplaza por su mock en memoria.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// La app real genera un id de cuenta por instalación; en los tests se fija uno, para que los
// encabezados y los datos sean predecibles. (La generación se prueba en settings.test.ts.)
jest.mock('@/shared/config/env', () => ({ ENV_CANDIDATE_ID: 'ignacio-irigoitia' }));

// Los íconos cargan un archivo de fuente que Jest no tiene; en los tests no se dibujan.
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
