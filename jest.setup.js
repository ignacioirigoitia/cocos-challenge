// AsyncStorage es un módulo nativo: en los tests se reemplaza por su mock en memoria.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
