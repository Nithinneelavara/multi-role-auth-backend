import axios from 'axios';
import { config } from '../../config/v1/config';

let token: string;
const validUserId = '683e9971b60f4923e453fbe9'; // Replace with a valid userId from your DB

beforeAll(async () => {
  const res = await axios.post(`${config.TEST_BASE_URL}/admin/login`, {
    email: 'super@gmail.com',
    password: 'super@123',
  });
  token = res.data.accessToken;
});

describe('POST /api/notification', () => {
  it('should send notification to a specific user', async () => {
    const response = await axios.post(
      `${config.TEST_BASE_URL}/notification`,
      {
        userId: validUserId,
        message: 'You have a new notification!',
        data: { category: 'alert', urgency: 'high' },
      },
      {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true,
      }
    );

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('message', 'Notification sent successfully');
  });

  it('should return 400 if userId is missing', async () => {
    const response = await axios.post(
      `${config.TEST_BASE_URL}/notification`,
      {
        message: 'Missing userId test',
      },
      {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true,
      }
    );

    expect(response.status).toBe(400);
    expect(response.data).toHaveProperty('error', 'userId and message are required');
  });

  it('should return 400 if message is missing', async () => {
    const response = await axios.post(
      `${config.TEST_BASE_URL}/notification`,
      {
        userId: validUserId,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true,
      }
    );

    expect(response.status).toBe(400);
    expect(response.data).toHaveProperty('error', 'userId and message are required');
  });
});

describe('GET /api/notification/:userId', () => {
  it('should return 200 and notifications for valid userId', async () => {
    const response = await axios.get(
      `${config.TEST_BASE_URL}/notification/${validUserId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true,
      }
    );

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);

    if (response.data.length > 0) {
      const notification = response.data[0];
      expect(notification).toHaveProperty('userId');
      expect(notification).toHaveProperty('message');
      expect(notification).toHaveProperty('createdAt');
    }
  });

  it('should return 400 for invalid ObjectId (23 characters)', async () => {
    const invalidId = '12345678901234567890123'; // 23 chars
    const response = await axios.get(
      `${config.TEST_BASE_URL}/notification/${invalidId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true,
      }
    );

    expect(response.status).toBe(400);
    expect(response.data).toHaveProperty('error', 'Invalid userId format');
  });

  it('should return 400 for malformed ObjectId', async () => {
    const malformedId = 'invalid-object-id';
    const response = await axios.get(
      `${config.TEST_BASE_URL}/notification/${malformedId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true,
      }
    );

    expect(response.status).toBe(400);
    expect(response.data).toHaveProperty('error', 'Invalid userId format');
  });
});
