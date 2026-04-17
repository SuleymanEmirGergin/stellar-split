import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider, useToast } from './Toast';

function TestConsumer({ type = 'info' as 'success' | 'error' | 'info', message = 'Hello' }: { type?: 'success' | 'error' | 'info'; message?: string }) {
  const { addToast } = useToast();
  return <button onClick={() => addToast(message, type)}>trigger</button>;
}

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('useToast throws outside provider', () => {
    expect(() => render(<TestConsumer />)).toThrow();
  });

  it('addToast shows message', () => {
    render(
      <ToastProvider>
        <TestConsumer message="Hello" type="success" />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('trigger'));
    expect(screen.getByText('Hello')).toBeTruthy();
  });

  it('type styles', () => {
    const { unmount } = render(
      <ToastProvider>
        <TestConsumer message="Msg" type="success" />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('trigger'));
    const successEl = screen.getByText('Msg').parentElement;
    // Modernized glassmorphism toast uses dark tinted bg + emerald border
    expect(successEl?.className).toContain('emerald');
    unmount();

    const { unmount: unmount2 } = render(
      <ToastProvider>
        <TestConsumer message="Msg" type="error" />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('trigger'));
    const errorEl = screen.getByText('Msg').parentElement;
    // Error toast uses rose accent
    expect(errorEl?.className).toContain('rose');
    unmount2();

    render(
      <ToastProvider>
        <TestConsumer message="Msg" type="info" />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('trigger'));
    const infoEl = screen.getByText('Msg').parentElement;
    // Info toast uses indigo accent
    expect(infoEl?.className).toContain('indigo');
  });

  it('clicking toast dismisses it', () => {
    render(
      <ToastProvider>
        <TestConsumer message="Dismiss me" type="info" />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('trigger'));
    const toast = screen.getByText('Dismiss me');
    fireEvent.click(toast);
    act(() => vi.advanceTimersByTime(310));
    expect(screen.queryByText('Dismiss me')).toBeNull();
  });

  it('default type is info', () => {
    function DefaultConsumer() {
      const { addToast } = useToast();
      return <button onClick={() => addToast('Hi')}>trigger</button>;
    }
    render(
      <ToastProvider>
        <DefaultConsumer />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('trigger'));
    const el = screen.getByText('Hi').parentElement;
    // Default info type uses indigo accent in glassmorphism toast
    expect(el?.className).toContain('indigo');
  });
});
