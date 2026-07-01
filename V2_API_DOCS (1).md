# V2 API Documentation

This document covers all v2 endpoints and the differences from v1 that the frontend/client must handle.

---

## Global Breaking Changes (applies to all v2 routes)

| Area | V1 | V2 |
|---|---|---|
| **Database** | MySQL | ClickHouse |
| **`campaignId`** | `integer` | UUID `string` (`"0c7e364c-163b-487c-ac0e-79aee4678122"`) |
| **`adId`** | `integer` | UUID `string` |
| **`slotId`** | `integer` | UUID `string` |
| **Updates** | SQL `UPDATE` | Re-insert with same id (ClickHouse ReplacingMergeTree) |
| **Archive** | Hard delete / flag | Status `-1` — excluded from all GET responses |
| **Base path** | `/{env}/campaigns` | `/{env}/v2/campaigns` (same pattern for ads, slots, metrics) |

---

## 1. Campaigns — `/v2/campaigns`

### What changed from v1

- `campaignId` in request and response is now a **UUID string**, not an integer.
- Two new optional fields: `brandId` (UInt32, default `0`) and `dailyBudget` (Decimal, default `0`).
- Two new fields that must now be provided/returned: `impressionTarget` and `clickTarget` (both UInt32, default `0`). These drive auto-pause logic when targets are reached.
- Valid `status` values: `0` (paused), `1` (active), `2` (test), `3` (draft). (**Same as v1.**)
- Archive also sets all ads under the campaign to `status = -1` in ClickHouse and pushes each to OpenSearch.

---

### `GET /v2/campaigns`

List campaigns. Archived campaigns (`status = -1`) are never returned.

**Query params** (all optional)

| Param | Type | Description |
|---|---|---|
| `campaignId` | string (UUID) | Filter by id |
| `status` | integer `0–3` | Filter by status |
| `brandName` | string | Filter by brand name |

**Response**

```json
{
  "status": 1,
  "message": "Success!",
  "data": {
    "campaignList": [
      {
        "campaignId": "0c7e364c-163b-487c-ac0e-79aee4678122",
        "brandName": "Nike",
        "impressionTarget": 100000,
        "clickTarget": 5000,
        "totalBudget": 50000.00,
        "dailyBudget": 1000.00,
        "brandId": 42,
        "status": 1,
        "createdBy": 7,
        "createdAt": "2026-06-01 10:00:00",
        "updatedAt": "2026-06-15 12:30:00"
      }
    ]
  }
}
```

---

### `POST /v2/campaigns` — Create

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `brandName` | string | Yes | |
| `status` | integer | Yes | `0–3` |
| `totalBudget` | number | Yes | |
| `impressionTarget` | number | No | Default `0` (no target) |
| `clickTarget` | number | No | Default `0` (no target) |
| `dailyBudget` | number | No | Default `0` |
| `brandId` | integer | No | Default `0` |

**Query param**: `?userId=<integer>`

**Response**

```json
{ "status": 1, "message": "Success!", "data": { "campaignId": "uuid-string" } }
```

> **V1 diff**: Response `campaignId` is now a UUID string, not an integer.

---

### `POST /v2/campaigns/update`

**Request body** — send only fields to change.

| Field | Type | Notes |
|---|---|---|
| `campaignId` | string (UUID) | **Required** |
| `brandName` | string | Optional |
| `status` | integer `0–3` | Optional |
| `totalBudget` | number | Optional |
| `impressionTarget` | number | Optional |
| `clickTarget` | number | Optional |
| `dailyBudget` | number | Optional |
| `brandId` | integer | Optional |

**Query param**: `?userId=<integer>` — must match original creator.

---

### `POST /v2/campaigns/clone`

**Request body**: `{ "campaignId": "uuid-string" }`  
**Query param**: `?userId=<integer>`

**Response**: `{ "data": { "campaignId": "new-uuid-string" } }`

---

### `POST /v2/campaigns/archive`

Pauses the campaign and **all its ads** (sets both to `status = -1`).

**Request body**: `{ "campaignId": "uuid-string" }`  
**Query param**: `?userId=<integer>`

> **V1 diff**: In v2 archive also archives all ads under the campaign in ClickHouse and syncs them to OpenSearch.

---

## 2. Ads — `/v2/ads`

### What changed from v1

| Area | V1 | V2 |
|---|---|---|
| `adId` | integer | UUID string |
| `campaignId` | integer | UUID string |
| `slotId` | integer FK | UUID string (CH slots table) — used for validation only; **stored as `slotType`** |
| `categories` | JSON object `{ "1234": 1, ... }` | Array of integers `[1234, 5678]` (ln ids only) |
| `sites` | JSON object `{ "10": 1, ... }` | Array of integers `[10, 20]` |
| `location` | JSON object `{ "MH": 1, ... }` | Array of strings `["MH", "DL"]` |
| `brandTargets` | JSON object `{ "Nike": 1, ... }` | Array of strings `["Nike", "Adidas"]` |
| `serveStrategy` valid values | `0, 1` | `0, 1, 2, 3` (0 default, 1 product, 2 coupon, 3 flight) |
| `isTestPhase` | present | **Removed** |
| `otherDetails` | present | **Removed** |
| Category l0 in response | `{ l0: [...], ln: [...] }` | Only `ln` — l0 parent categories are now auto-expanded to their leaf children |

**New fields in v2 (not in v1)**:

| Field | Type | Default | Description |
|---|---|---|---|
| `slotType` | string | auto | Slot type string derived from the slot's dimensions |
| `couponCode` | string | `""` | Coupon code for coupon-strategy ads |
| `impressionCharge` | decimal | `0` | Cost per impression |
| `clickCharge` | decimal | `0` | Cost per click |
| `minBid` | decimal | `0` | Minimum bid |
| `maxBid` | decimal | `0` | Maximum bid |
| `bidModel` | integer | `1` | Bid model type |

---

### `GET /v2/ads`

List ads for a campaign.

**Query params**

| Param | Type | Required | Description |
|---|---|---|---|
| `campaignId` | string (UUID) | **Yes** | |
| `adId` | string (UUID) | No | Filter to a single ad |
| `status` | integer `0` or `1` | No | Filter by status |
| `name` | string | No | Filter by name |

**Response**

```json
{
  "status": 1,
  "message": "Success!",
  "data": {
    "adsList": [
      {
        "adId": "uuid-string",
        "campaignId": "uuid-string",
        "name": "Nike_Banner_1",
        "label": "Nike_Banner",
        "slotType": "3",
        "impressionTarget": 0,
        "clickTarget": 0,
        "impressionPixel": "",
        "clickPixel": "",
        "creativeUrl": "https://cdn.../creative.jpg",
        "targetUrl": "https://...",
        "logo": "",
        "couponCode": "",
        "categories": [1234, 5678],
        "sites": [10, 20],
        "location": ["MH", "DL"],
        "brandTargets": ["Nike"],
        "priceRangeMin": 0,
        "priceRangeMax": 0,
        "ageRangeMin": 0,
        "ageRangeMax": 0,
        "priority": 0,
        "gender": "u",
        "status": 1,
        "impressionCharge": 0.5,
        "clickCharge": 2.0,
        "serveStrategy": 1,
        "startDate": "1970-01-01",
        "startTime": "00:00:00",
        "endDate": "2099-12-31",
        "endTime": "23:59:59",
        "minBid": 0,
        "maxBid": 0,
        "bidModel": 1,
        "createdAt": "2026-06-01 10:00:00",
        "updatedAt": "2026-06-15 12:30:00"
      }
    ]
  }
}
```

> **V1 diff**: `id` key is now `adId`. `categories`, `sites`, `location`, `brandTargets` are arrays not objects. `slotId` replaced by `slotType`. New fields: `couponCode`, `impressionCharge`, `clickCharge`, `minBid`, `maxBid`, `bidModel`.

---

### `POST /v2/ads` — Create

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `campaignId` | string (UUID) | Yes | |
| `label` | string | Yes | Base label; auto-suffixed if duplicate within campaign |
| `slotId` | string (UUID) | Yes | CH slot UUID — validated against active slots |
| `creativeUrl` | string | Yes | From `/uploadCreative` or final CDN URL |
| `targetUrl` | string | Yes | |
| `gender` | string | Yes | Valid gender enum value |
| `status` | integer | Yes | `0` or `1` |
| `serveStrategy` | integer | Yes | `0–3` |
| `categories` | object | No | `{ "catId": 1, ... }` — auto-expanded to ln leaf IDs |
| `sites` | array/object | No | Array of site IDs `[10, 20]` or object `{ "10": 1 }` |
| `location` | array/object | No | Array of location codes `["MH"]` or object `{ "MH": 1 }` |
| `brandTargets` | array/object | No | Array of brand strings or object |
| `impressionTarget` | integer | No | Default `0` |
| `clickTarget` | integer | No | Default `0` |
| `impressionPixel` | string | No | |
| `clickPixel` | string | No | |
| `logo` | string | No | From `/uploadCreative` |
| `couponCode` | string | No | |
| `impressionCharge` | decimal | No | Default `0` |
| `clickCharge` | decimal | No | Default `0` |
| `priceRangeMin` | integer | No | Default `0` |
| `priceRangeMax` | integer | No | Default `0` |
| `ageRangeMin` | integer | No | Default `0` |
| `ageRangeMax` | integer | No | Default `0` |
| `priority` | integer | No | Default `0` |
| `startDate` | string | No | `"YYYY-MM-DD"`, default `"1970-01-01"` |
| `startTime` | string | No | `"HH:mm:ss"`, default `"00:00:00"` |
| `endDate` | string | No | `"YYYY-MM-DD"`, default `"2099-12-31"` |
| `endTime` | string | No | `"HH:mm:ss"`, default `"23:59:59"` |
| `minBid` | decimal | No | Default `0` |
| `maxBid` | decimal | No | Default `0` |
| `bidModel` | integer | No | Default `1` |

**Response**: `{ "data": { "adId": "uuid-string" } }`

> **V1 diff**: `slotId` must now be a UUID string. `categories` input format is unchanged (object) but the stored/returned format changes to a flat integer array. `serveStrategy` now accepts `0–3`.

---

### `POST /v2/ads/update`

Send only the fields to change. All others are preserved from the current stored record.

| Field | Type | Notes |
|---|---|---|
| `adId` | string (UUID) | **Required** |
| All other fields | same types as create | Optional |

> **Important**: `categories` is still accepted as an object `{ "catId": 1 }` — it will be re-processed to ln leaf IDs.

---

### `POST /v2/ads/clone`

**Request body**: `{ "adId": "uuid-string" }`

**Response**: `{ "data": { "adId": "new-uuid-string" } }`

---

### `POST /v2/ads/archive`

**Request body**: `{ "adId": "uuid-string" }`

Sets `status = -1`. Ad will not appear in any GET or serve query.

---

### `POST /v2/ads/uploadCreative`

Validates image dimensions against the slot from the **ClickHouse slots table** (v1 used MySQL slots).

**Request**: `multipart/form-data`

| Field | Type | Notes |
|---|---|---|
| `slotId` | string (UUID) | CH slot UUID — used for dimension validation |
| `image` | file | Image file |

**Response**: `{ "data": { "creativeUrl": "https://.../tempCreative/filename.jpg" } }`

Pass the returned `creativeUrl` directly into the create/update body.

> **V1 diff**: `slotId` must be a UUID string, not an integer.

---

### `GET /v2/ads/siteDetails`

Unchanged from v1. Returns site list from JSON cache.

---

### `GET /v2/ads/locationDetails`

Unchanged from v1. Returns location list from JSON cache.

---

### `GET /v2/ads/categoryDetails`

Unchanged from v1. Accepts optional `?param=<search>` for ranked search.

---

### `GET /v2/ads/categoryDetails2`

Unchanged from v1. Reads from MySQL `allPosBreadCrumbs`.

| Query param | Description |
|---|---|
| `catId` | If omitted, returns all l0 roots (status=4). If provided, returns children (status 3 or 5). |

---

### `POST /v2/ads/catNames`

Resolve an array of category IDs to their names. Useful for displaying category labels when you only have stored IDs (e.g. from an ad's `categories` array).

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `catIds` | integer[] | Yes | Array of cat_id values to look up |

```json
{ "catIds": [101, 202, 303] }
```

**Response**

```json
{
  "status": 1,
  "message": "Success!",
  "data": {
    "categories": [
      { "catId": 101, "catName": "Electronics" },
      { "catId": 202, "catName": "Mobiles" }
    ]
  }
}
```

> Only IDs that exist in `allPosBreadCrumbs` are returned. Missing IDs are silently omitted. Order is not guaranteed.

---

### Category input format — important note

The `categories` field in create/update requests is still accepted as an object:

```json
{ "1234": 1, "5678": 1 }
```

However, the server now **always expands** these to their deepest leaf (`ln`) category IDs before storing. If you pass an l0 root category (status=4), all its ln descendants are automatically stored. The response `categories` field returns a **flat integer array** of those resolved ln IDs:

```json
"categories": [9001, 9002, 9003]
```

---

## 3. Slots — `/v2/slots`

### What changed from v1

| Area | V1 | V2 |
|---|---|---|
| `slotId` | auto-increment integer | UUID string |
| Database | MySQL | ClickHouse |
| `slotType` | not present | **Auto-assigned** based on dimensions (new) |
| Archive | not available | `POST /archive` sets `isActive = -1` |

**`slotType` assignment rule**: slots with identical `(width, height)` share the same `slotType` number (string). When you create a slot with a new dimension pair, the next available integer is assigned as its `slotType`. When you change a slot's dimensions, its `slotType` is automatically re-assigned to match the new dimension group.

`slotType` is what ads use to target a slot size — an ad targeting `slotType = "3"` will serve across all slots that have `slotType = "3"`.

---

### `GET /v2/slots`

**Query params** (all optional)

| Param | Type | Description |
|---|---|---|
| `slotId` | string (UUID) | Filter to a single slot |
| `isActive` | integer `0` or `1` | Filter by active state |

**Response**

```json
{
  "status": 1,
  "message": "Success!",
  "data": {
    "slotList": [
      {
        "slotId": "uuid-string",
        "name": "Homepage Banner",
        "platform": 1,
        "width": 728.0,
        "height": 90.0,
        "isActive": 1,
        "slotType": "3",
        "createdAt": "2026-06-01 10:00:00",
        "updatedAt": "2026-06-15 12:30:00"
      }
    ]
  }
}
```

> **V1 diff**: `slotId` is UUID. New field `slotType`.

---

### `POST /v2/slots` — Create

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | Yes | |
| `platform` | integer | Yes | Must be in valid platforms config |
| `width` | number | Yes | |
| `height` | number | Yes | |

**Response**: `{ "data": { "slotId": "uuid-string", "slotType": "3" } }`

`slotType` is auto-determined from dimensions — no need to pass it.

---

### `POST /v2/slots/update`

| Field | Type | Notes |
|---|---|---|
| `slotId` | string (UUID) | **Required** |
| `name` | string | Optional |
| `platform` | integer | Optional |
| `width` | number | Optional — triggers slotType re-assignment if changed |
| `height` | number | Optional — triggers slotType re-assignment if changed |
| `isActive` | integer `0` or `1` | Optional |

**Response**: `{ "data": { "slotId": "uuid-string", "slotType": "3" } }`

> If `width` or `height` changes, `slotType` is automatically recalculated.

---

### `POST /v2/slots/archive` *(new in v2)*

Soft-deletes the slot (`isActive = -1`). Archived slots are excluded from all GET responses and from ad slot validation.

**Request body**: `{ "slotId": "uuid-string" }`

---

## 4. Metrics — `/v2/metrics`

### What changed from v1

| Area | V1 | V2 |
|---|---|---|
| Main events index | `ad_event_aggregates` | `ads_event_aggregate_v2` |
| `campaignId`, `adId`, `slotId` field types in index | integer | keyword (UUID string) |
| New index field | — | `slotType` (keyword) |
| Conversion index | `conversion_event_aggregates` | **Unchanged** — still `conversion_event_aggregates` |

All request/response formats are **identical to v1**. The only change is that `campaignId`, `adId`, and `slotId` in filter arrays must now be **UUID strings**, not integers.

---

### `POST /v2/metrics/all`

| Field | Type | Notes |
|---|---|---|
| `from` | ISO date string | Required |
| `to` | ISO date string | Required |
| `campaignId` | string[] (UUIDs) | Optional filter |
| `slotId` | string[] (UUIDs) | Optional filter |
| `adId` | string[] (UUIDs) | Optional filter |
| `siteId` | integer[] | Optional filter |

**Response**: same structure as v1.

```json
{
  "data": {
    "conversionStats": { "conversionCount": 42 },
    "adStats": [
      { "eventType": "0", "campaignId": "uuid", "eventCount": 1000 }
    ]
  }
}
```

---

### `POST /v2/metrics/trend`

Same request/response as v1. Pass `campaignId`, `adId`, `slotId`, `siteId` as UUID/integer arrays and `interval` as `"1d"`, `"7d"`, or `"30d"`.

---

### `POST /v2/metrics/trend2`

Same as v1. `campaignId` and `adId` must now be UUID strings.

```json
{ "campaignId": "uuid-string", "adId": "uuid-string" }
```

---

### `POST /v2/metrics/trend3`

Same as v1. Filter arrays (`campaignId`, `slotId`, `adId`) must now contain UUID strings.

---

### `POST /v2/metrics/breakdown`

Unchanged from v1. `by` values: `"gender"`, `"platform"`, `"location"`, `"age"`.  
Filter arrays must use UUID strings where applicable.

---

### `POST /v2/metrics/table`

Unchanged from v1. `type` values: `"location"`, `"adId"`, `"slotId"`.  
Note: since `adId` and `slotId` are now UUID strings in the index, results will be keyed by UUID strings.

```json
{
  "data": {
    "tableData": {
      "uuid-string": { "impressions": 5000, "clicks": 120 }
    }
  }
}
```

---

## Migration Checklist for Frontend

- [ ] Replace all integer `campaignId` stores/state with UUID strings
- [ ] Replace all integer `adId` stores/state with UUID strings
- [ ] Replace all integer `slotId` stores/state with UUID strings
- [ ] Update ad creation form: `slotId` input must accept UUID (from v2 slots GET)
- [ ] Update ad form: `categories`, `sites`, `location`, `brandTargets` responses are now arrays — update rendering logic
- [ ] Update ad form: add new fields `couponCode`, `impressionCharge`, `clickCharge`, `minBid`, `maxBid`, `bidModel`
- [ ] Update `serveStrategy` dropdown: now accepts `0, 1, 2, 3` (add "Coupon" and "Flight" options)
- [ ] Remove `isTestPhase` field from ad create/update forms
- [ ] Update metrics filter payloads: pass UUID strings for `campaignId`, `adId`, `slotId` arrays
- [ ] Update metrics result rendering: `adStats` table keys are now UUID strings
- [ ] Slots list: display new `slotType` field; use UUID `slotId` for all slot operations
- [ ] Campaign create/update: add `dailyBudget`, `brandId`, `impressionTarget`, `clickTarget` fields
