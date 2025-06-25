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
import { initSocket } from "./socket/index"; // Adjust path as needed
import http from 'http'; // <-- Add this
import notificationRoutes from "./routes/user/notificationRoutes";
import notificationMemberRoute from './routes/admin/notificationMemberRoutes';
import userGroupRoutes from './routes/user/userGroupRoutes'; 

dotenv.config(); 

const app = express();
const PORT = 3000;

app.use(cookieParser());
app.use(express.json());
app.use(passport.initialize());


// Routes
app.use('/api/admin', adminRoutes);

app.use('/api/users', userRoutes);
app.use('/api/auth',userAuthRoutes );

app.use('/api/members', memberRoutes);
app.use('/api/members', memberAuthRoutes);
app.use("/api/notification", notificationRoutes);
app.use('/api/notifications/member', notificationMemberRoute);
app.use('/api/member', userGroupRoutes);


// Swagger setup
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

// --- SOCKET.IO SETUP ---
const server = http.createServer(app); // Create HTTP server
initSocket(server); // Initialize Socket.IO with the HTTP server

connectDB().then(async() => {
  await seedAdminUser(); // Seed admin user if not exists
  server.listen(PORT, () => { // <-- Use server.listen, not app.listen
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Swagger docs at http://localhost:${PORT}/api-docs`);
  });
});