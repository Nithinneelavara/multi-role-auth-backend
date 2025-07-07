// tests/admin/adminAuth.test.ts
import axios from 'axios';
import { config } from '../../config/v1/config';
import Group from '../../models/db/group'; // Adjust the path based on your project structure
import jwt from 'jsonwebtoken';
import RefreshToken from '../../models/db/refreshToken'; // make sure this path is correct
import mongoose from 'mongoose';



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


it('should return 400 if email is missing', async () => {
  const payload = {
    password: 'super@123',
  };

  const response = await axios.post(`${config.TEST_BASE_URL}/admin/login`, payload, {
    validateStatus: () => true,
  });

  expect(response.status).toBe(400);
  expect(response.data.success).toBe(false);
  expect(response.data.message).toMatch(/email is required/i);
});

it('should return 400 if password is missing', async () => {
  const payload = {
    email: 'super@gmail.com',
  };

  const response = await axios.post(`${config.TEST_BASE_URL}/admin/login`, payload, {
    validateStatus: () => true,
  });

  expect(response.status).toBe(400);
  expect(response.data.success).toBe(false);
  expect(response.data.message).toMatch(/password is required/i);
});

it('should return 400 if email is not a string', async () => {
  const payload = {
    email: 12345,
    password: 'super@123',
  };

  const response = await axios.post(`${config.TEST_BASE_URL}/admin/login`, payload, {
    validateStatus: () => true,
  });

  expect(response.status).toBe(400);
  expect(response.data.success).toBe(false);
});


});



describe('GET /admin/dashboard/stats', () => {
  const url = `${config.TEST_BASE_URL}/admin/dashboard/stats`;

  it('should return 200 with valid token and correct data structure', async () => {
    const response = await axios.get(url, { headers });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data).toHaveProperty('totalUsers');
    expect(response.data.data).toHaveProperty('totalMembers');
    expect(response.data.data).toHaveProperty('totalGroups');
    expect(response.data.data).toHaveProperty('activeUsers');
    expect(typeof response.data.data.totalUsers).toBe('number');
    expect(typeof response.data.data.activeUsers).toBe('number');
  });

  it('should return 401 if token is missing', async () => {
    try {
      await axios.get(url);
    } catch (error: any) {
      expect(error.response.status).toBe(401);
      expect(error.response.data.success).toBe(false);
    }
  });

  it('should return 401 if token is invalid', async () => {
    try {
      await axios.get(url, {
        headers: { Authorization: 'Bearer invalid.token.here' },
      });
    } catch (error: any) {
      expect(error.response.status).toBe(401);
    }
  });

  it('should handle server/database errors gracefully', async () => {
    const original = Group.countDocuments;
    // Force a DB error
    Group.countDocuments = () => {
      throw new Error('Mocked DB Error');
    };

    try {
      await axios.get(url, { headers });
    } catch (error: any) {
      expect(error.response.status).toBe(500);
    } finally {
      Group.countDocuments = original;
    }
  });
});





//refresh token tests

describe('POST /api/admin/refresh-token', () => {
  const url = `${config.TEST_BASE_URL}/admin/refresh-token`;
  const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key'; // fallback for test

  it('should return 200 and provide new access token if refresh token is valid', async () => {
    const response = await axios.post(
      url,
      {},
      {
        headers: {
          Cookie: cookie,
        },
        withCredentials: true,
      }
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data).toHaveProperty('accessToken');
  });

  it('should return 401 if refresh token is missing', async () => {
    try {
      await axios.post(url);
    } catch (error: any) {
      expect(error.response.status).toBe(401);
      expect(error.response.data.message).toMatch(/refresh token/i);
    }
  });

  it('should return 403 if refresh token not found in DB', async () => {
    try {
      await axios.post(
        url,
        {},
        {
          headers: {
            Cookie: 'refreshToken=nonexistenttoken',
          },
          withCredentials: true,
        }
      );
    } catch (error: any) {
      expect(error.response.status).toBe(403);
      expect(error.response.data.message).toMatch(/invalid refresh token/i);
    }
  });


  it('should return 500 on unexpected server error', async () => {
    const original = RefreshToken.findOne;
    RefreshToken.findOne = () => {
      throw new Error('Mocked DB error');
    };

    try {
      await axios.post(
        url,
        {},
        {
          headers: {
            Cookie: cookie,
          },
          withCredentials: true,
        }
      );
    } catch (error: any) {
      expect(error.response.status).toBe(500);
    } finally {
      RefreshToken.findOne = original;
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



afterAll(async () => {
  await mongoose.disconnect();
});