import express from 'express';
import dotenv from 'dotenv';
import { connectDB } from './models/connection';
import { seedAdminUser } from './seed/seedAdmin'; 
import cookieParser from 'cookie-parser';
import passport from './middleware/passport';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { swaggerOptions } from './Swagger/swaggerOptions';
import adminRoutes from './routes/admin/adminRoutes';
import userRoutes from './routes/user/userRoutes';
import userAuthRoutes from './routes/user/userAuthRoutes';
import memberRoutes from './routes/admin/memberRoutes';
import memberAuthRoutes from './routes/admin/memberAuthRoute';
import { Request, Response, NextFunction } from 'express';
import { initSocket } from "./socket/index"; 
import http from 'http'; 
import notificationRoutes from "./routes/user/notificationRoutes";
import notificationMemberRoute from './routes/admin/notificationMemberRoutes';
import userGroupRoutes from './routes/user/userGroupRoutes'; 
import storageRoutes from './routes/admin/storageRoutes';
import { startMessageScheduler } from './utils/schedular';
import memberPaymentRoutes from './routes/admin/memberPaymentRoutes';
import cors from 'cors';
import { globalErrorHandler } from './middleware/errorHandler';

dotenv.config(); 

const app = express();

app.use((req, res, next) => {
  if (req.originalUrl === '/api/webhook') {
    next(); // Let express.raw() handle it
  } else {
    express.json()(req, res, next);
  }
});

const PORT = 3000;

startMessageScheduler();
app.use(cors());
app.use(cookieParser());
app.use(passport.initialize());


app.use('/api/admin', adminRoutes);
app.use('/api/storage', storageRoutes);

app.use('/api/users', userRoutes);
app.use('/api/auth',userAuthRoutes );
app.use("/api/notification", notificationRoutes);
app.use('/api/member', userGroupRoutes);

app.use('/api', memberPaymentRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/members', memberAuthRoutes);
app.use('/api/notifications/member', notificationMemberRoute);
app.use(globalErrorHandler);

const specs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs,{
    customCss: '.swagger-ui { background:#e3f2fd; color: #263238; }', // Example: dark background
  }));

app.use((req: Request, res: Response, next: NextFunction) => {
  if ((req as any).apiResponse) {
    res.json((req as any).apiResponse);
  } else {
    next();
  }
});

const server = http.createServer(app);
initSocket(server);

connectDB().then(async() => {
  await seedAdminUser(); 
  if (process.env.NODE_ENV !== 'test'){
  server.listen(PORT, () => { 
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Swagger docs at http://localhost:${PORT}/api-docs`);
  });
}});
