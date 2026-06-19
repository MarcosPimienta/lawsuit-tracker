import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the process list heading', () => {
  render(<App />);
  expect(screen.getByText(/lista de procesos/i)).toBeInTheDocument();
});
