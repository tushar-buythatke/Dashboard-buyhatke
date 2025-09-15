// Platform utility functions

export const getPlatformName = (platformId: number): string => {
  switch (platformId) {
    case 0: return 'Web Extension';
    case 1: return 'Mobile Extension';
    case 2: return 'Desktop Site';
    case 3: return 'Mobile Site';
    case 4: return 'Mobile App Overlay';
    case 5: return 'Mobile App';
    default: return 'Unknown Platform';
  }
};

export const PLATFORM_OPTIONS = [
  { value: 0, label: 'Web Extension' },
  { value: 1, label: 'Mobile Extension' },
  { value: 2, label: 'Desktop Site' },
  { value: 3, label: 'Mobile Site' },
  { value: 4, label: 'Mobile App Overlay' },
  { value: 5, label: 'Mobile App' },
];
