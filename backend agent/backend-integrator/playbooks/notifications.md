# Notifications & Messaging Playbook

This playbook guides the Backend Integrator Agent when implementing notification and messaging systems derived from frontend UI flows.

---

## 1. What to Infer From Frontend

Identify these UI elements to determine the scope of the notification system:

- **Notification Bell / Badge**: Implies in-app notification feed and unread count endpoint.
- **Email Confirmations**: Registration, password reset, order confirmation → transactional emails.
- **SMS / OTP**: Phone verification, 2FA → SMS provider integration.
- **Push Notifications**: Mobile or browser push → FCM / APNs / Web Push.
- **"Notify me" toggles**: User notification preference management.
- **Activity Feed / Inbox**: Implies a stored notification entity with read/unread state.
- **Broadcast Announcements**: Admin sends a message to all users → bulk notification job.

---

## 2. Required Backend Entities

```
Notification
  - id
  - user_id
  - type: email | sms | push | in-app
  - title
  - body
  - data (JSON — metadata for deep links, actions)
  - read_at (nullable)
  - sent_at (nullable)
  - created_at

NotificationPreference
  - id
  - user_id
  - channel: email | sms | push | in-app
  - event_type (e.g., "order_placed", "invite_received")
  - enabled: boolean
```

---

## 3. Required API Endpoints

### In-App Notifications
- `GET /notifications` — Paginated list for current user (filter: unread)
- `PATCH /notifications/:id/read` — Mark single notification as read
- `PATCH /notifications/read-all` — Mark all as read
- `DELETE /notifications/:id` — Delete a notification

### Preferences
- `GET /notifications/preferences` — Fetch user's notification preferences
- `PATCH /notifications/preferences` — Update preferences per channel/event

### Admin (if applicable)
- `POST /admin/notifications/broadcast` — Send notification to all or a segment of users

---

## 4. Channel Adapter Strategy

Always isolate notification providers behind adapters:

```
notificationService → emailAdapter (SendGrid / Resend)
                    → smsAdapter (Twilio / Vonage)
                    → pushAdapter (FCM / APNs)
                    → inAppAdapter (database write)
```

### Adapter Interface

```typescript
interface NotificationAdapter {
  send(payload: NotificationPayload): Promise<void>
}

interface NotificationPayload {
  to: string         // email address, phone, device token
  subject?: string   // for email
  body: string
  data?: Record<string, unknown>
}
```

---

## 5. Background Delivery (Queue-Based)

All notifications must be sent via a background queue — **never** in the request-response cycle.

Flow:
```
API Request → enqueue notification job → return 200 immediately
Worker → process job → call provider adapter → log result
```

### Job Retry Strategy
- Retry up to 3 times with exponential backoff.
- After all retries fail → move to Dead Letter Queue (DLQ).
- DLQ items should trigger an alert to ops team.

### Queue Structure
```
queues/
  notification.queue.ts    — email, push, sms jobs
  broadcast.queue.ts       — bulk/broadcast jobs (lower priority)
```

---

## 6. Preference Gating

Before sending any notification, check preferences:

```
1. Does the user have a preference record for this event + channel?
2. If yes and enabled=false → skip sending.
3. If no record exists → use default (enabled=true).
```

---

## 7. Transactional vs Marketing

Always classify notifications:

| Type | Example | Provider Behavior |
|---|---|---|
| Transactional | Order confirmation, OTP | Must be delivered reliably |
| Marketing | Promotions, newsletters | Respect unsubscribe lists |

Use separate sender domains/IDs for each type to protect deliverability.

---

## 8. Environment Variables

```bash
# Email
EMAIL_PROVIDER=sendgrid              # sendgrid | resend | smtp
SENDGRID_API_KEY=your_key
EMAIL_FROM=no-reply@yourapp.com

# SMS
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_FROM_NUMBER=+1234567890

# Push (Firebase)
FCM_SERVER_KEY=your_key
FCM_PROJECT_ID=your_project

# Queue
REDIS_URL=redis://localhost:6379
NOTIFICATION_QUEUE_NAME=notifications
BROADCAST_QUEUE_NAME=broadcasts
```

---

## 9. File Structure

```
src/
  notifications/
    notifications.controller.ts
    notifications.service.ts
    notifications.module.ts
    notifications.queue.ts
    dto/
      create-notification.dto.ts
      update-preference.dto.ts
    adapters/
      notification.adapter.interface.ts
      email.adapter.ts
      sms.adapter.ts
      push.adapter.ts
    entities/
      notification.entity.ts
      notification-preference.entity.ts
    workers/
      notification.worker.ts
      broadcast.worker.ts
```
