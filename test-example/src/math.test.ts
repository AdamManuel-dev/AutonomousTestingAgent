import { add, subtract } from './math';

describe('Math functions', () => {
  test('add should return sum of two numbers', () => {
    expect(add(2, 3)).toBe(5);
  });

  test('subtract should return difference of two numbers', () => {
    expect(subtract(5, 3)).toBe(2);
  });
});