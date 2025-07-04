import axios from 'axios';
import mongoose from 'mongoose';
import { config } from '../../config/v1/config';

const baseUrl = `${config.TEST_BASE_URL}/members`;
let headers: { Authorization: string } = { Authorization: '' };
let createdMemberId = '';
let testEmail = `member${Date.now()}@example.com`;

beforeAll(async () => {
  const loginRes = await axios.post(`${config.TEST_BASE_URL}/admin/login`, {
    email: 'super@gmail.com',
    password: 'super@123',
  });
  headers.Authorization = `Bearer ${loginRes.data.accessToken}`;
});

describe('POST /api/members - Create Member', () => {
  it('should create a member successfully', async () => {
    const res = await axios.post(
      baseUrl,
      {
        name: 'Test Member',
        email: testEmail,
        password: 'Test@1234',
        address: '123 Test Lane',
      },
      { headers }
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data.email).toBe(testEmail);

    createdMemberId = res.data.data._id;
  });

  it('should fail to create duplicate member email', async () => {
    const res = await axios
      .post(
        baseUrl,
        {
          name: 'Duplicate Member',
          email: testEmail,
          password: 'Test@1234',
          address: 'Dup Lane',
        },
        { headers }
      )
      .catch((err) => err.response);

    expect(res.status).toBe(400);
    expect(res.data.message).toMatch(/Email already registered/);
  });
});

describe('POST /api/members/get - Get Members', () => {
  it('should return list of members with pagination', async () => {
    const res = await axios.post(
      `${baseUrl}/get`,
      {
        pagination: { page: 1, limit: 10 },
        search: { term: 'Test', fields: ['name'] },
      },
      { headers }
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(Array.isArray(res.data.data.results)).toBe(true);
  });

  it('should return specific member by ID', async () => {
    const res = await axios.post(
      `${baseUrl}/get`,
      { id: createdMemberId },
      { headers }
    );

    expect(res.status).toBe(200);
    expect(res.data.data.results[0]._id).toBe(createdMemberId);
  });
});

describe('PUT /api/members/:id - Update Member', () => {
  it('should update member name', async () => {
    const res = await axios.put(
      `${baseUrl}/${createdMemberId}`,
      { name: 'Updated Member' },
      { headers }
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data.name).toBe('Updated Member');
  });

  it('should return 404 for invalid member ID', async () => {
    const invalidMemberId = new mongoose.Types.ObjectId();
    const res = await axios
      .put(`${baseUrl}/${invalidMemberId}`, { name: 'Invalid' }, { headers })
      .catch((err) => err.response);

    expect(res.status).toBe(404);  
    expect(res.data.message).toMatch(/Member not found/);
  });
});

describe('DELETE /api/members/:id - Delete Member', () => {
  it('should delete member successfully', async () => {
    const res = await axios.delete(`${baseUrl}/${createdMemberId}`, {
      headers,
    });

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.message).toMatch(/Member deleted/);
  });

  it('should return 404 for non-existing member ID', async () => {
    const res = await axios
      .delete(`${baseUrl}/${new mongoose.Types.ObjectId()}`, { headers })
      .catch((err) => err.response);

    expect(res.status).toBe(404);
    expect(res.data.message).toMatch(/Member not found/);
  });
});
