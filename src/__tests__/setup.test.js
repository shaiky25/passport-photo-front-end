/**
 * Test to verify the frontend testing infrastructure is set up correctly.
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('Testing Infrastructure Setup', () => {
  test('React Testing Library is available', () => {
    const TestComponent = () => <div>Test</div>;
    render(<TestComponent />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  test('fast-check is available for property-based testing', () => {
    const fc = require('fast-check');
    expect(fc).toBeDefined();
    expect(fc.property).toBeDefined();
  });

  test('jest-dom matchers are available', () => {
    const element = document.createElement('div');
    element.textContent = 'Hello';
    expect(element).toHaveTextContent('Hello');
  });
});
