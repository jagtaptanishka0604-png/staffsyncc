import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './staffsync/server/db.js';
import { authRouter } from './staffsync/server/routes/authRoutes.js';
import { employeeRouter } from './staffsync/server/routes/employeeRoutes.js';
import { departmentRouter } from './staffsync/server/routes/departmentRoutes.js';
import { attendanceRouter } from './staffsync/server/routes/attendanceRoutes.js';
import { leaveRouter } from './staffsync/server/routes/leaveRoutes.js';
import { announcementRouter } from './staffsync/server/routes/announcementRoutes.js';
import { trainingRouter } from './staffsync/server/routes/trainingRoutes.js';
import { notificationRouter } from './staffsync/server/routes/notificationRoutes.js';
import { reportRouter } from './staffsync/server/routes/reportRoutes.js';
import { auditLogRouter } from './staffsync/server/routes/auditLogRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  await db.init();
  console.log('StaffSync Database initialized successfully.');

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Security headers & CORS
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logger for API calls
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      const start = Date.now();
      res.on('finish', () => {
        console.log(`[${req.method}] ${req.path} -> ${res.statusCode} (${Date.now() - start}ms)`);
      });
    }
    next();
  });

  // REST API Endpoints under /api/v1
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/employees', employeeRouter);
  app.use('/api/v1/departments', departmentRouter);
  app.use('/api/v1/attendance', attendanceRouter);
  app.use('/api/v1/leaves', leaveRouter);
  app.use('/api/v1/announcements', announcementRouter);
  app.use('/api/v1/trainings', trainingRouter);
  app.use('/api/v1/notifications', notificationRouter);
  app.use('/api/v1/reports', reportRouter);
  app.use('/api/v1/audit-logs', auditLogRouter);

  // Health & Database status endpoint
  app.get('/api/v1/health', (req, res) => {
    const isRemoteMongo = Boolean(
      process.env.MONGODB_URI &&
      process.env.MONGODB_URI.startsWith('mongodb+srv://')
    );

    return res.json({
      status: 'ok',
      service: 'StaffSync HRMS API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      database: {
        status: 'online',
        activeEngine: db.mongoStatus.connected
          ? 'MongoDB Cloud Atlas (Live Connected)'
          : 'Embedded MongoDB-Compatible Document Store (Persisted to disk)',
        mongoAtlas: {
          uriConfigured: db.mongoStatus.uriConfigured,
          connected: db.mongoStatus.connected,
          errorMessage: db.mongoStatus.errorMessage || null,
          resolution: db.mongoStatus.errorMessage?.includes('IP')
            ? 'In MongoDB Atlas -> Network Access -> Add IP Address -> Allow Access from Anywhere (0.0.0.0/0)'
            : null,
        },
        storageFile: 'data/staffsync-db.json',
        localMongoDaemonRunning: false,
        note: 'The local mongod daemon is not installed on this cloud container. StaffSync automatically runs with its persistent disk-backed document database containing all collections, and can sync with MongoDB Atlas when the cluster IP whitelist allows connections.',
        collectionCounts: {
          users: db.users.length,
          employees: db.employees.length,
          departments: db.departments.length,
          attendances: db.attendances.length,
          leaves: db.leaves.length,
          leaveBalances: db.leaveBalances.length,
          announcements: db.announcements.length,
          trainings: db.trainings.length,
          notifications: db.notifications.length,
          auditLogs: db.auditLogs.length,
        },
      },
      activeUsers: db.users.filter((u: any) => u.isActive).length,
      activeEmployees: db.employees.filter((e: any) => e.employmentStatus === 'Active').length,
    });
  });

  app.get('/api/v1/db-status', (req, res) => {
    res.redirect('/api/v1/health');
  });

  // Vite integration: Dev middleware or static files
  const server = http.createServer(app);
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 StaffSync HRMS Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
