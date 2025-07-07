import axios from 'axios';
import mongoose from 'mongoose';
import { config } from '../../config/v1/config';

const baseUrl = `${config.TEST_BASE_URL}/users`;
let createdUserId = '';
let testEmail = '';
let testId = '';
const headers: { Authorization: string } = { Authorization: '' };
const invalidHeaders = { Authorization: 'Bearer invalidtoken' };

beforeAll(async () => {
  const loginRes = await axios.post(`${config.TEST_BASE_URL}/admin/login`, {
    email: 'super@gmail.com',
    password: 'super@123',
  });
  headers.Authorization = `Bearer ${loginRes.data.accessToken}`;
});

describe('POST /api/users - Create User', () => {
  const url = `${baseUrl}`;

  it('should return success 200 and create a user with valid data', async () => {
    testId = new mongoose.Types.ObjectId().toString();
    testEmail = `anil.kumar${Date.now()}@example.com`;

    const res = await axios.post(
      url,
      {
        id: testId,
        userName: 'anilkumar',
        email: testEmail,
        password: 'Strong@123',
        first_name: 'Anil',
        last_name: 'Kumar',
        profile_picture: 'https://example.com/anil.jpg',
        phone_number: '9876543210',
        role: 'user',
        bio: 'Software developer from India.',
        address: '123 Gandhi Street, Delhi, India',
        social_links: {
          linkedin: 'https://linkedin.com/in/anilkumar',
          github: 'https://github.com/anilkumar',
        },
      },
      { headers }
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data.userName).toBe('anilkumar');

    createdUserId = res.data.data._id;
  });

  it('should return error for duplicate email', async () => {
    const res = await axios
      .post(
        url,
        {
          id: new mongoose.Types.ObjectId().toString(),
          userName: 'duplicateUser',
          email: testEmail,
          password: 'Strong@123',
          first_name: 'Test',
          last_name: 'Duplicate',
          profile_picture: 'https://example.com/dup.jpg',
          phone_number: '9999999999',
          role: 'user',
          bio: 'Duplicate tester',
          address: '456 Street',
          social_links: {
            twitter: 'https://twitter.com/duplicate',
          },
        },
        { headers }
      )
      .catch((err) => err.response);

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(false);
    expect(res.data.message).toMatch('Email already in use');
  });

  it('should fail to create user without auth token', async () => {
    const res = await axios
      .post(`${baseUrl}`, {
        id: new mongoose.Types.ObjectId().toString(),
        userName: 'unauthUser',
        email: `unauth${Date.now()}@mail.com`,
        password: 'Pass@1234',
      })
      .catch((err) => err.response);

    expect(res?.status).toBe(401);
  });
});

describe('POST /api/users/get - Fetch Users', () => {
  const url = `${baseUrl}/get`;

  it('should return users with pagination and search', async () => {
    const res = await axios.post(
      url,
      {
        pagination: { page: 1, limit: 5 },
        search: { term: 'anil', fields: ['userName'] },
      },
      { headers }
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(Array.isArray(res.data.data.users)).toBe(true);
  });

  it('should return 400 for invalid userId format', async () => {
    const res = await axios
      .post(url, { userId: '1234' }, { headers })
      .catch((err) => err.response);

    expect(res.status).toBe(400);
    expect(res.data.message).toMatch('Invalid userId');
  });

  it('should fail to get users with invalid token', async () => {
    const res = await axios
      .post(
        `${baseUrl}/get`,
        { pagination: { page: 1, limit: 5 } },
        { headers: invalidHeaders }
      )
      .catch((err) => err.response);

    expect(res?.status).toBe(401);
  });
});

describe('PUT /api/users/:id - Update User', () => {
  it('should update the user info', async () => {
    const url = `${baseUrl}/${createdUserId}`;
    const res = await axios.put(url, { userName: 'updatedAnil' }, { headers });

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data.userName).toBe('updatedAnil');
  });

  it('should return error for invalid user ID format', async () => {
    const res = await axios
      .put(`${baseUrl}/invalid-id`, { userName: 'failCase' }, { headers })
      .catch((err) => err.response);

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(false);
    expect(res.data.message).toMatch('Invalid user ID format');
  });

  it('should fail to update user without token', async () => {
    const res = await axios
      .put(`${baseUrl}/${createdUserId || new mongoose.Types.ObjectId().toString()}`, {
        userName: 'noTokenUpdate',
      })
      .catch((err) => err.response);

    expect(res?.status).toBe(401);
  });
});

describe('DELETE /api/users/:id - Delete User', () => {
  it('should delete the user successfully', async () => {
    const url = `${baseUrl}/${createdUserId}`;
    const res = await axios.delete(url, { headers });

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.message).toMatch('User deleted successfully');
  });

  it('should return error for non-existent user', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await axios.delete(`${baseUrl}/${fakeId}`, { headers });

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(false);
    expect(res.data.message).toMatch('User not found');
  });

  it('should fail to delete user with missing token', async () => {
    const res = await axios
      .delete(`${baseUrl}/${createdUserId || new mongoose.Types.ObjectId().toString()}`)
      .catch((err) => err.response);

    expect(res?.status).toBe(401);
  });
});
