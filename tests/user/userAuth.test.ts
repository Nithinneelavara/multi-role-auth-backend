import axios from "axios";
import { config } from "../../config/v1/config";

let access_token = "";
let refresh_token = "";
let cookie = "";
let otp: string;

const headers = { Authorization: "" };

const user = {
  email: "deepak.reddy@example.org",
  password: "Akash@2024",
};

const baseUrl = `${config.TEST_BASE_URL}/auth`;

describe("POST /auth/login", () => {
  const url = `${baseUrl}/login`;

  it("should return 200 for valid login", async () => {
    const res = await axios.post(url, user, { withCredentials: true });

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.message).toBe("User login successful");

    access_token = res.data.accessToken;
    refresh_token = res.data.refreshToken;
    headers.Authorization = `Bearer ${access_token}`;

    const setCookie = res.headers["set-cookie"] || [];
    const cookieParts = setCookie
      .map((c: string) => c.split(";")[0])
      .filter((c) => c.startsWith("refreshToken=") || c.startsWith("userToken="));

    cookie = cookieParts.join("; ");
  });

  it("should return 401 for invalid password", async () => {
    try {
      await axios.post(url, {
        email: user.email,
        password: "WrongPassword123",
      });
    } catch (error: any) {
      expect(error.response.status).toBe(401);
      expect(error.response.data.success).toBe(false);
      expect(error.response.data.message).toBe("Invalid email or password");
    }
  });

  it("should return 401 for non-existent email", async () => {
    try {
      await axios.post(url, {
        email: "nonexistent.user@example.com",
        password: "AnyPassword123",
      });
    } catch (error: any) {
      expect(error.response.status).toBe(401);
      expect(error.response.data.success).toBe(false);
      expect(error.response.data.message).toBe("Invalid email or password");
    }
  });
});

describe("GET /auth/me", () => {
  const url = `${baseUrl}/me`;

  it("should return 200 with valid token", async () => {
    const res = await axios.get(url, {
      headers,
      withCredentials: true,
    });

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.message).toBe("User data fetched successfully");
    expect(res.data.data.email).toBe(user.email);
  });

  it("should return 401 without token", async () => {
    try {
      await axios.get(url);
    } catch (error: any) {
      expect(error.response.status).toBe(401);
    }
  });
});

describe("POST /auth/refresh", () => {
  const url = `${baseUrl}/refresh`;

  it("should return 200 with valid refresh token", async () => {
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
    expect(res.data.message).toBe("New user access token issued successfully");
    expect(res.data.accessToken).toBeDefined();
  });

  it("should return 401 if refresh token is missing", async () => {
    try {
      await axios.post(url, {}, { withCredentials: true });
    } catch (error: any) {
      expect(error.response.status).toBe(401);
      expect(error.response.data.success).toBe(false);
      expect(error.response.data.message).toBe("Refresh token missing");
    }
  });

  it("should return 403 if refresh token is invalid", async () => {
    try {
      await axios.post(
        url,
        {},
        {
          headers: { Cookie: "refreshToken=invalid_token_value" },
          withCredentials: true,
        }
      );
    } catch (error: any) {
      expect(error.response.status).toBe(403);
      expect(error.response.data.success).toBe(false);
      expect(error.response.data.message).toContain("Invalid or expired");
    }
  });
});


describe("POST /auth/forgot-password", () => {
  const url = `${baseUrl}/forgot-password`;

  it("should return 200 when valid email is provided", async () => {
    const response = await axios.post(url, { email: user.email });

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
      expect(error.response.data.message).toBe("Email is required");
    }
  });
});

describe("POST /auth/reset-password", () => {
  const url = `${baseUrl}/reset-password`;

  it("should return 200 when valid email, OTP, and new password are provided", async () => {
    const res = await axios.post(url, {
      email: user.email,
      otp,
      newPassword: "Akash@2024",
    });

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.message).toBe("Password has been reset successfully.");
  });

  it("should return 400 for invalid or missing OTP", async () => {
    try {
      await axios.post(url, {
        email: user.email,
        otp: "000000",
        newPassword: "Invalid@123",
      });
    } catch (error: any) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.success).toBe(false);
      expect(error.response.data.message).toBe("Invalid or expired OTP.");
    }
  });
});

describe("POST /auth/logout", () => {
  const url = `${baseUrl}/logout`;

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
    expect(res.data.message).toBe("User logged out successfully. Tokens cleared.");
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

