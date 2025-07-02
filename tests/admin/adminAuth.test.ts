// tests/admin/adminAuth.test.ts
import axios from 'axios';
import { config } from '../../config/v1/config';

let access_token: string = '';
let refresh_token: string = '';
let cookie: string = '';

const headers = {
  Authorization: '',
};

describe('POST /admin/login', () => {
  const url = `${config.TEST_BASE_URL}/admin/login`;

  it('should return 200 for valid login', async () => {
    const payload = {
      email: 'super@gmail.com',
      password: 'super@123',
    };

    const response = await axios.post(url, payload, {
      withCredentials: true,
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);

    access_token = response.data.accessToken;
    refresh_token = response.data.refreshToken;
    headers.Authorization = `Bearer ${access_token}`;

    // capture the cookie
    cookie = response.headers['set-cookie']?.join('; ') || '';
  });

  it('should return 401 for invalid credentials', async () => {
    const payload = {
      email: 'wrong@example.com',
      password: 'wrongpass',
    };

    try {
      await axios.post(url, payload);
    } catch (error: any) {
      expect(error.response.status).toBe(401);
      expect(error.response.data.success).toBe(false);
    }
  });
});

describe('GET /admin/dashboard/stats', () => {
  const url = `${config.TEST_BASE_URL}/admin/dashboard/stats`;

  it('should return 200 with valid token', async () => {
    const response = await axios.get(url, { headers });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data).toHaveProperty('totalUsers');
  });

  it('should return 401 without token', async () => {
    try {
      await axios.get(url);
    } catch (error: any) {
      expect(error.response.status).toBe(401);
    }
  });
});

describe('POST /admin/logout', () => {
  const url = `${config.TEST_BASE_URL}/admin/logout`;

  it('should logout admin and return 200', async () => {
    const response = await axios.post(url, {}, {
      headers: {
        Cookie: cookie,
      },
      withCredentials: true,
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
  });

  it('should return 401 if no cookies/token present', async () => {
    try {
      await axios.post(url);
    } catch (error: any) {
      expect(error.response.status).toBe(401);
    }
  });
});
