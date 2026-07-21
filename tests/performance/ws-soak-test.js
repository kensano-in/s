import ws from 'k6/ws';
import { check } from 'k6';
import { Rate, Counter } from 'k6/metrics';

// Track SLO metrics
const wsDropRate = new Rate('ws_drop_rate');
const msgDropRate = new Rate('message_drop_rate');
const msgDupRate = new Rate('message_duplicate_rate');
const msgsSent = new Counter('messages_sent');
const msgsReceived = new Counter('messages_received');

export const options = {
  stages: [
    { duration: '5m', target: 200 },   // Ramp to 200 persistent WS connections
    { duration: '30m', target: 200 },  // Soak test: sustain for 30 mins
    { duration: '5m', target: 0 },     // Tear down
  ],
  thresholds: {
    // SLO: WS drop rate < 0.1%
    ws_drop_rate: ['rate<0.001'],
    message_drop_rate: ['rate<0.0001'],
    message_duplicate_rate: ['rate<0.0001']
  },
};

export default function () {
  const url = __ENV.WS_URL || 'ws://localhost:3001/socket.io/?EIO=4&transport=websocket';
  const params = { tags: { type: 'soak_test' } };

  const res = ws.connect(url, params, function (socket) {
    let sentSeq = 0;
    const receivedSeqs = new Set();
    
    socket.on('open', function () {
      // Periodic heartbeat ping to maintain connection (if required by custom server)
      // socket.setInterval(function timeout() { socket.ping(); }, 25000);

      // Simulate sending a message periodically
      socket.setInterval(function timeout() {
        sentSeq++;
        const msg = JSON.stringify({ 
          event: 'message:send', 
          payload: { id: `msg_${__VU}_${sentSeq}`, content: 'Soak test heartbeat', conversation_id: 'soak-conv' } 
        });
        socket.send(msg);
        msgsSent.add(1);
      }, 10000); // Send one message every 10 seconds per user
    });

    socket.on('message', function (data) {
      try {
        const parsed = JSON.parse(data);
        if (parsed.event === 'message:ack' || parsed.event === 'message:new') {
          msgsReceived.add(1);
          const msgId = parsed.payload.id;
          
          if (receivedSeqs.has(msgId)) {
            msgDupRate.add(1); // Detected duplicate delivery
          } else {
            msgDupRate.add(0);
            receivedSeqs.add(msgId);
          }
        }
      } catch (e) {
        // Ignore non-JSON or engine.io control messages (like "0", "2", "3")
      }
    });

    socket.on('error', function (e) {
      wsDropRate.add(1);
      console.log('WS Error: ', e.error());
    });

    socket.on('close', function (e) {
      if (e !== 1000 && e !== 1001) { // 1000 Normal Closure, 1001 Going Away
         wsDropRate.add(1);
      } else {
         wsDropRate.add(0);
      }
    });

    // Enforce test duration for this socket
    socket.setTimeout(function () {
      socket.close();
    }, 1800000); // 30 minutes in milliseconds
  });

  check(res, { 'WS connected (status 101)': (r) => r && r.status === 101 }) || wsDropRate.add(1);
}
