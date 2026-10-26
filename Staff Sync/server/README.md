# Staff Sync - Server (Backend)

This folder contains all backend source code, server configuration, database models, controllers, and API routes for Staff Sync.

## Getting Started

### 1. Install dependencies
```bash
npm install
# or pip install -r requirements.txt
```

### 2. Configure Environment Variables
Create a `.env` file in this directory:
```env
PORT=5000
DATABASE_URL=your_database_connection_string
JWT_SECRET=your_jwt_secret_key
CORS_ORIGIN=http://localhost:3000
```

### 3. Run Development Server
```bash
npm run dev
# or python app.py / uvicorn main:app --reload
```

## Folder Structure Suggestion
- `src/controllers/`: Route handlers and business logic
- `src/models/`: Database schema definitions (Prisma, Mongoose, TypeORM, SQLAlchemy)
- `src/routes/`: API endpoint definitions
- `src/middlewares/`: Authentication, error handling, rate limiting
- `src/config/`: Database and environment configuration
