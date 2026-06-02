export function extractLocationName(value: unknown): string {
  if (!value) return 'Unknown';

  const normalize = (input: unknown): string => {
    if (typeof input === 'string') {
      const trimmed = input.trim();
      if (!trimmed || trimmed === '[object Object]') return 'Unknown';

      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          return normalize(JSON.parse(trimmed));
        } catch {
          return trimmed;
        }
      }

      return trimmed;
    }

    if (typeof input === 'object') {
      const record = input as Record<string, unknown>;
      const city = record.city;
      const state = record.state;

      if (typeof city === 'string' && typeof state === 'string') {
        return `${city}, ${state}`;
      }

      return (
        (typeof record.name === 'string' && record.name) ||
        (typeof record.city === 'string' && record.city) ||
        (typeof record.state === 'string' && record.state) ||
        (typeof record.domain === 'string' && record.domain) ||
        (typeof record.posId === 'string' && record.posId) ||
        Object.values(record).find((item) => typeof item === 'string') ||
        'Unknown'
      ) as string;
    }

    return String(input);
  };

  return normalize(value);
}
