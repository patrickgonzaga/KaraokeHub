import '@testing-library/jest-dom/vitest';
import { vi, beforeEach } from 'vitest';

// Mock canvas-confetti
vi.mock('canvas-confetti', () => {
  return {
    default: vi.fn(),
  };
});

// Mock ResizeObserver which is missing in jsdom but used by framer-motion / layout components
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Clear localStorage before each test to maintain isolation
beforeEach(() => {
  localStorage.clear();
});
