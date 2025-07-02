//routes\user\notificationRoutes.ts
import express from 'express';
import { notifyUser, getUserNotifications } from '../../controllers/user/notificationController';

const router = express.Router();

router.post('/', notifyUser);
router.get('/:userId', getUserNotifications);

export default router;
