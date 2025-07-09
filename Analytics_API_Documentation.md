# Analytics API Documentation

## Overview

This document provides a comprehensive guide to the Analytics API endpoints, available filters, and usage instructions for the BuyHatke Ad Dashboard analytics system.

## Base URL
```
https://ext1.buyhatke.com/buhatkeAdDashboard-test
```

## API Endpoints

### 1. **GET Overall Metrics** `/metrics/all`

**Purpose**: Retrieves overall analytics metrics with optional filtering.

**Method**: `POST`

**URL**: `https://ext1.buyhatke.com/buhatkeAdDashboard-test/metrics/all?userId=1`

**Request Body**:
```json
{
  "from": "2025-01-01",
  "to": "2025-01-31",
  "campaignId": [1, 2, 3],     // Optional: Array of campaign IDs
  "slotId": [1, 2],            // Optional: Array of slot IDs  
  "adId": [5, 6],              // Optional: Array of ad IDs
  "siteId": [1, 2]             // Optional: Array of site/POS IDs
}
```

**Response Format**:
```json
{
  "status": 1,
  "message": "success",
  "data": {
    "conversionStats": {
      "conversionCount": 150
    },
    "adStats": [
      {
        "eventType": 0,           // 0 = impression, 1 = click, 2 = conversion
        "eventCount": 45000,
        "campaignId": 1,          // Present if grouped by campaign
        "slotId": 2,              // Present if grouped by slot
        "adId": 5,                // Present if grouped by ad
        "siteId": 1               // Present if grouped by site
      }
    ]
  }
}
```

---

### 2. **GET Trend Data** `/metrics/trend`

**Purpose**: Retrieves time-series analytics data with different interval bucketing.

**Method**: `POST`

**URL**: `https://ext1.buyhatke.com/buhatkeAdDashboard-test/metrics/trend?userId=1`

**Request Body**:
```json
{
  "campaignId": [1, 2],        // Optional: Array of campaign IDs
  "slotId": [1, 2],            // Optional: Array of slot IDs
  "adId": [5, 6],              // Optional: Array of ad IDs
  "siteId": [1, 2],            // Optional: Array of site/POS IDs
  "interval": "7d"             // Required: "1d", "7d", or "30d"
}
```

**Interval Options**:
- `"1d"`: Daily buckets (last 30 days)
- `"7d"`: Weekly buckets (last 7*30 days) 
- `"30d"`: Monthly buckets (last 30*30 days)

**Response Format**:
```json
{
  "status": 1,
  "message": "success", 
  "data": {
    "total": {
      "impression": {
        "2025-01-01": 12000,
        "2025-01-02": 13500,
        "2025-01-03": 11800
      },
      "click": {
        "2025-01-01": 300,
        "2025-01-02": 351,
        "2025-01-03": 295
      },
      "conversion": {
        "2025-01-01": 5,
        "2025-01-02": 7,
        "2025-01-03": 4
      }
    },
    "adStats": {
      "5": {
        "impression": {...},
        "click": {...},
        "conversion": {...}
      }
    }
  }
}
```

---

### 3. **GET Breakdown Data** `/metrics/breakdown`

**Purpose**: Retrieves analytics data grouped by demographic or platform dimensions.

**Method**: `POST`

**URL**: `https://ext1.buyhatke.com/buhatkeAdDashboard-test/metrics/breakdown?userId=1`

**Request Body**:
```json
{
  "from": "2025-01-01",
  "to": "2025-01-31",
  "campaignId": [1, 2],        // Optional: Array of campaign IDs
  "slotId": [1, 2],            // Optional: Array of slot IDs
  "adId": [5, 6],              // Optional: Array of ad IDs
  "siteId": [1, 2],            // Optional: Array of site/POS IDs
  "by": "gender"               // Required: grouping dimension
}
```

**Grouping Options (`by` parameter)**:
- `"gender"`: Group by user gender
- `"platform"`: Group by platform/device type
- `"location"`: Group by geographic location  
- `"age"`: Group by age buckets (returns ageBucket0-ageBucket7)

**Age Bucket Mapping**:
- `ageBucket0`: 13-18 years
- `ageBucket1`: 18-24 years
- `ageBucket2`: 25-34 years
- `ageBucket3`: 35-44 years
- `ageBucket4`: 45-54 years
- `ageBucket5`: 55-64 years
- `ageBucket6`: 65+ years
- `ageBucket7`: NA (Not Available)

**Response Format**:
```json
{
  "status": 1,
  "message": "success",
  "data": [
    {
      "gender": "Male",          // Grouping field (varies by 'by' parameter)
      "eventType": 0,           // 0 = impression, 1 = click, 2 = conversion
      "eventCount": 25000,
      "campaignId": 1           // Additional fields if filtered
    },
    {
      "gender": "Female",
      "eventType": 0,
      "eventCount": 20000,
      "campaignId": 1
    }
  ]
}
```

---

### 4. **GET Table Data** `/metrics/table`

**Purpose**: Retrieves top-performing entities (locations, slots, ads) in tabular format.

**Method**: `POST`

**URL**: `https://ext1.buyhatke.com/buhatkeAdDashboard-test/metrics/table?userId=1`

**Request Body**:
```json
{
  "type": "location",          // Required: "location", "slotId", or "adId"
  "sortBy": "impressions"      // Required: "impressions" or "clicks"
}
```

**Type Options**:
- `"location"`: Top 5 locations by performance
- `"slotId"`: Top 5 slots by performance
- `"adId"`: Top 5 ads by performance

**Response Format**:
```json
{
  "status": 1,
  "message": "success",
  "data": {
    "tableData": {
      "Mumbai": {
        "impressions": 45000,
        "clicks": 1350
      },
      "Delhi": {
        "impressions": 38000,
        "clicks": 1140
      }
    }
  }
}
```

---

## Filter Options

### Campaign Filters
- **Source**: `/campaigns` endpoint
- **Format**: Array of campaign IDs
- **Usage**: Filter analytics by specific campaigns
- **Example**: `"campaignId": [1, 2, 3]`

### Slot Filters  
- **Source**: `/slots` endpoint
- **Format**: Array of slot IDs
- **Usage**: Filter analytics by specific ad slots
- **Example**: `"slotId": [1, 2, 3]`

### Site/POS Filters
- **Source**: `/ads/siteDetails` endpoint  
- **Format**: Array of site/POS IDs
- **Usage**: Filter analytics by specific marketplaces
- **Example**: `"siteId": [1, 2, 3]`

### Ad Filters
- **Format**: Array of ad IDs
- **Usage**: Filter analytics by specific ads
- **Example**: `"adId": [5, 6, 7]`

### Date Range Filters
- **Format**: ISO date strings (YYYY-MM-DD)
- **Usage**: Define time period for analysis
- **Example**: 
  ```json
  {
    "from": "2025-01-01",
    "to": "2025-01-31"
  }
  ```

---

## Event Type Mapping

| Event Type | Value | Description |
|------------|-------|-------------|
| Impression | 0 | Ad was displayed to user |
| Click | 1 | User clicked on the ad |
| Conversion | 2 | User completed desired action |

---

## Time Range Presets

| Range | Description | API Format |
|-------|-------------|------------|
| 1 Day | Last 24 hours | `"1d"` |
| 7 Days | Last week | `"7d"` |
| 30 Days | Last month | `"30d"` |
| 90 Days | Last quarter | Custom date range |

---

## Usage Examples

### Example 1: Get Overall Campaign Performance
```javascript
const response = await fetch('/metrics/all?userId=1', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    from: '2025-01-01',
    to: '2025-01-31',
    campaignId: [1, 2, 3]
  })
});
```

### Example 2: Get Weekly Trend for Specific Slots
```javascript
const response = await fetch('/metrics/trend?userId=1', {
  method: 'POST', 
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    slotId: [1, 2],
    interval: '7d'
  })
});
```

### Example 3: Get Gender Breakdown
```javascript
const response = await fetch('/metrics/breakdown?userId=1', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    from: '2025-01-01',
    to: '2025-01-31',
    campaignId: [1],
    by: 'gender'
  })
});
```

### Example 4: Get Top Locations
```javascript
const response = await fetch('/metrics/table?userId=1', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'location',
    sortBy: 'impressions'
  })
});
```

---

## Frontend Integration

### Analytics Dashboard Features

1. **Filter Selection**:
   - Campaign multi-select dropdown
   - Slot multi-select dropdown  
   - Site/POS multi-select dropdown
   - Date range picker
   - Time interval selector

2. **Manual Data Fetching**:
   - "Fetch Results" button triggers API calls
   - No automatic refresh on filter changes
   - Loading states during API calls
   - Success/error notifications

3. **Data Visualization**:
   - Key metrics cards (impressions, clicks, CTR, conversions)
   - Trend line charts over time
   - Breakdown pie charts by demographics
   - Top performers data tables
   - Combo charts (impressions vs conversions/CTR)

4. **View Modes**:
   - Campaign-wise analytics
   - Slot-wise analytics  
   - Ad-wise analytics
   - POS-wise analytics

---

## Error Handling

### Common Error Responses

```json
{
  "status": 0,
  "message": "Failed!",
  "err": "Invalid Dates!"
}
```

### Error Types
- **Invalid Dates**: Start date >= end date
- **Invalid Interval**: Interval not in ["1d", "7d", "30d"]
- **Invalid Grouping**: Breakdown `by` parameter not in valid options
- **Invalid Type**: Table `type` parameter not in valid options
- **Invalid Sort**: Table `sortBy` parameter not in valid options

---

## Performance Notes

- All filtering parameters are optional except date ranges (for `/metrics/all` and `/metrics/breakdown`)
- API supports both single values and arrays for ID filters
- Trend endpoint automatically calculates time ranges based on interval
- Table endpoint returns top 5 results by default
- Age breakdown uses predefined buckets for optimal performance

---

## Support

For technical issues or feature requests, please contact the development team with:
- API endpoint used
- Request payload
- Expected vs actual response
- Error messages (if any) 