import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UseCasesPage from './UseCasesPage';

// Mock i18n — identity translator so assertions can test against the key.
vi.mock('../lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, lang: 'tr' }),
  i18n: { t: (k: string) => k },
}));

// framer-motion mock — strip animation wrappers, skip whileInView
vi.mock('framer-motion', () => ({
  motion: {
    section: ({ children, ...rest }: React.HTMLAttributes<HTMLElement>) => (
      <section {...rest}>{children}</section>
    ),
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...rest}>{children}</div>
    ),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <UseCasesPage />
    </MemoryRouter>,
  );
}

describe('UseCasesPage', () => {
  it('renders the page title and subtitle', () => {
    renderPage();
    expect(screen.getByText('use_cases.title')).toBeTruthy();
    expect(screen.getByText('use_cases.subtitle')).toBeTruthy();
  });

  it('renders all three scenario cards', () => {
    renderPage();
    expect(screen.getByTestId('use-case-erasmus')).toBeTruthy();
    expect(screen.getByTestId('use-case-startup')).toBeTruthy();
    expect(screen.getByTestId('use-case-vacation')).toBeTruthy();
  });

  it('each scenario card has a screenshot, problem list, and solution list', () => {
    renderPage();
    // Screenshots (one per scenario)
    expect(screen.getByTestId('use-case-erasmus-screenshot')).toBeTruthy();
    expect(screen.getByTestId('use-case-startup-screenshot')).toBeTruthy();
    expect(screen.getByTestId('use-case-vacation-screenshot')).toBeTruthy();
    // Problem / solution headers are i18n-keyed — 3 scenarios, so 3 of each
    const problemHeaders = screen.getAllByText('use_cases.problem_label');
    const solutionHeaders = screen.getAllByText('use_cases.solution_label');
    expect(problemHeaders.length).toBe(3);
    expect(solutionHeaders.length).toBe(3);
  });

  it('each scenario links to Stellar Expert with a testnet tx', () => {
    renderPage();
    const links = [
      screen.getByTestId('use-case-erasmus-explorer'),
      screen.getByTestId('use-case-startup-explorer'),
      screen.getByTestId('use-case-vacation-explorer'),
    ];
    for (const link of links) {
      expect(link.getAttribute('href')).toMatch(
        /^https:\/\/stellar\.expert\/explorer\/testnet\/tx\/[0-9a-f]{64}$/,
      );
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
    }
  });

  it('screenshot sources point to the GitHub raw CDN', () => {
    renderPage();
    const img = screen.getByTestId('use-case-erasmus-screenshot') as HTMLImageElement;
    expect(img.src).toMatch(
      /^https:\/\/raw\.githubusercontent\.com\/SuleymanEmirGergin\/stellar-split\/master\/docs\/screenshots\/.+\.png$/,
    );
    expect(img.getAttribute('loading')).toBe('lazy');
  });

  it('back button navigates to the home route', () => {
    mockNavigate.mockClear();
    renderPage();
    fireEvent.click(screen.getByTestId('use-cases-back'));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('CTA button navigates to the home route', () => {
    mockNavigate.mockClear();
    renderPage();
    fireEvent.click(screen.getByTestId('use-cases-cta'));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
