# Passport Photo AI - Frontend

A React-based web application for creating compliant U.S. passport and visa photos with AI-powered analysis.

📖 **[User Guide](../USER_GUIDE.md)** - Complete guide for end users on how to use the application

## Features

- 📸 **Photo Upload** - Support for JPEG, PNG, and HEIC formats
- 🤖 **AI Analysis** - Powered by Anthropic Claude for compliance checking
- 👤 **Face Detection** - Automatic face detection and positioning validation
- 🎨 **Background Removal** - Optional AI-powered background replacement
- ✅ **Compliance Checklist** - Real-time validation of 8 passport photo requirements
- 📏 **Auto-Cropping** - Intelligent cropping to 2x2 inch specifications (600x600px at 300 DPI)
- 🖨️ **Print Sheets** - Generate 4x6 or 5x7 print sheets with multiple photos
- 💾 **Download** - Export processed photos ready for submission

## Tech Stack

- **React** 18.2 - UI framework
- **Tailwind CSS** 3.3 - Styling
- **Lucide React** - Icon library
- **Create React App** - Build tooling

## Prerequisites

- Node.js 14+ and npm
- Backend API running on `http://localhost:5000` (or configure `REACT_APP_API_URL`)

## Installation

```bash
# Install dependencies
npm install
```

## Configuration

Create a `.env` file in the frontend directory (optional):

```env
REACT_APP_API_URL=http://localhost:5000/api
```

## Development

```bash
# Start development server
npm start

# Runs on http://localhost:3000
```

The app will automatically reload when you make changes.

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- ComplianceChecklist.test.js
```

### Test Coverage

The frontend includes comprehensive test suites:
- Compliance checklist UI (13 tests)
- Download functionality (14 tests)
- Print sheet generation (15 tests)
- State management (16 tests)
- Background removal toggle (19 tests)
- Loading and error states (22 tests)

**Total: 99 tests with 100% pass rate**

## Building for Production

```bash
# Create optimized production build
npm run build

# Output will be in the 'build' directory
```

## Project Structure

```
frontend/
├── public/              # Static files
├── src/
│   ├── __tests__/      # Test files
│   ├── App.js          # Main application component
│   ├── index.js        # Entry point
│   └── index.css       # Global styles
├── package.json
└── README.md
```

## Key Components

### PassportPhotoApp (Main Component)
The primary application component managing:
- File upload and preview
- Image processing workflow
- State management
- API communication

### ComplianceChecklist
Displays 8 compliance checks:
- High resolution (≥600x600)
- Head centered
- Correct head size (50-69% height ratio)
- Plain background
- Neutral expression
- Eyes open
- No shadows
- No obstructions

### ComplianceItem
Individual checklist item with status indicators:
- ✅ Green checkmark (passed)
- ❌ Red X (failed)
- ⚪ Gray dot (pending)

### FinalChecks
Confirmation of processed photo compliance attributes.

## API Integration

The frontend communicates with the backend API:

### POST `/api/full-workflow`
Processes uploaded photos with face detection, AI analysis, and image processing.

**Request:**
- `image`: File (multipart/form-data)
- `use_ai`: Boolean
- `remove_background`: Boolean

**Response:**
```json
{
  "success": true,
  "feasible": true,
  "analysis": {
    "face_detection": { ... },
    "ai_analysis": { ... }
  },
  "processed_image": "base64_encoded_image",
  "message": "Photo successfully processed"
}
```

### POST `/api/log-event`
Logs analytics events for tracking user interactions.

## Features in Detail

### Photo Upload
- Drag-and-drop or click to upload
- Accepts JPEG, PNG, HEIC formats
- 16MB file size limit
- Instant preview of original photo

### Face Detection
- OpenCV Haar Cascade detection
- Validates single face presence
- Checks head positioning and size
- Calculates head height ratio

### AI Analysis (Optional)
- Evaluates photo quality
- Checks expression, eyes, background
- Identifies specific compliance issues
- Provides actionable feedback

### Background Removal
- Toggle on/off functionality
- AI-powered subject isolation
- Replaces with plain white background
- Automatic reprocessing on toggle

### Download Options
- **Single Photo**: 600x600px JPEG at 300 DPI
- **4x6 Print Sheet**: 2 photos (1800x1200px)
- **5x7 Print Sheet**: 4 photos in 2x2 grid (2100x1500px)
- Cutting guides included on print sheets

### State Management
- "Start Over" button to reset
- Clears all state and returns to upload screen
- File input reset
- Ready for new upload

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Troubleshooting

### Port Already in Use
If port 3000 is already in use:
```bash
PORT=3001 npm start
```

### API Connection Issues
Ensure the backend is running and accessible. Check `REACT_APP_API_URL` in your `.env` file.

### Build Errors
Clear cache and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

## Performance

- Optimized image preview rendering
- Debounced API calls
- Loading states prevent duplicate requests
- Efficient React hooks for re-rendering

## Accessibility

- Semantic HTML structure
- ARIA labels for screen readers
- Keyboard navigation support
- High contrast UI elements

## Contributing

1. Follow the existing code style
2. Write tests for new features
3. Ensure all tests pass before submitting
4. Update documentation as needed

## License

Proprietary - All rights reserved

## Support

For issues or questions, please contact the development team.
