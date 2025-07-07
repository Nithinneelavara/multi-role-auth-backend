import axios from 'axios';
import { config } from '../../config/v1/config';
import Order from '../../models/db/order';
import mongoose from 'mongoose';
import http from 'http';

let server: http.Server;

beforeAll(async () => {
  const mod = await import('../../index');
  server = (mod as any).server || (mod as any).default || mod;

  // Ensure test order exists
  await Order.create({
    memberId: new mongoose.Types.ObjectId(),
    orderId: 'test_order_123',
    isPaid: false,
    status: 'created',
    paymentId: '',
  });
});

afterAll(async () => {
  await Order.deleteMany({ orderId: 'test_order_123' });
  if (server?.close) await server.close();
});

describe('POST /api/payment/webhook', () => {
  const url = `${config.TEST_BASE_URL}/webhook`;

  it('should update order when valid payload is sent', async () => {
    const payload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_test123',
            order_id: 'test_order_123',
            status: 'captured',
          },
        },
      },
    };

    const response = await axios.post(
      url,
      Buffer.from(JSON.stringify(payload)), // raw body
      {
        headers: {
          'Content-Type': 'application/json',
        },
        validateStatus: () => true,
      }
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
  });

  it('should return 400 if payload is missing required fields', async () => {
    const incompletePayload = {
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: '',
            order_id: '',
            status: 'failed',
          },
        },
      },
    };

    const response = await axios.post(
      url,
      Buffer.from(JSON.stringify(incompletePayload)), // raw body
      {
        headers: {
          'Content-Type': 'application/json',
        },
        validateStatus: () => true,
      }
    );

    expect(response.status).toBe(400);
    expect((response.data?.message || '').toLowerCase()).toMatch(/missing/i);
  });

  it('should return 404 if order not found', async () => {
    const payload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_404',
            order_id: 'order_not_exist',
            status: 'captured',
          },
        },
      },
    };

    const response = await axios.post(
      url,
      Buffer.from(JSON.stringify(payload)), // raw body
      {
        headers: {
          'Content-Type': 'application/json',
        },
        validateStatus: () => true,
      }
    );

    expect(response.status).toBe(404);
    expect((response.data?.message || '').toLowerCase()).toMatch(/order not found/);
  });

  it('should return 500 if unexpected error occurs', async () => {
    const malformed = Buffer.from('{ "event": "payment.failed" '); // malformed JSON

    const response = await axios.post(
      url,
      malformed,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        validateStatus: () => true,
      }
    );

    expect(response.status).toBe(500);
    expect(response.data.success).toBe(false);
  });
});
