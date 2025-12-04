# Frontend Tests

This directory contains all frontend tests for the Passport Photo Processor.

## Test Structure

```
__tests__/
├── setup.test.js           # Infrastructure verification tests
└── (additional test files will be added here)
```

## Running Tests

### Run all tests (single run)
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run with coverage
```bash
npm run test:coverage
```

### Run specific test file
```bash
npm test -- setup.test.js
```

## Property-Based Testing

This project uses **fast-check** for property-based testing. Property tests are configured to run a minimum of 100 iterations per test.

Each property-based test is tagged with a comment referencing the correctness property from the design document:
```javascript
// Feature: passport-photo-processor, Property 22: Face detection failure cascade
// Validates: Requirements 7.5
```

## Testing Libraries

- **Jest** - Test framework and test runner
- **React Testing Library** - Component testing utilities
- **@testing-library/jest-dom** - Custom Jest matchers for DOM assertions
- **@testing-library/user-event** - User interaction simulation
- **fast-check** - Property-based testing

## Writing Tests

### Component Tests
```javascript
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MyComponent from '../MyComponent';

test('renders component', () => {
  render(<MyComponent />);
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

### Property-Based Tests
```javascript
import fc from 'fast-check';

test('property: some invariant holds', () => {
  fc.assert(
    fc.property(fc.integer(), (n) => {
      // Test that some property holds for all integers
      return n + 0 === n;
    }),
    { numRuns: 100 }
  );
});
```

## Coverage

Coverage thresholds are configured in `jest.config.js`:
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

View coverage reports after running `npm run test:coverage` in the `coverage/` directory.

## Best Practices

1. Test user behavior, not implementation details
2. Use semantic queries (getByRole, getByLabelText) over test IDs
3. Write property-based tests for universal invariants
4. Keep tests focused and minimal
5. Mock external dependencies (API calls, etc.)
