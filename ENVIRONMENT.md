# Environment Configuration Guide

This frontend is configured to work seamlessly with both local development and production environments.

## 🚀 Quick Start

### Development (Local Backend)
```bash
npm run start:dev
```

### Production (AWS Backend)
```bash
npm run start:prod
```

## 🔧 Manual Environment Switching

### Switch to Development
```bash
npm run env:dev
npm start
```

### Switch to Production
```bash
npm run env:prod
npm start
```

### Check Current Environment
```bash
npm run env:status
```

## 📁 Environment Files

- `.env.development` - Local backend configuration (localhost:5001)
- `.env.production` - Production backend configuration (AWS Elastic Beanstalk)
- `.env` - Active configuration (automatically managed)

## 🤖 Automatic Detection

The app includes smart API detection that:

1. **Uses environment variables** if explicitly set
2. **Auto-detects based on hostname**:
   - `localhost` → Development mode (tries local backend)
   - Other domains → Production mode (uses AWS backend)
3. **Automatic fallback** in development:
   - Tries ports 5001, 5000, 5002, 8000 automatically
   - Shows helpful console messages about which API is being used

## 🔗 API Endpoints

### Development
- Primary: `http://localhost:5001/api`
- Fallbacks: `http://localhost:5000/api`, `http://localhost:5002/api`, `http://localhost:8000/api`

### Production
- `http://passport-photo-ai-blue.eba-dezajzhp.us-east-1.elasticbeanstalk.com/api`

## 🐛 Debugging

Check the browser console for API connection messages:
- `🔗 Primary API URL: ...` - Shows which API is being used
- `Trying fallback API: ...` - Shows fallback attempts
- `✅ Fallback API successful: ...` - Shows successful fallback

## 📦 Build for Production

```bash
npm run build:prod
```

This automatically switches to production environment and builds the app.

## 🔄 No Code Changes Required

Once set up, you can switch between environments without changing any code:

- **Developers**: Use `npm run start:dev` for local development
- **Production**: Use `npm run build:prod` for deployment
- **Testing**: Switch environments easily with npm scripts

The app will automatically detect and adapt to the environment!