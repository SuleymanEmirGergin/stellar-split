import '@testing-library/jest-dom';

// jsdom doesn't implement window.matchMedia — polyfill a no-op matcher so
// hooks like useMotionEnabled() (which read prefers-reduced-motion) don't
// crash in component tests. Default = "no preference" (motion enabled).
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
