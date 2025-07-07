import express from 'express';
import { notifyMember, getMemberNotifications } from '../../controllers/admin/notificationControllerMember';

const router = express.Router();

router.post('/member', notifyMember);
router.get('/member/:userId', getMemberNotifications);

export default router;