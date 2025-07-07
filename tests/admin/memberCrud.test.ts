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
it('should fail when required fields are missing', async () => {
    const res = await axios
      .post(
        baseUrl,
        {
          email: `incomplete${Date.now()}@example.com`,
          password: 'Test@1234',
        },
        { headers }
      )
      .catch((err) => err.response);

    expect(res.status).toBe(400);
    expect(res.data.message).toMatch(/Name is required/);
  });

  it('should fail for invalid email format', async () => {
    const res = await axios
      .post(
        baseUrl,
        {
          name: 'Invalid Email',
          email: 'invalid-email',
          password: 'Test@1234',
          address: 'Test',
        },
        { headers }
      )
      .catch((err) => err.response);

    expect(res.status).toBe(400);
    expect(res.data.message).toMatch(/Must be a valid email/);
  });

  it('should fail for short password', async () => {
    const res = await axios
      .post(
        baseUrl,
        {
          name: 'Short Password',
          email: `shortpass${Date.now()}@example.com`,
          password: 'short',
          address: 'Short St',
        },
        { headers }
      )
      .catch((err) => err.response);

    expect(res.status).toBe(400);
    expect(res.data.message).toMatch(/Password must be at least 6 characters/);
  });

  it('should fail with missing/invalid token', async () => {
    const res = await axios
      .post(
        baseUrl,
        {
          name: 'Unauthorized Member',
          email: `unauth${Date.now()}@example.com`,
          password: 'Test@1234',
          address: 'No Auth',
        },
        {} // No headers
      )
      .catch((err) => err.response);

    expect(res.status).toBe(401); // Or 403 depending on your middleware
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
  it('should return 400 for invalid member ID', async () => {
    const res = await axios.post(
      `${baseUrl}/get`,
      { id: 'invalid_id' },
      { headers, validateStatus: () => true }
    );

    expect(res.status).toBe(400);
    expect(res.data.success).toBe(false);
    expect(res.data.message).toBe('Invalid member ID format.');
  });

  it('should return empty results for unmatched search', async () => {
    const res = await axios.post(
      `${baseUrl}/get`,
      {
        search: { term: 'nonexistentMember', fields: ['name'] },
      },
      { headers }
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data.results.length).toBe(0);
    expect(res.data.message).toBe('No members found.');
  });

  it('should return 400 for invalid projection mix', async () => {
    const res = await axios.post(
      `${baseUrl}/get`,
      {
        projection: { name: 1, email: 0 }, // invalid mix
      },
      { headers, validateStatus: () => true }
    );

    expect(res.status).toBe(400);
    expect(res.data.success).toBe(false);
    expect(res.data.message).toBe('Projection cannot mix inclusion and exclusion.');
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
  it('should return 400 if update body is empty', async () => {
    const res = await axios
      .put(`${baseUrl}/${createdMemberId}`, {}, { headers })
      .catch((err) => err.response);

    expect(res.status).toBe(400);
    expect(res.data.message).toBe('Update data cannot be empty.');
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
  
  it('should return 400 for invalid member ID format', async () => {
    const res = await axios
      .delete(`${baseUrl}/invalid-id`, { headers })
      .catch((err) => err.response);

    expect(res.status).toBe(400);
    expect(res.data.message).toMatch(/Invalid member ID format/);
  });
});
