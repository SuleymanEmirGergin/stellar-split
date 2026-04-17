/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import * as React from 'react';
import { render, screen } from '@testing-library/react';

describe('Minimal Vitest React Test', () => {
  it('renders a basic element', () => {
    render(<div data-testid="test">Hello World</div>);
    expect(screen.getByTestId('test')).toBeInTheDocument();
  });
});
