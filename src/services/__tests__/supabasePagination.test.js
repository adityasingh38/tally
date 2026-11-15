const mockRows = Array.from({ length: 501 }, (_, i) => ({ id: String(i), amount: i }));
const mockRanges = [];

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select() { return this; },
      eq() { return this; },
      order() { return this; },
      gte() { return this; },
      range(start, end) {
        mockRanges.push([start, end]);
        return this;
      },
      then(resolve) {
        const [start, end] = mockRanges[mockRanges.length - 1];
        return Promise.resolve({ data: mockRows.slice(start, end + 1), error: null }).then(resolve);
      },
    }),
  }),
}));

import { getAllTransactions } from '../supabase';

it('fetches every page instead of truncating history after 500 rows', async () => {
  mockRanges.length = 0;
  const { data, error } = await getAllTransactions({ userId: 'user-1' });
  expect(error).toBeNull();
  expect(data).toHaveLength(501);
  expect(mockRanges).toEqual([[0, 499], [500, 999]]);
});
