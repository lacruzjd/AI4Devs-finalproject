import '@testing-library/jest-dom';

// El router de datos de react-router (`createBrowserRouter`) construye cada navegación como
// `new Request(url, { signal })` con el `AbortSignal` de jsdom, y el `Request` de Node (undici)
// lo rechaza por no ser de su mismo realm: la navegación se pierde y deja un unhandled rejection.
// En un navegador ambos vienen del mismo realm. Las rutas no tienen loaders que cancelar, así
// que en tests basta con no pasarle la señal (TK-073-FE).
const NodeRequest = globalThis.Request;
globalThis.Request = class extends NodeRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(input, { ...init, signal: undefined });
  }
} as typeof Request;
