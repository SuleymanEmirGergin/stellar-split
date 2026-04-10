# Real-Time Playbook

This playbook guides the Backend Integrator Agent when implementing real-time communication features derived from frontend UX patterns.

---

## 1. What to Infer From Frontend

Identify these UI elements that require real-time capabilities:

- **Live notifications / toast alerts**: "You have a new message" without page refresh.
- **Chat / messaging UI**: Message bubbles appearing in real-time.
- **Collaborative editing**: Multiple users editing the same document simultaneously.
- **Live dashboards**: Metrics, order counts, active users updating without refresh.
- **Progress indicators**: File upload progress, job processing status.
- **Online presence**: "3 users viewing this page", green dot indicators.
- **Live order tracking**: Delivery status updates.
- **Auction / bidding**: Price updates in real-time.
- **Notification bell with count badge**: Unread count updated without polling.
- **"Is typing..." indicator**: Chat typing state.

---

## 2. Real-Time Strategy Selection

Choose based on communication direction and complexity:

| Strategy | Direction | Use When |
|---|---|---|
| **Short Polling** | Client → Server (repeated) | Simple, low frequency, minimal infra |
| **Long Polling** | Client → Server (held open) | Moderate frequency, no WebSocket support |
| **Server-Sent Events (SSE)** | Server → Client (one-way) | Notifications, live feeds, progress updates |
| **WebSocket** | Bidirectional | Chat, collaboration, presence, live cursors |
| **WebRTC** | Peer-to-peer | Video/audio, low-latency data transfer |

### Decision Tree

```
Does the client need to SEND data in real-time?
  Yes → WebSocket
  No → Does it need to RECEIVE updates from server?
         Yes → Is update frequency > once per 10 seconds?
                  Yes → SSE (or WebSocket)
                  No  → Short Polling is fine
```

---

## 3. Strategy Deep-Dive

### A. Short Polling (Simplest)

```typescript
// Client polls every 5 seconds
setInterval(() => {
  fetch('/api/notifications/unread-count')
    .then(r => r.json())
    .then(({ count }) => updateBadge(count))
}, 5000)
```

**Backend**: Standard REST endpoint — no special infrastructure.
**Good for**: Notification badge count, page view counter, low-urgency updates.
**Bad for**: Chat, presence, anything needing < 1s latency.

---

### B. Server-Sent Events (SSE)

Best for one-way server-to-client pushes. Natively reconnects, works through HTTP/2.

```typescript
// NestJS SSE endpoint
@Sse('notifications/stream')
@UseGuards(JwtAuthGuard)
notifications(@Request() req): Observable<MessageEvent> {
  return this.notificationsService
    .getStream(req.user.id)
    .pipe(map(notification => ({ data: notification })))
}
```

```typescript
// Express SSE endpoint
app.get('/notifications/stream', requireAuth, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  const sendEvent = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  // Subscribe to Redis pub/sub for this user
  const unsub = notificationBus.subscribe(req.user.id, sendEvent)
  req.on('close', () => unsub())
})
```

**Good for**: Notifications, live feeds, job progress, order status.

---

### C. WebSocket (Bidirectional)

Use [Socket.IO](https://socket.io) for automatic fallback and room management:

#### NestJS Gateway

```typescript
@WebSocketGateway({ cors: { origin: process.env.FRONTEND_URL } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server

  async handleConnection(client: Socket) {
    const user = await this.authService.validateSocketToken(client.handshake.auth.token)
    if (!user) return client.disconnect()
    client.data.user = user
    client.join(`user:${user.id}`)
  }

  handleDisconnect(client: Socket) {
    // cleanup presence, notify others
  }

  @SubscribeMessage('chat:send')
  async handleMessage(client: Socket, payload: SendMessageDto) {
    const message = await this.chatService.createMessage(payload)
    // Broadcast to room
    this.server.to(`room:${payload.roomId}`).emit('chat:message', message)
  }
}
```

#### Emit to User from Anywhere (Server Push)

```typescript
// From any service, push to a specific user
this.server.to(`user:${userId}`).emit('notification', notificationPayload)
```

---

## 4. Event Naming Convention

Use namespaced event names for clarity:

```
{domain}:{action}

Examples:
  chat:message          ← new chat message
  chat:typing           ← typing indicator start/stop
  notification:new      ← new notification
  order:status-updated  ← order status changed
  presence:online       ← user came online
  presence:offline      ← user went offline
  job:progress          ← background job progress update
  job:completed         ← job finished
```

---

## 5. Scaling Real-Time (Multi-Instance)

A single WebSocket connection is tied to one server instance. For multi-instance deployments, use a Redis pub/sub adapter:

```typescript
// Socket.IO with Redis adapter
import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'redis'

const pubClient = createClient({ url: process.env.REDIS_URL })
const subClient = pubClient.duplicate()
await Promise.all([pubClient.connect(), subClient.connect()])

io.adapter(createAdapter(pubClient, subClient))
```

Now `io.to('room:xyz').emit(...)` works correctly even when users are connected to different instances.

---

## 6. Presence System

Track who is online:

```typescript
// On connect
await redis.sadd(`presence:org:${orgId}`, userId)
await redis.expire(`presence:org:${orgId}`, 86400)

// On disconnect
await redis.srem(`presence:org:${orgId}`, userId)

// Get online users
const onlineUserIds = await redis.smembers(`presence:org:${orgId}`)
```

---

## 7. Job Progress via SSE

For file exports, imports, or any long-running background job:

```typescript
// Worker emits progress events via Redis
await redis.publish(`job:progress:${jobId}`, JSON.stringify({ percent: 45, status: 'processing' }))

// SSE endpoint subscribes and forwards to client
app.get('/jobs/:jobId/progress', requireAuth, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  // ... SSE setup ...

  const sub = redis.duplicate()
  await sub.subscribe(`job:progress:${req.params.jobId}`, (message) => {
    res.write(`data: ${message}\n\n`)
  })

  req.on('close', () => sub.quit())
})
```

---

## 8. Security Rules

- **Authenticate on connect** — validate JWT in `handshake.auth.token`, disconnect if invalid.
- **Room authorization** — verify user has access to the room they try to join.
- **Rate limit events** — limit how fast clients can send events (e.g., chat:send max 5/s).
- **Sanitize event payloads** — validate all incoming event data with Zod/class-validator.
- **Never trust client-sent roomIds** — always resolve room membership server-side.

---

## 9. Environment Variables

```bash
# Redis pub/sub adapter
REDIS_URL=redis://localhost:6379

# WebSocket config
WS_CORS_ORIGIN=https://yourapp.com
WS_MAX_PAYLOAD_BYTES=65536         # 64KB max event payload

# SSE
SSE_HEARTBEAT_INTERVAL_MS=30000    # keep connection alive
```

---

## 10. File Structure

```
src/
  realtime/
    realtime.module.ts
    gateways/
      chat.gateway.ts
      notifications.gateway.ts
      presence.gateway.ts
    sse/
      job-progress.sse.ts
      notifications.sse.ts
    adapters/
      redis-pubsub.adapter.ts      ← Multi-instance pub/sub
    helpers/
      presence.helper.ts
      room-auth.helper.ts
```
