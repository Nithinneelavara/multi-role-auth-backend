import express from 'express';
import { notifyMember, getMemberNotifications } from '../../controllers/admin/notificationControllerMember';

const router = express.Router();

router.post('/', notifyMember);
router.get('/:userId', getMemberNotifications);

export default router;