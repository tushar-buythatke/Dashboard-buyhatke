# Ads V2 — Field & Serve-Impact Guide

A practical reference for the `/v2/ads` route: **what to send, the accepted values, and — most importantly — what each field actually does when the ad is served.**

This complements [`V2_API_DOCS.md`](./V2_API_DOCS.md) (request/response shapes). Where they overlap, this doc is the authority on *serve behavior*.

- **Dashboard side** (writes ads): `buyhatkeAddDashboard/routes/adsV2.js` → ClickHouse `buyhatkeAds.adsRegistry`.
- **Serve side** (reads ads): `buyhatke-ads/routes/content.js` → `POST /content/serve`.

---

## 1. How to send

| | |
|---|---|
| **Base path** | `/buyhatkeAdDashboard/v2/ads` (test env: `/buyhatkeAdDashboard-test/v2/ads`) |
| **Content-Type** | `application/json` for all endpoints **except** `POST /uploadCreative`, which is `multipart/form-data` |
| **Create** | `POST /v2/ads?userId=<id>` — `userId` query param is for auditing |
| **Update** | `POST /v2/ads/update` — send only the fields you want to change; everything else is preserved |
| **Others** | `POST /v2/ads/clone`, `POST /v2/ads/archive`, `GET /v2/ads` (list) |

**Typical create flow**

1. `POST /v2/ads/uploadCreative` (multipart: `slotId`, `image`) → returns a temp `creativeUrl`. Image dimensions are validated against the slot.
2. `POST /v2/ads?userId=…` with that `creativeUrl` plus the fields below.

**Value-source helper endpoints** (use these to populate targeting fields with valid values):

| Field | Get valid values from |
|---|---|
| `sites` | `GET /v2/ads/siteDetails` |
| `location` | `GET /v2/ads/locationDetails` |
| `categories` | `GET /v2/ads/categoryDetails` (search) / `categoryDetails2` (tree) / `catNames` (id→name) |

---

## 2. The one mental model: **eligibility (hard) vs ranking (soft)**

Every serve request resolves the calling user (their clusterId, gender, age, price band, categories, brands, location, plus the request's `slotId`, `siteId`, `slotType`, `ln`), then runs **one query** that:

1. **Filters** the ad pool down to ads *eligible* for this user/request — these are **HARD** conditions. Fail any one → the ad is **not served at all**.
2. **Scores** every eligible ad and serves the single highest `finalScore` (`ORDER BY finalScore DESC LIMIT 1`) — these are **SOFT** conditions. They only decide *which* eligible ad wins, never eligibility.

So a field is one of: **HARD** (targeting/gate), **SOFT** (ranking boost), or **METADATA/OPS** (not used for selection).

> Rule of thumb: `gender`, `location`, `sites`, `slotId`, `slotType`, `priceRange`, `categories`, `status`, dates, and `serveStrategy` gate eligibility. `priority`, `ageRange`, `brandTargets`, and the match-bonuses are ranking only.

---

## 3. Field reference — accepted values + serve impact

### Identity & display

| Field | Accepted | Role | Serve impact |
|---|---|---|---|
| `campaignId` | UUID string | HARD (indirect) + OPS | Ad inherits the campaign. Campaign budget/`impressionTarget`/`clickTarget` exhaustion auto-pauses the campaign **and all its ads** (`status=0`). For server-configured campaigns, an ad is also excluded once the user has already **clicked** that campaign (10-min cached, see §6). |
| `label` | string | METADATA | Display label. Auto-suffixed `_N` if duplicated within the campaign; `name` is derived from it. |
| `creativeUrl` | URL (from `/uploadCreative` or CDN) | METADATA (rendered) | The image/video shown. Must match the slot's dimensions at upload time. |
| `logo` | URL | METADATA (rendered) | Brand logo shown with the ad. |
| `targetUrl` | URL | METADATA (redirect) | Landing URL. Stored wrapped with an encrypted `bhAdTrack` token (campaignId, slotId, adId); the redirect route decrypts it for click tracking, then forwards to the destination. |
| `couponCode` | string | METADATA | Fallback coupon for `serveStrategy=2` (per-product coupons in `adProducts` take priority). |
| `impressionPixel`, `clickPixel` | URL | METADATA (tracking) | Fired on impression / click. |

### Slot placement (HARD)

| Field | Accepted | Role | Serve impact |
|---|---|---|---|
| `slotId` | slot UUID (required on create) — stored value may be `""` | **HARD** | `""` → serves on **any** slot. A set `slotId` → serves **only** when the request's `slotId` matches. |
| `slotType` | derived from the slot (not sent directly) | **HARD** | Request `slotType` must match the ad's `slotType`. Special request modes: `slotType='-1'` serves only `serveStrategy IN (1,2)`; `slotType='0'` serves only ads whose `slotType='0'`. |

### Targeting

| Field | Accepted | Role | Serve impact |
|---|---|---|---|
| `gender` | `u` / `m` / `f` (`""`/`na`→`u`) | **HARD + SOFT** | `u` = all. `m`/`f` = serve **only** to that gender. +2.0 score on match. Full rules in **§4**. |
| `location` | array of strings (e.g. `["MH","400001"]`) | **HARD + SOFT** | Empty = all locations. Non-empty = serve **only** where user location matches. +0.5–2.0 score by granularity. Full rules in **§5**. |
| `sites` | array of site IDs (`UInt32`) | **HARD + SOFT** | Empty = all sites. Non-empty = serve **only** when request `siteId` is in the array. +5.0 score on match. |
| `categories` | object `{ "catId": 1 }` in → stored as flat `ln` int array | **HARD + SOFT** | Ad must share **≥1** category with the user's inferred interests (plus the request's `ln`). An ad with an **empty** `categories` array will **not** pass this filter. Matching categories add their interest score. |
| `brandTargets` | array of brand strings | **SOFT** | Not a gate. Boosts score when the user's affinity brands overlap. Empty `brandTargets` gives a flat `+2.0`. |
| `priceRangeMin`, `priceRangeMax` | integers | **HARD** | `0/0` = no price targeting. Otherwise the ad's `[min,max]` must **overlap** the user's price band (≈ ±30% of their avg). Users with no price signal bypass this. |
| `ageRangeMin`, `ageRangeMax` | integers (`UInt8`) | **SOFT** | Not a gate. `+1.5` score when the user's age falls in `[min,max]`. |

### Ranking, lifecycle, billing

| Field | Accepted | Role | Serve impact |
|---|---|---|---|
| `priority` | integer ≥ 0 | **SOFT** | Added directly to `finalScore` (`priority × 1.0`). The simplest lever to force an ad to win among eligible ads. |
| `serveStrategy` | `0`/`1`/`2`/`3`/`4` | **HARD + behavior** | Ad type — see **§7**. |
| `status` | `0` (pause) / `1` (active); `-1` = archived | **HARD** | Only `status=1` is ever served. |
| `startDate`, `endDate` | `"YYYY-MM-DD"` | **HARD** | Served only when `startDate ≤ today ≤ endDate`. |
| `startTime`, `endTime` | `"HH:mm:ss"` | METADATA* | Stored, but the current serve query gates on **date only** — time-of-day is not enforced at selection. |
| `impressionTarget`, `clickTarget` | integers | OPS | Per-campaign caps. When the campaign's totals reach a target, the campaign and its ads are auto-paused. |
| `impressionCharge`, `clickCharge` | decimals | OPS (billing) | Deducted per event; recorded as `balanceConsumed` in `adLogs`. |
| `minBid`, `maxBid`, `bidModel` | decimals / int | METADATA* | Stored for bidding bookkeeping; not referenced by the current serve scoring. |

\* *Stored and returned, but not used by the current `content.js` serve selection.*

---

## 4. Gender targeting (detail)

**Accepted keys (stored):** `u` = all/unrestricted, `m` = male, `f` = female.

**API normalization** (`normalizeGender` in `adsV2.js`):

| You send | Stored |
|---|---|
| `"u"`, `"U"`, `"m"`, `"M"`, `"f"`, `"F"` | lowercased `u`/`m`/`f` |
| `""`, `"na"`, `"NA"`, omitted (create) | `u` |
| anything else | **rejected** on create (`Invalid Input!`); on update the field is ignored and the existing value kept |

**Serve rule (HARD filter):**

```sql
ads.gender NOT IN ('m', 'f')  OR  ads.gender = {finalGender}
```

- `u` → `NOT IN ('m','f')` is true → **served to everyone**.
- `m` → served **only** when the user's resolved gender is `m`.
- `f` → served **only** when the user's resolved gender is `f`.

`finalGender` is the user's resolved gender at serve time: `m` / `f`, or `NA` when unknown/uninferable.

**Consequences to know:**

- **Strict match only.** A gender-targeted (`m`/`f`) ad will **not** serve to a user whose gender is unknown (`NA`) — we only serve on a positive match. Use `u` if you want an ad shown regardless of gender.
- **SOFT bonus:** matching gender adds `+2.0` to the score (only ever applies to `m`/`f` ads; `u` never matches a user gender, so it earns no bonus — which is correct, it isn't gender-targeted).
- **Legacy / stray values are unrestricted.** Anything that isn't exactly lowercase `m` or `f` (e.g. old `Male`/`Female`/`NA`, or an accidental uppercase `M`) falls through `NOT IN ('m','f')` and is treated as **served to all**. This is safe (no regression) but means only lowercase `m`/`f` actually gate — and `normalizeGender` guarantees new ads are lowercase.
- **No NULL risk:** the column is non-nullable `LowCardinality(String)`; "unset" is `''`, which is unrestricted.

---

## 5. Location targeting (detail)

**Field:** `location` — an array of location tokens. Send an array (`["MH","400001"]`) or an object (`{ "MH": 1 }`); it's normalized to a string array. Pull valid tokens from `GET /v2/ads/locationDetails`.

At serve time the user is resolved to four location tokens: **pincode, city, state, country**. A token you put in `location` is matched against those via `has()`.

**Serve rule (HARD filter):**

```sql
length(ads.location) = 0
  OR has(ads.location, {userPincode})
  OR has(ads.location, {userCity})
  OR has(ads.location, {userState})
  OR has(ads.location, {userCountry})
```

- **Empty `location`** → no location targeting → **served everywhere**.
- **Non-empty `location`** → served **only** if **any** of the user's pincode/city/state/country appears in the array.
- You can mix granularities in one array — e.g. a specific pincode plus a whole state; a match on any qualifies.

**SOFT bonus** (stacks, added to score for matching granularity):

| Match | Bonus |
|---|---|
| pincode | +2.0 |
| city | +1.5 |
| state | +1.0 |
| country | +0.5 |

**Consequences to know:**

- **Unknown user location** → a location-targeted ad **won't serve** to that user (no token can match).
- **Coupon ads (`serveStrategy=2`) additionally *require* a location match** — a coupon ad with an empty `location` will **not** serve at all. (This is stricter than the general rule, which treats empty as "all".) So always set `location` on coupon ads.

---

## 6. Campaign-level serve behaviors (not per-ad fields)

These are driven by the campaign / server config, but affect whether your ad shows:

- **Budget & targets:** when a campaign hits its `impressionTarget`/`clickTarget` (or budget), it and all its ads are auto-paused.
- **Already-clicked exclusion:** for a server-configured set of campaign IDs, once a user (cluster) has **clicked** the campaign, that campaign is excluded from selection for that user (cached ~10 min). This is configured in `content.js` (`CLICK_EXCLUDE_CAMPAIGN_IDS`), not in the dashboard.
- **Impression fatigue:** every ad's score is reduced by `impressions_in_last_1h × 4.0`, so a freshly-shown ad is de-prioritized against equally-relevant alternatives.

---

## 7. `serveStrategy` values

| Value | Name | Behavior |
|---|---|---|
| `0` | Banner | Creative + `targetUrl` only; no product list. |
| `1` | Product | Serves with a product list from `adProducts` (matched to user interest). |
| `2` | Coupon | Coupon ad; **requires** a `location` match to serve. Uses per-product coupon or `couponCode` fallback. |
| `3` | Flight | Served via the separate flight path — **excluded from the normal product/banner query.** |
| `4` | Category-locked | Banner-style ad that serves **only when the request's `ln` category is in the ad's `categories`** (`serveStrategy != 4 OR has(categories, {lnId})`). No product list; no extra score boost. |

Request-mode interaction: `slotType='-1'` serves only strategies `1` and `2` (product/coupon); banner (`0`) and category-locked (`4`) are excluded from that mode.

---

## 8. Worked examples

**A. Male-only, Maharashtra-only product ad on one slot**

```json
{
  "campaignId": "…",
  "label": "SummerSale_M_MH",
  "slotId": "slot-uuid",
  "creativeUrl": "https://.../c.jpg",
  "targetUrl": "https://brand.com/sale",
  "gender": "m",
  "location": ["MH"],
  "serveStrategy": 1,
  "status": 1,
  "categories": { "9001": 1 },
  "priority": 5
}
```
Serves **only** to users resolved as male whose location matches `MH`, on that slot, sharing category `9001` (or its ln leaves). Wins ties via `priority`.

**B. Everyone, everywhere banner**

```json
{
  "campaignId": "…", "label": "BrandAwareness", "slotId": "slot-uuid",
  "creativeUrl": "…", "targetUrl": "…",
  "gender": "u", "location": [], "sites": [],
  "serveStrategy": 0, "status": 1, "categories": { "9001": 1 }
}
```
`gender:"u"` + empty `location`/`sites` = no gender/location/site gating. Still needs a category overlap with the user (or `ln`).

**C. Widen an existing ad to all genders**

```json
{ "adId": "…", "gender": "u" }
```
Update accepts partial bodies; sending `"u"` (or `""`/`"na"`) removes gender gating.

---

## 9. Gotchas checklist

- Gender only gates on lowercase `m`/`f`; anything else = served to all. Use `u` for "all".
- Gender-/location-targeted ads **skip users whose gender/location is unknown** — this is intentional (positive-match only).
- Coupon ads (`serveStrategy=2`) **must** have a `location`, or they never serve.
- An ad with **empty `categories`** fails the category filter — always attach at least one category (or use `ln`/category-locked flows).
- `slotId=""` means "any slot" — set it to bind an ad to a specific slot.
- `ageRange`, `brandTargets`, `priority`, `minBid/maxBid/bidModel`, `startTime/endTime` do **not** gate eligibility (age/brand/priority are ranking; time and bids are metadata today).
