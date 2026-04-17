/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BridgeDemo } from '../BridgeDemo';
import { ToastProvider } from '../Toast';
import * as React from 'react';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('BridgeDemo Component', () => {
  it('smoke test: renders without crashing', () => {
    render(
      <ToastProvider>
        <BridgeDemo />
      </ToastProvider>
    );
    expect(screen.getByText(/Cross-Chain Bridge/i)).toBeInTheDocument();
  });
});
