# Staff Sync - Client (Frontend)

This folder contains all frontend source code, components, styles, and public assets for Staff Sync.

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in this directory:
```env
VITE_API_BASE_URL=http://localhost:5000/api
# or NEXT_PUBLIC_API_URL=...
```

### 3. Run Development Server
```bash
npm run dev
```

## Folder Structure Suggestion
- `src/components/`: Reusable UI components
- `src/pages/` or `src/app/`: Routing views
- `src/services/` or `src/api/`: API integration utilities
- `src/context/` or `src/store/`: State management
- `src/assets/`: Images, icons, and stylesheets
