import axios from "axios";
import { config } from "../../config/v1/config";

const baseUrl = `${config.TEST_BASE_URL}/member/groups`;
const getApprovedUrl = `${config.TEST_BASE_URL}/member/groups/approved`;
const joinUrl = `${config.TEST_BASE_URL}/member/groups/join`;
const getMessagesUrl = `${config.TEST_BASE_URL}/member/groups/messages`;
const adminGroupUrl = `${config.TEST_BASE_URL}/admin/groups`;
const userLoginUrl = `${config.TEST_BASE_URL}/auth/login`;
const adminLoginUrl = `${config.TEST_BASE_URL}/admin/login`;
const approveUrl = `${config.TEST_BASE_URL}/admin/groups/join-request`;
const getJoinRequestsUrl = `${config.TEST_BASE_URL}/admin/groups/requests`;
const sendUserMessageUrl = `${config.TEST_BASE_URL}/member/messages/send`;
const chatHistoryUrl = `${config.TEST_BASE_URL}/member/messages/history`;
const contactListUrl = `${config.TEST_BASE_URL}/member/messages/contacts`;

let senderHeaders = { Authorization: "" };
let receiverHeaders = { Authorization: "" };
let adminHeaders = { Authorization: "" };
let userHeaders = { Authorization: "" };
let joinedGroupId = "";
let unjoinedGroupId = "";
let joinRequestId = "";
let senderId = "";
const receiverId = "6868ae9db8940469c3a65d12";

beforeAll(async () => {
  try {
    // Login sender
    const senderRes = await axios.post(userLoginUrl, {
      email: "deepa.rani2025@example.in",
      password: "Deepa@2025",
    });
    senderHeaders.Authorization = `Bearer ${senderRes.data.accessToken}`;
    senderId = senderRes.data.user?._id || senderRes.data.data?.user?._id;

    userHeaders = senderHeaders;

    // Login admin
    const adminRes = await axios.post(adminLoginUrl, {
      email: "super@gmail.com",
      password: "super@123",
    });
    adminHeaders.Authorization = `Bearer ${adminRes.data.accessToken}`;

    // Create joined group
    const res1 = await axios.post(
      `${adminGroupUrl}/create`,
      { groupName: `GroupA_${Date.now()}`, maxUsers: 10 },
      { headers: adminHeaders }
    );
    joinedGroupId = res1.data.data._id;

    // Create unjoined group
    const res2 = await axios.post(
      `${adminGroupUrl}/create`,
      { groupName: `GroupB_${Date.now()}`, maxUsers: 10 },
      { headers: adminHeaders }
    );
    unjoinedGroupId = res2.data.data._id;

    // Send join request
    const joinRes = await axios.post(
      joinUrl,
      { groupId: joinedGroupId },
      { headers: senderHeaders }
    );

    joinRequestId =
      joinRes.data?.data?._id ||
      joinRes.data?.data?.joinRequestId ||
      joinRes.data?.data?.joinRequest?._id;

    // Fallback if joinRequestId is not returned directly
    if (!joinRequestId) {
      const fallbackRes = await axios.post(
        getJoinRequestsUrl,
        {
          pagination: { page: 1, limit: 1 },
          filter: { groupId: joinedGroupId, userId: senderId },
        },
        { headers: adminHeaders }
      );
      joinRequestId = fallbackRes.data?.data?.requests?.[0]?._id;
    }

    // Approve the join request
    await axios.put(
      `${approveUrl}/${joinRequestId}/action`,
      { action: "approve" },
      { headers: adminHeaders }
    );
  } catch (err: any) {
    console.error("Setup failed:", err.response?.data || err.message);
    throw err;
  }
});

//------------------- GET AVAILABLE GROUPS -------------------

describe("POST /member/groups → getAvailableGroups", () => {
  it(" [200] should return only unjoined groups (excluding joined)", async () => {
    const res = await axios.post(
      baseUrl,
      { pagination: { page: 1, limit: 10 } },
      { headers: userHeaders }
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    const groupIds = res.data.data.groups.map((g: any) => g._id);
    expect(groupIds).not.toContain(joinedGroupId);
  });

  it(" [200] should return unjoined group when specific groupId is passed", async () => {
    const res = await axios.post(
      baseUrl,
      { groupId: unjoinedGroupId },
      { headers: userHeaders }
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data.groups[0]._id).toBe(unjoinedGroupId);
  });

  it(" [200] should return empty list for already joined groupId", async () => {
    const res = await axios.post(
      baseUrl,
      { groupId: joinedGroupId },
      { headers: userHeaders }
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data.groups).toHaveLength(0);
  });

  it(" [400] should return error for invalid groupId format", async () => {
    const res = await axios
      .post(baseUrl, { groupId: "invalid-id" }, { headers: userHeaders })
      .catch((err) => err.response);

    expect(res.status).toBe(400);
    expect(res.data.success).toBe(false);
    expect(res.data.message.toLowerCase()).toContain("invalid");
  });
});

//------------------- SEND JOIN REQUEST -------------------

describe("POST /member/groups/join → sendJoinRequest", () => {
  let testGroupId = "";

  beforeAll(async () => {
    const createRes = await axios.post(
      `${adminGroupUrl}/create`,
      { groupName: `JoinTestGroup_${Date.now()}`, maxUsers: 10 },
      { headers: adminHeaders }
    );
    testGroupId = createRes.data.data._id;
  });

  it(" [201] should send join request for valid group", async () => {
    const res = await axios.post(
      joinUrl,
      { groupId: testGroupId },
      { headers: userHeaders }
    );

    expect(res.status).toBe(201);
    expect(res.data.success).toBe(true);
    expect(res.data.message.toLowerCase()).toContain("join request sent");
  });

  it(" [400] should fail if join request already exists", async () => {
    const res = await axios
      .post(joinUrl, { groupId: testGroupId }, { headers: userHeaders })
      .catch((err) => err.response);

    expect(res.status).toBe(400);
    expect(res.data.success).toBe(false);
    expect(res.data.message.toLowerCase()).toContain("already");
  });

  it(" [404] should fail if groupId does not exist", async () => {
    const res = await axios
      .post(
        joinUrl,
        { groupId: "000000000000000000000000" },
        { headers: userHeaders }
      )
      .catch((err) => err.response);

    expect(res.status).toBe(404);
    expect(res.data.success).toBe(false);
    expect(res.data.message.toLowerCase()).toContain("group not found");
  });

  it(" [400] should fail for invalid groupId format", async () => {
    const res = await axios
      .post(joinUrl, { groupId: "invalid-id" }, { headers: userHeaders })
      .catch((err) => err.response);

    expect(res.status).toBe(400);
    expect(res.data.success).toBe(false);
    expect(res.data.message.toLowerCase()).toContain("invalid");
  });
});

//------------------- GET APPROVED GROUPS -------------------

describe("POST /member/groups/get → getApprovedGroupsForUser", () => {
  it(" [200] should return approved group list with correct groupId", async () => {
    const res = await axios.post(
      getApprovedUrl,
      { groupId: joinedGroupId },
      { headers: userHeaders }
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data.groups.length).toBe(1);
    expect(res.data.data.groups[0]._id).toBe(joinedGroupId);
  });

  it(" [200] should return all approved groups when no groupId is passed", async () => {
    const res = await axios.post(
      getApprovedUrl,
      { pagination: { page: 1, limit: 10 } },
      { headers: userHeaders }
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(Array.isArray(res.data.data.groups)).toBe(true);
  });

  it(" [200] should return error if groupId is not in approved list", async () => {
    const res = await axios.post(
      getApprovedUrl,
      { groupId: unjoinedGroupId },
      { headers: userHeaders }
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(false);
    expect(res.data.message.toLowerCase()).toContain("not approved");
  });

  it(" [400] should return error for invalid groupId format", async () => {
    const res = await axios
      .post(getApprovedUrl, { groupId: "invalid-id" }, { headers: userHeaders })
      .catch((err) => err.response);

    expect(res.status).toBe(400);
    expect(res.data.success).toBe(false);
    expect(res.data.message.toLowerCase()).toContain("invalid");
  });
});

//------------------- GET GROUP MESSAGES -------------------

describe("POST /member/groups/messages → getMyGroupMessages", () => {
  it(" [200] should return group messages for approved groupId", async () => {
    const res = await axios.post(
      getMessagesUrl,
      { groupId: joinedGroupId },
      { headers: userHeaders }
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(Array.isArray(res.data.data.groups)).toBe(true);
  });

  it(" [200] should return group messages for all approved groups", async () => {
    const res = await axios.post(
      getMessagesUrl,
      { pagination: { page: 1, limit: 10 } },
      { headers: userHeaders }
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(Array.isArray(res.data.data.groups)).toBe(true);
  });

  it(" [200] should return error for unapproved groupId", async () => {
    const res = await axios.post(
      getMessagesUrl,
      { groupId: unjoinedGroupId },
      { headers: userHeaders }
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(false);
    expect(res.data.message.toLowerCase()).toContain("not a member");
  });

  it(" [400] should return error for invalid groupId format", async () => {
    const res = await axios
      .post(getMessagesUrl, { groupId: "invalid-id" }, { headers: userHeaders })
      .catch((err) => err.response);

    expect(res.status).toBe(400);
    expect(res.data.success).toBe(false);
    expect(res.data.message.toLowerCase()).toContain("invalid");
  });
});

describe("POST /member/messages/send → sendUserMessage", () => {
  it(" [200] should send message successfully to another user", async () => {
    const res = await axios.post(
      sendUserMessageUrl,
      {
        receiverId,
        message: "Hello Rahul! How are you?",
      },
      { headers: senderHeaders }
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.message.toLowerCase()).toContain("sent");
    expect(res.data.data).toHaveProperty("_id");
  });

  it(" [400] should fail when receiverId is missing", async () => {
    const res = await axios
      .post(
        sendUserMessageUrl,
        { message: "Missing receiver" },
        { headers: userHeaders }
      )
      .catch((err) => err.response);

    expect(res.status).toBe(400);
    expect(res.data.success).toBe(false);
  });

  it(" [400] should fail when message is missing", async () => {
    const res = await axios
      .post(sendUserMessageUrl, { receiverId }, { headers: userHeaders })
      .catch((err) => err.response);

    expect(res.status).toBe(400);
    expect(res.data.success).toBe(false);
  });

  it(" [400] should fail for invalid message type", async () => {
    const res = await axios
      .post(
        sendUserMessageUrl,
        { receiverId, message: 12345 },
        { headers: userHeaders }
      )
      .catch((err) => err.response);

    expect(res.status).toBe(400);
    expect(res.data.success).toBe(false);
  });

  it(" [400] should not allow user to message themselves", async () => {
    const res = await axios
      .post(
        sendUserMessageUrl,
        { receiverId: senderId, message: "Self message" },
        { headers: userHeaders }
      )
      .catch((err) => err.response);

    expect(res.status).toBe(400);
    expect(res.data.success).toBe(false);
  });
});

describe("POST /member/messages/history → getUserChatHistory", () => {
  it("[200] should return chat history with a user", async () => {
    const res = await axios.post(
      chatHistoryUrl,
      {
        userId: receiverId,
        pagination: { page: 1, limit: 10 },
      },
      { headers: senderHeaders }
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data).toHaveProperty("messages");
    expect(Array.isArray(res.data.data.messages)).toBe(true);
  });

  it("[400] should fail if userId is missing", async () => {
    const res = await axios
      .post(chatHistoryUrl, {}, { headers: senderHeaders })
      .catch((err) => err.response);

    expect(res.status).toBe(400);
    expect(res.data.success).toBe(false);
  });

  it("[400] should fail if userId is invalid", async () => {
    const res = await axios
      .post(
        chatHistoryUrl,
        { userId: "invalid_id" },
        { headers: senderHeaders }
      )
      .catch((err) => err.response);

    expect(res.status).toBe(400);
    expect(res.data.success).toBe(false);
    expect(res.data.message).toMatch("userId");
  });

  it("[400] should fail if user tries to fetch chat with themselves", async () => {
    const res = await axios
      .post(chatHistoryUrl, { userId: senderId }, { headers: senderHeaders })
      .catch((err) => err.response);

    expect(res.status).toBe(400);
    expect(res.data.success).toBe(false);
  });
});

//------------------- GET CONTACT LIST -------------------

describe("POST /member/messages/contacts → getMyContacts", () => {
  it("[200] should return contact list (without userId)", async () => {
    const res = await axios.post(
      contactListUrl,
      {
        pagination: { page: 1, limit: 10 },
      },
      { headers: senderHeaders }
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(Array.isArray(res.data.data.contacts)).toBe(true);
    expect(typeof res.data.data.totalCount).toBe("number");
  });

  it("[200] should return chat history with a specific user", async () => {
    const res = await axios.post(
      contactListUrl,
      {
        userId: receiverId,
        pagination: { page: 1, limit: 10 },
      },
      { headers: senderHeaders }
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data.userId).toBe(receiverId);
    expect(Array.isArray(res.data.data.messages)).toBe(true);
  });

  it("[400] should return error for invalid userId format", async () => {
    const res = await axios
      .post(
        contactListUrl,
        { userId: "invalid_id" },
        { headers: senderHeaders }
      )
      .catch((err) => err.response);

    expect(res.status).toBe(400);
    expect(res.data.success).toBe(false);
    expect(res.data.message.toLowerCase()).toContain("invalid");
  });
});
