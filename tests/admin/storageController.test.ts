// tests/admin/storageController.test.ts

import axios from 'axios';
import { config } from '../../config/v1/config';

const BASE_URL = `${config.TEST_BASE_URL}/storage`;

describe('Storage Controller', () => {
  describe('GET /storage/upload-url', () => {
    it('should return a signed upload URL when filename and type are provided', async () => {
      const response = await axios.get(`${BASE_URL}/upload-url`, {
        params: { filename: 'test.jpg', type: 'image/jpeg' },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.url).toContain('https://');
    });

    it('should return 400 if filename or type is missing', async () => {
      const response = await axios.get(`${BASE_URL}/upload-url`, {
        params: { filename: 'test.jpg' }, // missing type
        validateStatus: () => true,
      });

      expect(response.status).toBe(400);
      expect(response.data.message).toMatch(/filename and type are required/i);
    });

    it('should return 400 if filename is an array (not a string)', async () => {
  const response = await axios.get(`${BASE_URL}/upload-url`, {
    params: { filename: ['file1', 'file2'], type: 'image/jpeg' },
    validateStatus: () => true,
  });

  expect(response.status).toBe(400);
  expect(response.data.message).toMatch(/must be strings/i);
});

});



  describe('GET /storage/download-url', () => {
    it('should return a signed download URL when filename is provided', async () => {
      const response = await axios.get(`${BASE_URL}/download-url`, {
        params: { filename: 'test.jpg' },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.url).toContain('https://');
    });

    it('should return 400 if filename is missing', async () => {
      const response = await axios.get(`${BASE_URL}/download-url`, {
        validateStatus: () => true,
      });

      expect(response.status).toBe(400);
      expect(response.data.message).toMatch(/filename is required/i);
    });
  


  it('should return 400 if filename is an array (not a string)', async () => {
  const response = await axios.get(`${BASE_URL}/download-url`, {
    params: { filename: ['test.jpg', 'test2.jpg'] },
    validateStatus: () => true, // allow axios to not throw
  });

  expect(response.status).toBe(400);
  expect(response.data.message).toMatch(/filename is required and must be a string/i);
});
});
});
