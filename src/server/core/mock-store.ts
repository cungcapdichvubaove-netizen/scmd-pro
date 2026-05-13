import fs from 'fs';
import path from 'path';

const MOCK_FILE = path.join(process.cwd(), '.mock-data.json');

// Global in-memory cache
export const mockSharedData: Record<string, any> = loadMockData();

function loadMockData() {
  try {
    if (fs.existsSync(MOCK_FILE)) {
      return JSON.parse(fs.readFileSync(MOCK_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Failed to load mock data:', err);
  }
  return {};
}

let timeoutId: NodeJS.Timeout | null = null;

export function saveMockDataDebounced() {
  if (timeoutId) clearTimeout(timeoutId);
  timeoutId = setTimeout(() => {
    try {
      fs.writeFileSync(MOCK_FILE, JSON.stringify(mockSharedData, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value
      , 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save mock data:', err);
    }
  }, 1000); // debounce 1 second
}
