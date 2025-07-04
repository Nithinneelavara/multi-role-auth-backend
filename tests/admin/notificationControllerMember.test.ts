    import axios from 'axios';
    import {config} from '../../config/v1/config';

    let token: string;
    let validMemberId: string;

    // Setup auth and test data
    beforeAll(async () => {
    // Login to get token
    const loginResponse = await axios.post(`${config.TEST_BASE_URL}/member/login`, {
        email: 'ravi.kumar@example.com',
        password: 'SecurePass123',
    });

    token = loginResponse.data.data.accessToken;
    validMemberId = loginResponse.data.data.member._id;
    });

    // notifyMember tests
    describe('POST /api/notifications/member', () => {
    it('should send notification to a specific member', async () => {
        const response = await axios.post(
        `${config.TEST_BASE_URL}/notifications/member`,
        {
            memberId: validMemberId,
            message: 'You have a new task assigned!',
            data: { type: 'task', priority: 'high' },
        },
        {
            headers: { Authorization: `Bearer ${token}` },
        }
        );

        expect(response.status).toBe(200);
        expect(response.data.message).toMatch(/Notification sent and saved successfully/i);
    });

    it('should fail if memberId or message is missing', async () => {
        const response = await axios.post(
        `${config.TEST_BASE_URL}/notifications/member`,
        {
            // missing memberId and/or message
            data: { info: 'something' },
        },
        {
            headers: { Authorization: `Bearer ${token}` },
            validateStatus: () => true,
        }
        );

        expect(response.status).toBe(400);
        expect(response.data.error).toMatch(/memberId and message are required/i);
    });
    });

    // getMemberNotifications tests
    describe('GET /api/notifications/member/:userId', () => {
    it('should fetch all notifications for the given member', async () => {
        const response = await axios.get(
        `${config.TEST_BASE_URL}/notifications/member/${validMemberId}`,
        {
            headers: { Authorization: `Bearer ${token}` },
        }
        );

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
    });

    it('should return 500 for invalid memberId format', async () => {
        const invalidId = 'invalidMemberId123';
        const response = await axios.get(
        `${config.TEST_BASE_URL}/notifications/member/${invalidId}`,
        {
            headers: { Authorization: `Bearer ${token}` },
            validateStatus: () => true,
        }
        );

        expect(response.status).toBe(500);
        expect(response.data.error).toMatch(/Failed to fetch member notifications/i);
    });
    });
