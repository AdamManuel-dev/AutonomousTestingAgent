export function multiply(a: number, b: number): number {
  return a * b;
}

export function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error('Division by zero');
  }
  return a / b;
}

export function complexCalculation(x: number, y: number, z: number): number {
  if (x > 10) {
    if (y > 5) {
      return x * y + z;
    }
    return x + y - z;
  }
  
  if (z === 0) {
    return 0;
  }
  
  return x / z + y;
}

// Modified: 2025-06-18T08:04:27.907Z