import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics to map to SLOs
const errorRate = new Rate('errors');
const messageDeliveryTime = new Trend('message_delivery_time');

export const options = {
  stages: [
    { duration: '2m', target: 500 },  // Ramp up to 500 users
    { duration: '3m', target: 1000 }, // Peak load: 1000 concurrent users
    { duration: '5m', target: 1000 }, // Sustain peak load
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    // SLO: message delivery success >= 99.99% -> errors < 0.01%
    errors: ['rate<0.0001'],
    
    // SLO: p95 API < 120ms
    http_req_duration: ['p(95)<120', 'p(99)<250'], 
    message_delivery_time: ['p(95)<120']
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000/api';

export default function () {
  // Simulate fetching a user's initial data (e.g. recent conversations)
  const feedRes = http.get(`${BASE_URL}/conversations?limit=20`);
  check(feedRes, {
    'conversations loaded status 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(Math.random() * 2 + 1); // Random wait 1-3 seconds

  // Simulate sending a message
  const payload = JSON.stringify({
    content: `High-load test message from VU ${__VU} at ${new Date().toISOString()}`,
    conversation_id: `test-conv-${Math.floor(Math.random() * 10)}`, // Spread load across 10 dummy convos
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      // 'Authorization': `Bearer ${__ENV.TEST_TOKEN}`
    },
  };

  const startMsg = new Date().getTime();
  const msgRes = http.post(`${BASE_URL}/messages/send`, payload, params);
  const endMsg = new Date().getTime();

  const success = check(msgRes, {
    'message sent status 200/201': (r) => r.status === 200 || r.status === 201,
  });
  
  if (!success) {
    errorRate.add(1);
  } else {
    messageDeliveryTime.add(endMsg - startMsg);
  }

  sleep(Math.random() * 3 + 1);
}
