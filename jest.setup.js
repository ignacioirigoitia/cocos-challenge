// AsyncStorage es un módulo nativo: en los tests se reemplaza por su mock en memoria.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Los íconos cargan un archivo de fuente que Jest no tiene; en los tests no se dibujan.
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
