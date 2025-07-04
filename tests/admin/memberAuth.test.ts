import axios from "axios";
import { config } from "../../config/v1/config";

let access_token = "";
let refresh_token = "";
let cookie = "";
let otp: string;
const headers = { Authorization: "" };

const member = {
  email: "ravi.kumar@example.com",
  password: "SecurePass123",
};

describe("POST /api/members/login", () => {
  const url = `${config.TEST_BASE_URL}/members/login`;

  it("should return 200 for valid login", async () => {
    const res = await axios.post(url, member, { withCredentials: true });

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.message).toBe("Member login successful");

    access_token = res.data.accessToken;
    refresh_token = res.data.refreshToken;
    headers.Authorization = `Bearer ${access_token}`;
    cookie = res.headers["set-cookie"]?.join("; ") || "";
  });

  it("should return 401 for invalid password", async () => {
    try {
      await axios.post(url, {
        email: member.email,
        password: "WrongPassword123",
      });
    } catch (error: any) {
      expect(error.response.status).toBe(401);
      expect(error.response.data.success).toBe(false);
      expect(error.response.data.message).toBe("Invalid email or password");
    }
  });
});



describe("POST /api/members/refresh-token", () => {
  const url = `${config.TEST_BASE_URL}/members/refresh-token`;

  it("should return 200 with valid token", async () => {
  const res = await axios.post(
    url,
    {},
    {
      headers: { Cookie: cookie },
      withCredentials: true,
    }
  );
  
  expect(res.status).toBe(200);
  expect(res.data.success).toBe(true);
  expect(res.data.message).toBe("New member access token issued successfully");
});


  it("should return 401 without token", async () => {
    try {
      await axios.post(url);
    } catch (error: any) {
      expect(error.response.status).toBe(401);
    }
  });
});

describe("POST /api/members/forgot-password", () => {
  const url = `${config.TEST_BASE_URL}/members/forgot-password`;

  it("should return 200 when valid email is provided", async () => {
    const response = await axios.post(url, { email: member.email });
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.message).toBe("OTP sent successfully to the registered email.");
    otp = response.data.otp; 
  }, 20000);

  it("should return 400 when email is missing", async () => {
    try {
      await axios.post(url, {});
    } catch (error: any) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.success).toBe(false);
      expect(error.response.data.message).toBe("Valid email is required");
    }
  });
});

describe("POST /api/members/reset-password", () => {
  const url = `${config.TEST_BASE_URL}/members/reset-password`;

  it("should return 200 when valid email, OTP, and new password are provided", async () => {
    const res = await axios.post(url, {
      email: member.email,
      otp,
      newPassword: "NewMember@Pass2025",
    });

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.message).toBe("Password has been reset successfully.");
  });

  it("should return 400 for invalid or expired OTP", async () => {
    try {
      await axios.post(url, {
        email: member.email,
        otp: "123456",
        newPassword: "Invalid@2025",
      });
    } catch (error: any) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.success).toBe(false);
      expect(error.response.data.message).toBe("Invalid or expired OTP.");
    }
  });
});

describe("POST /api/members/logout", () => {
  const url = `${config.TEST_BASE_URL}/members/logout`;

  it("should return 200 for valid logout with cookies", async () => {
    const res = await axios.post(
      url,
      {},
      {
        headers: { Cookie: cookie },
        withCredentials: true,
      }
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.message).toBe("Member logged out successfully. Tokens cleared.");
  });

  it("should return 401 if no cookies sent", async () => {
    try {
      await axios.post(url);
    } catch (error: any) {
      expect(error.response.status).toBe(401);
      expect(error.response.data.success).toBe(false);
      expect(error.response.data.message).toBe("Tokens missing");
    }
  });
});
