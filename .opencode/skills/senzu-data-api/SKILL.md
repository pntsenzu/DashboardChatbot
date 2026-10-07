---
name: senzu-data-api
description: Guidelines and documentation for calling Senzu Data API via RPC for Chatbot Dashboard.
---

# Senzu Data API — Instructions & Reference

## Overview
All dashboard data (messages, conversations, customers, products, bot status) is fetched through a single endpoint:
`POST https://api-bot.senzu-base.vn/rpc`

## Protocol
- **Endpoint**: `POST https://api-bot.senzu-base.vn/rpc`
- **Health Check**: `GET https://api-bot.senzu-base.vn/health` -> `{"ok":true}`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <DATA_API_TOKEN>`
- **Request Body**: `{ "fn": "<function_name>", "args": [...] }`
- **Response**: `{ "result": ... }`
- **CORS**: Not enabled on Data API. Browser MUST call via Next.js backend (Server Components, Route Handlers, or Server Actions). Never call Data API directly from client components.

## Environment Variables
- `DATA_API_URL=https://api-bot.senzu-base.vn`
- `DATA_API_TOKEN` (provided by Senzu admin via secure channel, 32+ hex string)
- `AUTH_SECRET` (generated via `openssl rand -base64 32`)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (OAuth Client for `@senzu.co.jp` users)

## Whitelisted Function Categories (37 Functions)
1. **Overview & System**: `getPeriodStats`, `getDailyPerformanceTrend`, `getAiInsightCounts`, `getCustomersPerBucket`, `getAttentionItems`, `getRecentConversations`, `getOpenAttentionCount`, `getSystemStatus`.
2. **Volume & Performance**: `getVolume`, `getHeatmap`, `getTopCustomers`, `getCustomerSummary`, `getResponseLatency`, `getRecentMessages`.
3. **Conversations**: `getConversations`, `getConversationMessages`, `getConversationProcessing`, `getConversationAttention`.
4. **Customers**: `getCustomersWithInterest`, `getAllCustomers`, `getTotalCustomersLifetime`, `getCustomerActivityStats`, `getCustomerActivityTrend`, `getConversationVolumeTrend`, `getInterestSignalsTrend`, `getOpenAttentionItems`, `getCustomerDetail`, `getCustomerConversations`, `getCustomerInterests`, `getCustomerPurchaseSignal`, `getCustomerOpenAttention`, `getCustomerNotes`, `insertCustomerNote` (Write action).
5. **Products**: `getTopProducts`, `getProductQuestionBreakdown`, `getProductMentionSummary`, `getUnknownProductMentions`.

## Data Conventions
- **Timestamps**: All `*Ms` fields and parameters (`sinceMs`, `untilMs`, `timestampMs`) are Unix epoch milliseconds in UTC.
- **Buckets**: `bucket` and `date` strings use Vietnam timezone (UTC+7): `"YYYY-MM-DD"` or `"YYYY-MM-DD HH:00"`.
- **Ratios**: `repliedRatio` and `unresolvedRate` are 0-1 range. Multiply by 100 for percentages.
- **IDs**: `customerId` = `senderId` (Facebook user ID string). `conversationId` = `threadId`.
- **Bot Heartbeat**: Check `getSystemStatus().isStale` (true if last tick > 30s ago -> bot offline).

## Implementation Example (TypeScript Server Client)
```typescript
import "server-only";

export async function rpc<T>(fn: string, ...args: unknown[]): Promise<T> {
  const url = process.env.DATA_API_URL || "https://api-bot.senzu-base.vn";
  const token = process.env.DATA_API_TOKEN;
  
  if (!token) {
    // Fallback to mock data generator for dev/preview
    return getMockData<T>(fn, args);
  }

  const res = await fetch(`${url}/rpc`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fn, args }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Data API ${fn} HTTP ${res.status}: ${errorText}`);
  }

  const json = await res.json() as { result: T };
  return json.result;
}
```
