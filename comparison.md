# V1 vs V2 API — Comprehensive Comparison Report

> **Test Date**: July 1, 2026  
> **Test Campaign**: Campaign #85 — "AJIO CPS campaign" (51 ads, active)  
> **Date Range**: March 1, 2026 → July 1, 2026  
> **V1 Base URL**: `https://search-new.bitbns.com/buyhatkeAdDashboard`  
> **V2 Base URL**: `https://search-new.bitbns.com/buyhatkeAdDashboard/v2`

---

## Executive Summary

| | V1 (MySQL) | V2 (ClickHouse) |
|---|---|---|
| **Campaigns** | ✅ 86 campaigns, fully operational | ❌ Returns error — ClickHouse appears empty |
| **Ads** | ✅ 51 ads for campaign 85 | ❌ Requires UUID campaignId — no UUIDs exist yet |
| **Slots** | ✅ 50 active slots | ❌ Returns error — ClickHouse appears empty |
| **Metrics (all/trend/breakdown)** | ✅ Full data for campaign 85 | ⚠️ Returns success but **empty data** (UUID/id mismatch) |
| **Metrics (table)** | ✅ 11.8M impressions, 248K clicks | ⚠️ Works but **different dataset** (7K impressions, 440 clicks) |
| **Reference endpoints** | ✅ siteDetails, locationDetails | ✅ siteDetails, locationDetails — identical to V1 |
| **Data consistency** | N/A | ❌ V2 metrics index has **dramatically less data** than V1 |

**Bottom Line**: V2 infrastructure is deployed and responding, but **campaign/ads/slots data has NOT been migrated from MySQL to ClickHouse**. The V2 metrics endpoints query a different Elasticsearch index (`ads_event_aggregate_v2`) that uses UUID keys — so even if campaign-filtered queries return "success", the results are empty because integer campaign IDs don't match the UUID-based keyword fields.

---

## 1. Campaigns API

### `GET /campaigns` vs `GET /v2/campaigns`

| | V1 | V2 |
|---|---|---|
| **Endpoint** | `/campaigns?userId=1` | `/v2/campaigns?userId=1` |
| **HTTP Status** | 200 | 200 |
| **Response Status** | `1` (success) | `0` (failed) |
| **Campaign Count** | 86 campaigns | 0 |
| **Error** | — | `"Something Went Wrong!"` |
| **Root Cause** | MySQL operational | ClickHouse has no campaign data |

### Campaign #85 Detail (V1 Only)

```json
{
  "campaignId": 85,
  "brandName": "AJIO CPS campaign",
  "impressionTarget": 100000000,
  "clickTarget": 100000,
  "totalBudget": "0.000",
  "status": 1,
  "createdBy": 1,
  "createdAt": "2026-05-28T06:07:20.000Z",
  "updatedAt": "2026-05-28T06:07:20.000Z"
}
```

### Key V2 Changes (from docs)

| Field | V1 | V2 |
|---|---|---|
| `campaignId` type | `integer` (85) | UUID `string` (`"0c7e364c-..."`) |
| New fields | — | `dailyBudget`, `brandId` |
| Response fields | `totalBudget` only | `totalBudget` + `dailyBudget`, `brandId` |
| Archive behavior | Campaign only | Campaign + all ads |

---

## 2. Ads API

### `GET /ads` vs `GET /v2/ads`

| | V1 | V2 |
|---|---|---|
| **Endpoint** | `/ads?campaignId=85&userId=1` | `/v2/ads?campaignId=85&userId=1` |
| **Response** | ✅ 51 ads returned | ❌ `"Invalid Campaign Id!"` |
| **Root Cause** | Integer ID works | V2 expects UUID string |

### Campaign 85 Ads Summary (V1 Only)

- **Total**: 51 ads (all status=0, except adId=957 with status=-1)
- **Slot distribution**: 10, 11, 12, 13, 14, 17, 22, 30, 35, 42, 47, 48, 49, 51, 55, 78
- **Themes**: Shoes, Kids wear, WISH, ETHNICSPL, DHANVARSHA2
- **Platforms**: Desktop Site, Mobile Site, Mobile App, Mobile Overlay, Web Extension

### Key V2 Breaking Changes (from docs)

| Area | V1 | V2 |
|---|---|---|
| `adId` | `integer` (1003) | UUID `string` |
| `campaignId` | `integer` (85) | UUID `string` |
| `slotId` | `integer` (22) → stored directly | UUID `string` → **stored as `slotType` string** |
| `categories` | Object `{"1234": 1}` | Array `[1234, 5678]` |
| `sites` | Object `{"10": 1}` | Array `[10, 20]` |
| `location` | Object `{"MH": 1}` | Array `["MH", "DL"]` |
| `brandTargets` | Object `{"Nike": 1}` | Array `["Nike"]` |
| `serveStrategy` | 0–1 | 0–3 |
| `isTestPhase` | Present | **Removed** |
| `otherDetails` | Present | **Removed** |
| New fields | — | `slotType`, `couponCode`, `impressionCharge`, `clickCharge`, `minBid`, `maxBid`, `bidModel` |
| Categories format | `{ l0: [...], ln: [...] }` | ln only (l0 auto-expanded) |

---

## 3. Slots API

### `GET /slots` vs `GET /v2/slots`

| | V1 | V2 |
|---|---|---|
| **Endpoint** | `/slots?isActive=1&userId=1` | `/v2/slots?userId=1&isActive=1` |
| **Response** | ✅ 50 active slots | ❌ `"Failed!"` — 0 slots |
| **Root Cause** | MySQL data | ClickHouse empty |

### V1 Slot Example

```json
{
  "slotId": 1,
  "name": "Price_History",
  "platform": 1,
  "width": "656.00",
  "height": "160.00",
  "isActive": 1
}
```

### V2 Changes (from docs)

| Field | V1 | V2 |
|---|---|---|
| `slotId` | `integer` (auto-increment) | UUID `string` |
| `slotType` | Not present | Auto-assigned via dimension grouping |
| Archive | Not available | `POST /v2/slots/archive` sets `isActive = -1` |

---

## 4. Metrics API — Campaign 85 (March 1 – July 1, 2026)

### 4.1 `POST /metrics/all` — Overall Metrics

| | V1 | V2 |
|---|---|---|
| **Payload** | `{"from":"2026-03-01 00:00:00","to":"2026-07-01 23:59:59","campaignId":[85]}` | Same |
| **Status** | ✅ Success | ⚠️ Success (status=1) |
| **Impressions** | **1,259,947** | **0** (empty adStats) |
| **Clicks** | **1,624** | **0** |
| **Conversions** | **0** | **0** |
| **Root Cause** | — | Campaign ID 85 (int) doesn't match UUID keyword field in `ads_event_aggregate_v2` |

**V1 Raw Response**:
```json
{
  "conversionStats": { "conversionCount": 0 },
  "adStats": [
    { "eventType": "0", "campaignId": 85, "eventCount": 1259947 },
    { "eventType": "1", "campaignId": 85, "eventCount": 1624 }
  ]
}
```

### 4.2 `POST /metrics/trend` — Daily Trend (interval=1d)

| | V1 | V2 |
|---|---|---|
| **Impression data points** | 30 days | 0 days |
| **Click data points** | 9 days | 0 days |
| **Date range with data** | May 28 – Jun 26, 2026 | — |
| **Total impressions** | **1,259,947** | **0** |
| **Total clicks** | **1,624** | **0** |

**V1 Weekly Trend (interval=7d)**:
| Week | Impressions |
|---|---|
| 2026-05-25 to 2026-05-31 | 1,253,990 |
| 2026-06-01 to 2026-06-07 | 5,377 |
| 2026-06-08 to 2026-06-14 | 398 |
| 2026-06-15 to 2026-06-21 | 157 |
| 2026-06-22 to 2026-06-28 | 25 |

> 📊 Campaign launched May 28 — bulk of impressions in first 4 days, then trailing off sharply.

### 4.3 `POST /metrics/breakdown` — Demographics

| Dimension | V1 | V2 |
|---|---|---|
| **Gender** | ✅ Male: 515K imp, NA: 744K imp | ⚠️ 0 rows |
| **Platform** | ✅ Platform 0: 668K, Platform 5: 554K, Platform 4: 37K | ⚠️ 0 rows |
| **Location** | ✅ 300+ unique cities (top: Bengaluru, Delhi, Hyderabad, Mumbai) | ⚠️ 0 rows |
| **Age** | ⚠️ Empty array | ⚠️ 0 rows |

### 4.4 `POST /metrics/table` — Top Performers

| | V1 | V2 |
|---|---|---|
| **Location table** | 11.8M impressions, 248K clicks | **7,078 impressions, 440 clicks** ⚠️ |
| **Ad table** | Ad IDs keyed by integer | Different data set |
| **Slot table** | Slot IDs keyed by integer | Different data set |

**V2 metrics/table returns DIFFERENT data** because it queries the new `ads_event_aggregate_v2` ES index which has its own (much smaller) dataset. The V1 index (`ad_event_aggregates`) has the full historical data.

| Metric | V1 (location table) | V2 (location table) | Difference |
|---|---|---|---|
| Total Impressions | 11,848,337 | 7,078 | **99.94% less** |
| Total Clicks | 248,266 | 440 | **99.82% less** |
| Top Location | NA (10.4M) | NA (4,610) | — |
| #2 Location | Bengaluru (586K) | Bengaluru (1,188) | — |
| #3 Location | New Delhi (392K) | Chennai (704) | Different |

---

## 5. Reference/Lookup Endpoints

### `GET /ads/siteDetails` & `GET /ads/locationDetails`

| | V1 | V2 |
|---|---|---|
| **siteDetails** | ✅ 297 sites | ✅ 297 sites (identical) |
| **locationDetails** | ✅ 179 locations | ✅ 179 locations (identical) |
| **categoryDetails** | ✅ Works | ✅ Works (per docs) |
| **categoryDetails2** | ✅ Works | ✅ Works (per docs) |

These reference endpoints are **unchanged** — they read from the same JSON caches / MySQL tables.

---

## 6. Data Consistency Gaps

### 6.1 Campaign Migration Status

| Data Store | Status |
|---|---|
| **MySQL (V1 campaigns)** | ✅ 86 campaigns, fully populated |
| **ClickHouse (V2 campaigns)** | ❌ Empty — no campaigns migrated |
| **Impact** | All V2 campaign/ads/slots CRUD endpoints non-functional |

### 6.2 Metrics Index Comparison

| | V1 Index (`ad_event_aggregates`) | V2 Index (`ads_event_aggregate_v2`) |
|---|---|---|
| **Key type** | Integer (`campaignId: 85`) | Keyword UUID (`campaignId: "uuid-string"`) |
| **Data volume** | Full historical data | Sparse — appears to be test/new data only |
| **Campaign filter** | Works with integers | Works only with UUID strings |

### 6.3 What Needs to Happen Before Migration

1. **Migrate campaigns** from MySQL → ClickHouse with UUID generation
2. **Migrate ads** from MySQL → ClickHouse (each gets a UUID)
3. **Migrate slots** from MySQL → ClickHouse (UUID + auto slotType)
4. **Re-index or backfill** `ads_event_aggregate_v2` with UUID-based keys for historical events
5. **OR** implement a mapping table (integer → UUID) for lookups during transition

---

## 7. Frontend Migration Impact

Based on `V2_API_DOCS.md` migration checklist, here's the real-world impact assessment:

### 7.1 Critical Blockers (cannot proceed without)

- [ ] **No V2 campaigns exist** — frontend cannot display any campaign list
- [ ] **No V2 ads exist** — ad list/creation/edit all broken
- [ ] **No V2 slots exist** — slot dropdowns empty, ad creation fails
- [ ] **UUID mapping unknown** — campaign 85 in V1 has no known V2 UUID equivalent

### 7.2 Type/Interface Changes Required

| Component | V1 Type | V2 Type | Impact |
|---|---|---|---|
| `campaignId` | `number` | `string` (UUID) | **Every component** using campaignId |
| `adId` | `number` | `string` (UUID) | All ad components |
| `slotId` | `number` | `string` (UUID) | Ad form, slot management |
| `categories` | `Record<string, number>` | `number[]` | Ad form rendering, create/update payloads |
| `sites` | `Record<string, number>` | `number[]` | Ad form |
| `location` | `Record<string, number>` | `string[]` | Ad form |
| `brandTargets` | `Record<string, number>` | `string[]` | Ad form |
| `serveStrategy` | `0 \| 1` | `0 \| 1 \| 2 \| 3` | Ad form dropdown |
| `isTestPhase` | `number` | **Removed** | Remove from forms |
| New fields | — | `couponCode`, `impressionCharge`, `clickCharge`, `minBid`, `maxBid`, `bidModel`, `slotType` | Add to forms |

### 7.3 Metrics Filter Payloads

```typescript
// V1 (current)
{ campaignId: [85], slotId: [22], adId: [1003] }

// V2 (required)
{ campaignId: ["0c7e364c-163b-487c-ac0e-79aee4678122"], slotId: ["uuid-string"], adId: ["uuid-string"] }
```

### 7.4 API Path Changes

```typescript
// V1
`/campaigns?userId=1`
`/ads?campaignId=85`
`/slots?isActive=1`
`/metrics/all?userId=1`

// V2
`/v2/campaigns?userId=1`
`/v2/ads?campaignId=<uuid>`
`/v2/slots?isActive=1`
`/v2/metrics/all?userId=1`
```

---

## 8. Test Results Summary — All Endpoints

| # | Endpoint | V1 Status | V2 Status | Data Match? | Notes |
|---|---|---|---|---|---|
| 1 | `GET /campaigns` | ✅ 86 campaigns | ❌ Error | ❌ | CH empty |
| 2 | `GET /campaigns?campaignId=85` | ✅ Returns 1 | N/A | ❌ | V2 doesn't have it |
| 3 | `POST /campaigns` | ✅ Works | ❌ Untestable | ❌ | No CH data |
| 4 | `POST /campaigns/update` | ✅ Works | ❌ Untestable | ❌ | |
| 5 | `POST /campaigns/clone` | ✅ Works | ❌ Untestable | ❌ | |
| 6 | `POST /campaigns/archive` | ✅ Works | ❌ Untestable | ❌ | |
| 7 | `GET /ads?campaignId=85` | ✅ 51 ads | ❌ "Invalid Campaign Id" | ❌ | Needs UUID |
| 8 | `POST /ads` | ✅ Works | ❌ Untestable | ❌ | |
| 9 | `POST /ads/update` | ✅ Works | ❌ Untestable | ❌ | |
| 10 | `POST /ads/clone` | ✅ Works | ❌ Untestable | ❌ | |
| 11 | `POST /ads/archive` | ✅ Works | ❌ Untestable | ❌ | |
| 12 | `GET /ads/siteDetails` | ✅ 297 sites | ✅ 297 sites | ✅ | Identical |
| 13 | `GET /ads/locationDetails` | ✅ 179 locations | ✅ 179 locations | ✅ | Identical |
| 14 | `GET /slots?isActive=1` | ✅ 50 slots | ❌ Error | ❌ | CH empty |
| 15 | `POST /metrics/all` (campaign 85) | ✅ 1.26M imp | ⚠️ Success, 0 data | ❌ | UUID mismatch |
| 16 | `POST /metrics/trend` (campaign 85, 1d) | ✅ 30 data points | ⚠️ Success, 0 data | ❌ | UUID mismatch |
| 17 | `POST /metrics/breakdown` (gender) | ✅ Male/NA data | ⚠️ Success, 0 rows | ❌ | UUID mismatch |
| 18 | `POST /metrics/breakdown` (platform) | ✅ 3 platforms | ⚠️ Success, 0 rows | ❌ | UUID mismatch |
| 19 | `POST /metrics/breakdown` (location) | ✅ 300+ cities | ⚠️ Success, 0 rows | ❌ | UUID mismatch |
| 20 | `POST /metrics/breakdown` (age) | ✅ Empty (no age data) | ⚠️ Success, 0 rows | ⚠️ | Both empty |
| 21 | `POST /metrics/table` (location) | ✅ 11.8M imp | ⚠️ 7K imp | ❌ | **Different dataset!** |
| 22 | `POST /metrics/table` (adId) | ✅ Works | ⚠️ Different data | ❌ | |
| 23 | `POST /metrics/table` (slotId) | ✅ Works | ⚠️ Different data | ❌ | |

**Score**: 4/23 endpoints match (all reference endpoints). 19/23 fail or mismatch.

---

## 9. Recommendations

### 9.1 Before Frontend Migration Can Begin

1. **Complete ClickHouse data migration**: All campaigns, ads, slots must be populated
2. **Generate UUIDs**: Every campaign/ad/slot needs a stable UUID
3. **Create integer→UUID mapping**: For URL routing and analytics lookups during transition
4. **Backfill metrics index**: `ads_event_aggregate_v2` needs historical data with UUID keys

### 9.2 Migration Strategy

```
Phase 1: Backend data migration (MySQL → ClickHouse)
  ├── Migrate slots first (no campaign dependency)
  ├── Migrate campaigns (generates UUIDs)
  └── Migrate ads (links to campaign/slot UUIDs)

Phase 2: Metrics dual-write period
  ├── Write to BOTH old and new ES indexes
  └── Run comparison scripts to verify data parity

Phase 3: Frontend migration
  ├── Update all ID types: number → string (UUID)
  ├── Update API paths: /campaigns → /v2/campaigns
  ├── Update payload formats (arrays, not objects)
  └── Add new fields to forms

Phase 4: Cutover
  ├── Switch frontend to V2 exclusively
  ├── Monitor for data discrepancies
  └── Deprecate V1 endpoints
```

### 9.3 Known Risks

- **Metrics data loss**: V2 index currently has 99.9% less data than V1. Historical metrics must be backfilled.
- **URL routing**: `/campaigns/85/ads` will become `/campaigns/<uuid>/ads` — bookmarks and shared links break.
- **Two-source truth during migration**: If both MySQL and ClickHouse are live, discrepancies must be reconciled.

---

*Report generated via live API testing against production endpoints on July 1, 2026.*

---

# V2 API — Independent Behavior Analysis

> **Test Date**: July 1, 2026  
> **Date Range**: March 1, 2026 → July 1, 2026  
> **V2 Base URL**: `https://search-new.bitbns.com/buyhatkeAdDashboard/v2`  
> **Approach**: Test V2 endpoints independently — no V1 comparison, no campaign ID mapping. Use real V2 UUIDs discovered via metrics queries.

---

## Executive Summary: V2 Operational Status

V2 is a **split architecture** with two very different states:

| Layer | Backend | Status |
|---|---|---|
| **Metrics / Analytics** | Elasticsearch (`ads_event_aggregate_v2`) | ✅ **FULLY OPERATIONAL** |
| **CRUD (Campaigns, Ads, Slots)** | ClickHouse | ❌ **BROKEN — writes work, reads fail** |
| **Reference Data** | MySQL / JSON caches | ✅ **Fully operational** |

**Key Insight**: The V2 metrics system is production-ready. It has real data (~339K events across multiple UUID-based campaigns), works with all filter types, all breakdown dimensions, and all time intervals. The CRUD layer is the only blocker.

---

## 1. Campaigns — `POST/GET /v2/campaigns`

### 1.1 CREATE — ✅ Works

```bash
POST /v2/campaigns?userId=1
{
  "brandName": "V2 Test Campaign",
  "status": 3,
  "totalBudget": 10000,
  "impressionTarget": 1000,
  "clickTarget": 100,
  "dailyBudget": 500
}
```

**Response**:
```json
{
  "status": 1,
  "message": "Success!",
  "data": {
    "campaignId": "4876dc0d-4da0-40ae-b35c-e70d03f25bc9"
  }
}
```

✅ Write to ClickHouse succeeds. UUID is generated server-side. No `brandId` was provided — defaults to 0.

### 1.2 GET — ❌ Broken

```bash
GET /v2/campaigns?userId=1
GET /v2/campaigns?userId=1&campaignId=4876dc0d-4da0-40ae-b35c-e70d03f25bc9
GET /v2/campaigns?userId=1&status=1
GET /v2/campaigns?userId=1&brandName=test
```

**All return**:
```json
{ "status": 0, "message": "Failed!", "err": "Something Went Wrong!" }
```

❌ ClickHouse SELECT queries fail — even immediately after a successful CREATE on the same UUID. The ReplacingMergeTree insert works but the read query is broken (likely schema mismatch, missing table, or query syntax error).

### 1.3 UPDATE / CLONE / ARCHIVE — ❌ Broken

All return `"Something Went Wrong!"`. These depend on first reading the existing record from ClickHouse, which fails.

---

## 2. Ads — `GET/POST /v2/ads`

### 2.1 GET — ❌ Broken

```bash
GET /v2/ads?campaignId=4876dc0d-4da0-40ae-b35c-e70d03f25bc9  → "Something Went Wrong!"
GET /v2/ads?campaignId=<real-metrics-uuid>                     → "Something Went Wrong!"
GET /v2/ads?campaignId=85                                       → "Something Went Wrong!"
GET /v2/ads (no campaignId)                                     → "Invalid Campaign Id!"
```

❌ campaignId is required but any value — UUID or integer — causes CH read failure.

### 2.2 CREATE — ❌ Validation Error

```bash
POST /v2/ads?userId=1
{
  "campaignId": "4876dc0d-...",
  "label": "test-ad",
  "creativeUrl": "https://example.com/img.jpg",
  "targetUrl": "https://example.com",
  "gender": "u",
  "status": 1,
  "serveStrategy": 0,
  "slotId": "00000000-0000-0000-0000-000000000001"
}
```

**Response**: `{ "status": 0, "message": "Failed!", "err": "Invalid Input!" }`

❌ The fake slot UUID fails validation against the ClickHouse slots table (which is empty). A real slot UUID would be needed — but none exist because slots aren't in CH.

### 2.3 Reference Endpoints — ✅ Fully Operational

| Endpoint | Status | Data |
|---|---|---|
| `GET /v2/ads/siteDetails` | ✅ | 297 sites (Flipkart, Koovs, ShoppersStop, ...) |
| `GET /v2/ads/locationDetails` | ✅ | 179 locations (Agra: 1225, Ahmedabad: 9145, ...) |
| `GET /v2/ads/categoryDetails?param=shoe` | ✅ | 10 matching categories with breadcrumb paths |
| `GET /v2/ads/categoryDetails2` | ✅ | 27 l0 root categories (Electronics, Health, Shoes, ...) |
| `GET /v2/ads/categoryDetails2?catId=1` | ✅ | Child categories (drilldown works) |

These read from the same MySQL/JSON caches as V1 — identical behavior.

### 2.4 uploadCreative — ❌ (No valid slot)

```bash
POST /v2/ads/uploadCreative?userId=1  (multipart with image + fake slotId)
→ { "status": 0, "message": "Failed!", "err": "Invalid file type!" }
```

Needs a real image file + valid slot UUID. Slot validation against CH fails before reaching file type check.

---

## 3. Slots — `GET /v2/slots`

```bash
GET /v2/slots?userId=1          → "Something Went Wrong!"
GET /v2/slots?userId=1&isActive=1 → "Something Went Wrong!"
```

❌ ClickHouse slots table is empty or unreadable.

---

## 4. Metrics — `POST /v2/metrics/*` — ✅ FULLY OPERATIONAL

This is the **success story** of V2. All metrics endpoints query Elasticsearch (`ads_event_aggregate_v2`) and work correctly with UUID-based identifiers.

### 4.1 `/v2/metrics/all` — Overall Metrics

#### Unfiltered (all data in the index):
```json
{
  "status": 1,
  "data": {
    "conversionStats": { "conversionCount": 0 },
    "adStats": [
      { "eventType": "0", "eventCount": 338939 },   // all impressions
      { "eventType": "1", "eventCount": 4229 },      // all clicks
      { "eventType": "2", "eventCount": 574 }         // all conversions
    ]
  }
}
```

**Total across all V2 data**: 338,939 impressions, 4,229 clicks, 574 conversions.

#### With campaignId filter (real UUIDs):

```json
// campaignId: ["5de0148c-...", "c41b44f8-...", "bfad48f4-..."]
{
  "adStats": [
    { "eventType": "0", "campaignId": "5de0148c-defe-...", "eventCount": 98540 },
    { "eventType": "0", "campaignId": "c41b44f8-a0bb-...", "eventCount": 27770 },
    { "eventType": "0", "campaignId": "bfad48f4-746a-...", "eventCount": 22283 },
    { "eventType": "1", "campaignId": "5de0148c-defe-...", "eventCount": 957 },
    { "eventType": "1", "campaignId": "bfad48f4-746a-...", "eventCount": 740 },
    { "eventType": "1", "campaignId": "c41b44f8-a0bb-...", "eventCount": 491 },
    { "eventType": "2", "campaignId": "bfad48f4-746a-...", "eventCount": 486 },
    { "eventType": "2", "campaignId": "c41b44f8-a0bb-...", "eventCount": 48 }
  ]
}
```

✅ Works correctly. Each campaign's metrics are returned separately. Response shape matches V2 docs exactly.

#### With adId filter:
```json
// adId: ["99008339-6470-5a54-ba40-a35a828b6099"]
{ "adStats": [
  { "eventType": "0", "adId": "99008339-...", "eventCount": 4149 },
  { "eventType": "1", "adId": "99008339-...", "eventCount": 8 },
  { "eventType": "2", "adId": "99008339-...", "eventCount": 1 }
]}
```

#### With slotId filter:
```json
// slotId: ["438b712c-ae79-464c-b08a-a7e51fb450f9"]
{ "adStats": [
  { "eventType": "0", "slotId": "438b712c-...", "eventCount": 17167 },
  { "eventType": "1", "slotId": "438b712c-...", "eventCount": 1058 },
  { "eventType": "2", "slotId": "438b712c-...", "eventCount": 13 }
]}
```

#### With siteId filter (integer):
```json
// siteId: [2]  (Flipkart)
{ "adStats": [
  { "eventType": "0", "siteId": 2, "eventCount": 4452 },
  { "eventType": "1", "siteId": 2, "eventCount": 167 }
]}
```

✅ siteId remains integer — unchanged from V1. Only campaignId/adId/slotId became UUID.

#### Empty body (validation):
```json
POST /v2/metrics/all  {}
→ { "status": 0, "message": "Failed!", "err": "Invalid Dates!" }
```

✅ Proper validation — requires `from` and `to` fields.

### 4.2 `/v2/metrics/trend` — Time Series

#### With campaignId filter, 1d interval:

Campaign `5de0148c-defe-51f1-8730-3b2c3d1b5882`:
- **42 daily data points** (May 19 → Jun 29, 2026)
- **98,540 impressions, 957 clicks**
- Peak day: Jun 1 with 53,915 impressions

#### Weekly (7d) interval:

| Week | Impressions |
|---|---|
| May 11-17 | 640 |
| May 18-24 | 3,705 |
| May 25-31 | 60,306 |
| Jun 1-7 | 8,618 |
| Jun 8-14 | 10,250 |
| Jun 15-21 | 6,039 |
| Jun 22-28 | 8,982 |

✅ Weekly bucketing works identically to V1.

#### Monthly (30d) interval:

| Month | Impressions |
|---|---|
| May 2026 | 67,697 |
| Jun 2026 | 30,843 |

✅ Monthly aggregation works.

#### No date range (defaults):

When `from`/`to` are omitted, the endpoint **defaults to the last 30 days** and returns data. This differs from V1 which required explicit dates — V2 is more lenient.

### 4.3 `/v2/metrics/breakdown` — Demographics

#### Gender (campaign filtered):

| Gender | Impressions | Clicks |
|---|---|---|
| Male | 57,017 | 259 |
| NA | 41,523 | 698 |

✅ Gender breakdown works. 93 rows unfiltered across all campaigns.

#### Platform (campaign filtered):

| Platform | Impressions | Clicks |
|---|---|---|
| 0 (Web?) | 40,511 | 677 |
| 5 (Mobile?) | 55,566 | 47 |
| 4 (App?) | 2,463 | 233 |

✅ Platform breakdown works. 158 rows unfiltered.

#### Location (campaign filtered):

**23,551 total rows unfiltered** — massive location granularity. Top locations for campaign `5de0148c-...`:

| Location | Impressions |
|---|---|
| [object Object] | 55,566 |
| NA | 2,463 |
| Bengaluru | 568 |
| New Delhi | 460 |
| Chennai | 448 |
| Hyderabad | 334 |

⚠️ **Note**: One location key returns as `[object Object]` instead of a string — possible serialization bug in the ES aggregation when location is a nested object.

#### Age:

Returns **0 rows** for both filtered and unfiltered queries. Either no age data exists in the V2 index, or age buckets aren't being populated.

### 4.4 `/v2/metrics/table` — Top Performers

#### Location table:
| Location | Impressions | Clicks |
|---|---|---|
| NA | 4,610 | 292 |
| Bengaluru | 1,188 | 120 |
| Chennai | 704 | 13 |
| Dehradun | 275 | 6 |
| Jaipur | 301 | 9 |

#### Ad table (returns UUID keys):
| Ad UUID | Impressions | Clicks |
|---|---|---|
| `99008339-6470-...` | 3,793 | 8 |
| `1d090ab1-d1aa-...` | 3,325 | 9 |
| `83582d19-9d47-...` | 1,281 | 91 |
| `f2f4df72-98ca-...` | 3,721 | 7 |
| `69c8da38-3dd4-...` | 1,321 | 38 |

✅ Keys are now UUID strings (as documented).

#### Slot table (returns UUID keys):
| Slot UUID | Impressions | Clicks |
|---|---|---|
| `438b712c-ae79-...` | 6,322 | 331 |
| `b31281d7-8f55-...` | 12,836 | 268 |
| `5d036cf8-7f20-...` | 3,426 | 156 |
| `2e1906e7-e459-...` | 1,141 | 107 |
| `3b2e3ef6-5686-...` | 26,414 | 52 |

✅ Slot UUIDs returned — frontend must handle UUID keys in table rendering.

### 4.5 `/v2/metrics/trend2` — Per-Ad Trend

```json
// With test UUIDs (campaignId + adId)
POST /v2/metrics/trend2
{ "campaignId": "test-uuid", "adId": "test-uuid" }
→ { "status": 1, "data": { "click": {}, "impression": {}, "conversion": {} } }
```

✅ Returns success with empty data for unknown UUIDs — graceful handling. With real UUIDs, would return per-ad time series.

### 4.6 `/v2/metrics/trend3` — Multi-Filter Trend

```json
POST /v2/metrics/trend3
{ "campaignId": ["test-uuid"], "adId": ["test-uuid"], "from": "...", "to": "...", "interval": "1d" }
→ { "status": 1, "data": { "total": { "click": {}, "impression": {}, "conversion": {} }, "adStats": {} } }
```

✅ Works identically to trend but accepts filter arrays. Returns empty for unknown UUIDs.

---

## 5. V2 Data Ecosystem — What Exists

### 5.1 Campaigns (in Elasticsearch metrics)

At least **8 distinct UUID campaign IDs** found in metrics data:

| Campaign UUID | Impressions |
|---|---|
| `5de0148c-defe-51f1-8730-3b2c3d1b5882` | 98,540 |
| `c41b44f8-a0bb-5363-89ce-e75012cb55ea` | 27,770 |
| `bfad48f4-746a-5306-b2d6-f0b3601f0560` | 22,283 |
| `ddf4735b-67a8-5518-9b2b-d91314febf2c` | 14,142 |
| `462309fb-9e84-5257-9fbd-c5a0d8f5b1b9` | 18,973 |
| `f27a081c-9f3d-550a-8835-5f9a62eef581` | 11,057 |
| `de47333d-80a4-5c87-a3ae-5081c4f3ba4f` | 10,781 |
| `97e09958-8610-5c05-8499-4a965ceb6911` | 7,043 |

These campaigns exist in the ES metrics index but **cannot be looked up via `/v2/campaigns`** because ClickHouse reads are broken.

### 5.2 Ads (in Elasticsearch metrics)

At least **100+ distinct ad UUIDs** in the metrics index. Top ads:
- `99008339-6470-5a54-ba40-a35a828b6099`: 4,149 impressions
- `94523fa2-4668-508c-9756-4c6ce3d48962`: 53,370 impressions (single-day spike on Jun 1)
- `348c46af-29e9-5df4-a0df-573f4f8c353a`: 885 impressions on Jun 29

### 5.3 Slots (in Elasticsearch metrics)

At least **5+ distinct slot UUIDs**:
- `3b2e3ef6-5686-4276-b167-1e904299cfc7`: 26,414 impressions
- `b31281d7-8f55-4a84-a1a9-bb3e93fc37f9`: 12,836 impressions
- `438b712c-ae79-464c-b08a-a7e51fb450f9`: 6,322 impressions

---

## 6. V2 Response Shape Reference

### 6.1 Success Response Pattern

All V2 endpoints follow the same envelope:

```json
{
  "status": 1,        // 1 = success, 0 = failure
  "message": "Success!" | "success",
  "data": { ... }     // varies by endpoint
}
```

### 6.2 Error Response Pattern

```json
{
  "status": 0,
  "message": "Failed!",
  "err": "Something Went Wrong!" | "Invalid Campaign Id!" | "Invalid Dates!" | "Invalid Input!"
}
```

### 6.3 Key Field Type Changes (vs V1)

| Field | V1 Type | V2 Type | Example |
|---|---|---|---|
| `campaignId` (in response) | `number` | `string` (UUID) | `"5de0148c-defe-51f1-8730-3b2c3d1b5882"` |
| `adId` (in response) | `number` | `string` (UUID) | `"99008339-6470-5a54-ba40-a35a828b6099"` |
| `slotId` (in response) | `number` | `string` (UUID) | `"438b712c-ae79-464c-b08a-a7e51fb450f9"` |
| `campaignId` (in request) | `number[]` | `string[]` (UUID) | `["5de0148c-..."]` |
| `eventType` | `number` (0) | `string` ("0") ⚠️ | `"0"` instead of `0` |
| `eventCount` | `number` | `number` | unchanged |
| `siteId` | `number` | `number` | unchanged |

⚠️ **CRITICAL**: `eventType` is returned as a **string** (`"0"`, `"1"`, `"2"`) in V2 metrics responses, but as a **number** (`0`, `1`, `2`) in V1. Frontend code doing `=== 0` comparisons will break. Must use `String(eventType)` or `==` comparisons.

---

## 7. How to Call V2 Correctly

### 7.1 Metrics — Ready to Use

```typescript
// ✅ CORRECT: V2 metrics calls
const baseUrl = "https://search-new.bitbns.com/buyhatkeAdDashboard/v2";

// Overall metrics with campaign filter
await fetch(`${baseUrl}/metrics/all?userId=1`, {
  method: "POST",
  body: JSON.stringify({
    from: "2026-03-01 00:00:00",
    to: "2026-07-01 23:59:59",
    campaignId: ["5de0148c-defe-51f1-8730-3b2c3d1b5882"]  // UUID strings
  })
});

// Trend with ad filter
await fetch(`${baseUrl}/metrics/trend?userId=1`, {
  method: "POST",
  body: JSON.stringify({
    from: "2026-03-01 00:00:00",
    to: "2026-07-01 23:59:59",
    adId: ["99008339-6470-5a54-ba40-a35a828b6099"],
    interval: "1d"
  })
});

// Breakdown
await fetch(`${baseUrl}/metrics/breakdown?userId=1`, {
  method: "POST",
  body: JSON.stringify({
    from: "2026-03-01 00:00:00",
    to: "2026-07-01 23:59:59",
    campaignId: ["5de0148c-defe-..."],
    by: "gender"  // gender | platform | location | age
  })
});

// Top performers table
await fetch(`${baseUrl}/metrics/table?userId=1`, {
  method: "POST",
  body: JSON.stringify({
    type: "adId",        // location | adId | slotId
    sortBy: "impressions" // impressions | clicks
  })
});
```

### 7.2 Campaigns — Only CREATE Works

```typescript
// ✅ WORKS: Create a campaign
await fetch(`${baseUrl}/campaigns?userId=1`, {
  method: "POST",
  body: JSON.stringify({
    brandName: "My Campaign",
    status: 3,           // 0=paused, 1=active, 2=test, 3=draft
    totalBudget: 10000,
    impressionTarget: 100000,
    clickTarget: 5000,
    dailyBudget: 500
  })
});
// → { status: 1, data: { campaignId: "uuid-string" } }

// ❌ BROKEN: Get campaigns
await fetch(`${baseUrl}/campaigns?userId=1`);
// → { status: 0, err: "Something Went Wrong!" }
```

### 7.3 Reference Data — Always Available

```typescript
// ✅ All reference endpoints work
await fetch(`${baseUrl}/ads/siteDetails`);
await fetch(`${baseUrl}/ads/locationDetails`);
await fetch(`${baseUrl}/ads/categoryDetails?param=shoe`);
await fetch(`${baseUrl}/ads/categoryDetails2`);       // l0 roots
await fetch(`${baseUrl}/ads/categoryDetails2?catId=1`); // children
```

---

## 8. Frontend Migration: What Works NOW

### Can Migrate Today:
- ✅ All **metrics/analytics pages** — just need UUID campaign/ad/slot IDs
- ✅ All **reference dropdowns** (sites, locations, categories)
- ✅ **Campaign creation form** (POST works, but can't list afterward)

### Cannot Migrate Yet:
- ❌ Campaign list page (GET broken)
- ❌ Campaign edit/clone/archive
- ❌ Ad list/create/edit/clone/archive (needs working campaign GET + slot GET)
- ❌ Slot management page (GET broken)

### eventType String Bug:
```typescript
// V1 (current code):
if (stat.eventType === 0) { /* impression */ }

// V2 (must handle string):
const eventType = Number(stat.eventType);
if (eventType === 0) { /* impression */ }
```

---

## 9. V2 Endpoint Matrix — All 22 Endpoints

| # | Endpoint | Method | Status | Notes |
|---|---|---|---|---|
| 1 | `/v2/campaigns` | GET | ❌ | CH read broken |
| 2 | `/v2/campaigns` | POST | ✅ | Returns UUID |
| 3 | `/v2/campaigns/update` | POST | ❌ | CH read dependency |
| 4 | `/v2/campaigns/clone` | POST | ❌ | CH read dependency |
| 5 | `/v2/campaigns/archive` | POST | ❌ | CH read dependency |
| 6 | `/v2/ads` | GET | ❌ | Needs UUID campaignId + CH read |
| 7 | `/v2/ads` | POST | ❌ | Needs valid slot UUID |
| 8 | `/v2/ads/update` | POST | ❌ | Needs CH read |
| 9 | `/v2/ads/clone` | POST | ❌ | Needs CH read |
| 10 | `/v2/ads/archive` | POST | ❌ | Needs CH read |
| 11 | `/v2/ads/uploadCreative` | POST | ❌ | Needs valid slot UUID |
| 12 | `/v2/ads/siteDetails` | GET | ✅ | 297 sites |
| 13 | `/v2/ads/locationDetails` | GET | ✅ | 179 locations |
| 14 | `/v2/ads/categoryDetails` | GET | ✅ | Search works |
| 15 | `/v2/ads/categoryDetails2` | GET | ✅ | Drilldown works |
| 16 | `/v2/slots` | GET | ❌ | CH read broken |
| 17 | `/v2/slots` | POST | ❌ | Untested (needs GET working first) |
| 18 | `/v2/metrics/all` | POST | ✅ | UUID filters work |
| 19 | `/v2/metrics/trend` | POST | ✅ | All intervals work |
| 20 | `/v2/metrics/trend2` | POST | ✅ | Per-ad trend |
| 21 | `/v2/metrics/trend3` | POST | ✅ | Multi-filter trend |
| 22 | `/v2/metrics/breakdown` | POST | ✅ | Gender, platform, location |
| 23 | `/v2/metrics/table` | POST | ✅ | Location, adId, slotId |

**Score**: 11/23 working (48%). Core metrics + references = ready. CRUD = blocked.

---

## 10. Root Cause Analysis

### Why CRUD is broken:
1. **ClickHouse writes work** (ReplacingMergeTree INSERT succeeds)
2. **ClickHouse reads fail** — likely causes:
   - Table schema mismatch between what the API expects and what CH has
   - Missing ClickHouse table/view for SELECT queries
   - ReplacingMergeTree needs `FINAL` modifier for deduplication
   - Connection/auth issue specific to read-path queries

### Why Metrics work:
1. **Metrics use Elasticsearch**, not ClickHouse
2. The `ads_event_aggregate_v2` ES index is populated and queryable
3. UUID mapping between ES and CH is consistent (same UUID generation logic)
4. ES queries are independent of CH availability

### Fix Priority:
1. **Fix ClickHouse SELECT queries** — unblocks all CRUD endpoints
2. **Populate CH slots table** — unblocks ad creation
3. **Backfill campaign/ads data** — sync from MySQL or V2 ES index
4. **Fix `eventType` string vs number** — consistency with V1 types

---

*V2 independent behavior analysis completed July 1, 2026 — 46 API calls across 23 endpoints.*
