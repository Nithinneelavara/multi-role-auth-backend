    import axios from 'axios';
    import {config} from '../../config/v1/config';

    let token: string;
    let validMemberId: string= '6867b01a050a5321b301ba50'; 

    // Setup auth and test data
    beforeAll(async () => {
    // Login to get token
    const res = await axios.post(`${config.TEST_BASE_URL}/admin/login`, {
    email: 'super@gmail.com',
    password: 'super@123',
  });
    token = res.data.accessToken;
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

    it('should return 400 for invalid memberId format', async () => {
    const response = await axios.post(
      `${config.TEST_BASE_URL}/notifications/member`,
      {
        memberId: 'invalid_id',
        message: 'Test message',
      },
      {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true,
      }
    );

    expect(response.status).toBe(400);
    expect(response.data.error).toMatch(/Invalid memberId format/i);
  });

  it('should return 404 for non-existent memberId', async () => {
    const response = await axios.post(
      `${config.TEST_BASE_URL}/notifications/member`,
      {
        memberId: '64b48c744f4c8c4a6d849999', // non-existent but valid ObjectId
        message: 'Test message',
      },
      {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true,
      }
    );

    expect(response.status).toBe(404);
    expect(response.data.error).toMatch(/Member not found/i);
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

    it('should return 400 for invalid memberId format (valid ObjectId but wrong length)', async () => {
  const invalidId = '6867b01a050a5321b301b11';
  const response = await axios.get(
    `${config.TEST_BASE_URL}/notifications/member/${invalidId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true,
    }
  );

  expect(response.status).toBe(400);
  expect(response.data.error).toMatch(/Invalid memberId format/i);
});

it('should return 400 for malformed memberId (not an ObjectId at all)', async () => {
  const malformedId = 'invalidMemberId123';
  const response = await axios.get(
    `${config.TEST_BASE_URL}/notifications/member/${malformedId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true,
    }
  );

  expect(response.status).toBe(400);
  expect(response.data.error).toMatch(/Invalid memberId format/i);
});
});
