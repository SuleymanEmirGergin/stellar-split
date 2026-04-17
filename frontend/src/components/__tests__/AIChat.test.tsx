/**
 * @vitest-environment jsdom
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AIChat } from '../AIChat';
import { useAIAgent } from '../../hooks/useAIAgent';
import * as React from 'react';

// Mock the hook
vi.mock('../../hooks/useAIAgent', () => ({
  useAIAgent: vi.fn(),
}));

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

describe('AIChat Component', () => {
  const mockSendMessage = vi.fn();
  const mockClearChat = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAIAgent as any).mockReturnValue({
      messages: [],
      sendMessage: mockSendMessage,
      isLoading: false,
      clearChat: mockClearChat,
    });
  });

  it('renders FAB initially', () => {
    render(<AIChat />);
    expect(screen.getByLabelText(/AI Asistanı Aç/i)).toBeDefined();
  });

  it('opens chat window when FAB is clicked', () => {
    render(<AIChat />);
    fireEvent.click(screen.getByLabelText(/AI Asistanı Aç/i));
    expect(screen.getByText(/Stellar Agent/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Bir şeyler sor/i)).toBeDefined();
  });

  it('sends a message when form is submitted', async () => {
    render(<AIChat groupId={1} />);
    fireEvent.click(screen.getByLabelText(/AI Asistanı Aç/i));
    
    const input = screen.getByPlaceholderText(/Bir şeyler sor/i);
    fireEvent.change(input, { target: { value: 'Merhaba' } });
    fireEvent.submit(screen.getByRole('button', { name: /send/i })); // The send button

    expect(mockSendMessage).toHaveBeenCalledWith('Merhaba', 1);
  });

  it('displays chat history', () => {
    (useAIAgent as any).mockReturnValue({
      messages: [
        { role: 'user', content: 'Selam' },
        { role: 'assistant', content: 'Merhaba, nasıl yardımcı olabilirim?' },
      ],
      sendMessage: mockSendMessage,
      isLoading: false,
      clearChat: mockClearChat,
    });

    render(<AIChat />);
    fireEvent.click(screen.getByLabelText(/AI Asistanı Aç/i));

    expect(screen.getByText('Selam')).toBeDefined();
    expect(screen.getByText(/Merhaba, nasıl yardımcı olabilirim/i)).toBeDefined();
  });

  it('clears chat when clear button is clicked', () => {
    render(<AIChat />);
    fireEvent.click(screen.getByLabelText(/AI Asistanı Aç/i));
    
    const clearBtn = screen.getByTitle(/Sohbeti temizle/i);
    fireEvent.click(clearBtn);

    expect(mockClearChat).toHaveBeenCalled();
  });

  it('shows loading state', () => {
    (useAIAgent as any).mockReturnValue({
      messages: [],
      sendMessage: mockSendMessage,
      isLoading: true,
      clearChat: mockClearChat,
    });

    render(<AIChat />);
    fireEvent.click(screen.getByLabelText(/AI Asistanı Aç/i));
    
    // Check for animated dots (bounce spans)
    const bounceDots = document.querySelectorAll('.animate-bounce');
    expect(bounceDots.length).toBe(3);
  });
});
