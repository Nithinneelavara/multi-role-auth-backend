//tests\admin\adminGroup.test.ts
import axios from 'axios';
import { config } from '../../config/v1/config';

let token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NTEwMDY3MDMxNmQ1ODc4YTM3NTBjYSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1MTUxNjEyNSwiZXhwIjoxNzUxNjAyNTI1fQ.O8tgKhE9B2dWSjDSEGdvYywytRQQfzaLOVtYL6juapk';
let groupId: string; // ← Use this across tests
let pendingRequestId: string;
let anotherPendingRequestId: string;
let another: string;

beforeAll(async () => {
  // Ensure your server is already running before this test
  const res = await axios.post(`${config.TEST_BASE_URL}/admin/login`, {
    email: 'super@gmail.com',
    password: 'super@123',
  });
  token = res.data.accessToken;


  // Create a group for update/delete tests
  const groupName = `test-group-${Date.now()}`;
  const groupRes = await axios.post(
    `${config.TEST_BASE_URL}/admin/groups/create`,
    { groupName, maxUsers: 10 },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  groupId = groupRes.data.data._id;
 
});




describe('Admin Create Group', () => {
  it('should create a group successfully', async () => {
    const groupName = `group-${Date.now()}`;

    const response = await axios.post(
      `${config.TEST_BASE_URL}/admin/groups/create`,
      {
        groupName,
        maxUsers: 5,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    expect(response.status).toBe(200); // Adjust this if your controller returns a different status
    expect(response.data.success).toBe(true);
    expect(response.data.data).toHaveProperty('_id');
    expect(response.data.data.groupName).toBe(groupName.toLowerCase());
    expect(response.data.data.maxUsers).toBe(5);

    groupId = response.data.data._id;
  });

  it('should return 400 for duplicate group name', async () => {
    const groupName = `duplicate-${Date.now()}`;

    // First creation
    await axios.post(
      `${config.TEST_BASE_URL}/admin/groups/create`,
      {
        groupName,
        maxUsers: 3,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    // Duplicate attempt
    try {
      await axios.post(
        `${config.TEST_BASE_URL}/admin/groups/create`,
        {
          groupName,
          maxUsers: 3,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (err: any) {
      expect(err.response.status).toBe(400);
      expect(err.response.data.success).toBe(false);
      expect(err.response.data.message).toMatch(/already exists/i);
    }
  });
});



//get allgroups with members

describe('Admin Get All Groups With Members', () => {
  it('should fetch all groups that have members', async () => {
    const response = await axios.post(
      `${config.TEST_BASE_URL}/admin/groups`,
      {
        pagination: {
          page: 1,
          limit: 10,
        },
        filter: {},
        search: '',
        projection: {
          groupName: 1,
          'members.userName': 1,
          'members.email': 1,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data).toHaveProperty('groups');
    expect(Array.isArray(response.data.data.groups)).toBe(true);
    if (response.data.data.groups.length > 0) {
      const group = response.data.data.groups[0];
      expect(group).toHaveProperty('members');
      expect(Array.isArray(group.members)).toBe(true);
      if (group.members.length > 0) {
        const member = group.members[0];
        expect(member).toHaveProperty('userName');
        expect(member).toHaveProperty('email');
      }
    }
  });

  it('should return empty array if no groups with members found', async () => {
    const response = await axios.post(
      `${config.TEST_BASE_URL}/admin/groups`,
      {
        search: 'non-existent-group-name',
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(Array.isArray(response.data.data.groups)).toBe(true);
  });

  it('should return 500 for invalid projection mixing include and exclude', async () => {
  try {
    await axios.post(
      `${config.TEST_BASE_URL}/admin/groups`,
      {
        projection: {
          groupName: 1,
          maxUsers: 0,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  } catch (err: any) {
    expect(err.response.status).toBe(500);
    expect(err.response.data?.message || '').toMatch(/projection cannot mix/i);
  }
});
});

//get all join requests with pagination and projection

describe('Admin Get Join Requests', () => {

  it('should fetch join requests with pagination and projection', async () => {
    const response = await axios.post(
      `${config.TEST_BASE_URL}/admin/groups/requests`,
      {
        pagination: {
          page: 1,
          limit: 5,
        },
        filter: {},
        search: '',
        projection: {
          requestMessage: 1,
          userName: 1,
          groupName: 1,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data).toHaveProperty('requests');
    expect(Array.isArray(response.data.data.requests)).toBe(true);
  });

  it('should return message for no pending join requests', async () => {
    const response = await axios.post(
      `${config.TEST_BASE_URL}/admin/groups/requests`,
      {
        search: 'non-matching-message-xyz',
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.message).toMatch(/no pending join requests/i);
  });

  it('should return 500 for invalid projection mixing include and exclude', async () => {
    try {
      await axios.post(
        `${config.TEST_BASE_URL}/admin/groups/requests`,
        {
          projection: {
            requestMessage: 1,
            status: 0,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (err: any) {
      expect(err.response.status).toBe(500);
      expect(err.response.data?.message || '').toMatch(
        /projection cannot mix inclusion and exclusion/i
      );
    }
  });
});


pendingRequestId='686655bd18be51c423b0e0d8';
anotherPendingRequestId='68665a8d18be51c423b0e1a6';
another='686655e818be51c423b0e0e8';

describe('Admin Handle Join Request', () => {
  it('should approve a pending join request', async () => {
    const response = await axios.put(
      `${config.TEST_BASE_URL}/admin/groups/join-request/${pendingRequestId}/action`,
      { action: 'approve' },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    console.log('APPROVE RESPONSE:', response.data);
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    //expect(response.data.message).toMatch(/approved successfully/i);
  });

  it('should reject a pending join request', async () => {
    const response = await axios.put(
      `${config.TEST_BASE_URL}/admin/groups/join-request/${anotherPendingRequestId}/action`,
      { action: 'reject' },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.message).toMatch(/rejected successfully/i);
  });

  it('should return 400 for invalid action', async () => {
    const response = await axios.put(
      `${config.TEST_BASE_URL}/admin/groups/join-request/${another}/action`,
      { action: 'invalid-action' },
      {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true,
      }
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(false);
    expect(response.data.message).toMatch(/invalid action/i);
  });
});



//update group

describe('Admin Update Group', () => {

  const groupId1 ='685a65d506f0c24a6fdcd5b8';
  it('should update group details successfully', async () => {
 

    const response = await axios.put(
      `${config.TEST_BASE_URL}/admin/groups/${groupId1}`,
      {
        groupName: 'exelon interns',
        maxUsers: 51,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
  });



  const invalid_groupId = 'hdu2993ydh376932y9dh92';
  it('should handle invalid group ID gracefully', async () => {
    const response = await axios.put(
      `${config.TEST_BASE_URL}/admin/groups/${invalid_groupId}`,
      {
        groupName: 'Invalid',
        maxUsers: 5,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true,
      }
    );

    expect(response.status).toBe(500);
  });
});


//delete group

describe('Admin Delete Group', () => {
  it('should delete group and its join requests successfully', async () => {
    const response = await axios.delete(
      `${config.TEST_BASE_URL}/admin/groups/${groupId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.message).toMatch(/deleted successfully/i);
  });

  it('should handle invalid group ID format', async () => {
    const invalidGroupId = 'hfyuer787377f78W87WT6';
    const response = await axios.delete(
      `${config.TEST_BASE_URL}/admin/groups/${invalidGroupId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true,
      }
    );

    expect(response.status).toBe(500);
  });
});
