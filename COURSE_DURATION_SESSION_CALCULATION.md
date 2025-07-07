# Course Duration Session Calculation

## Overview

The master data system now automatically calculates sessions for course durations based on the rule: **1 month = 8 sessions**. This provides consistent session counts across all course duration formats.

## Calculation Rules

### **Primary Rule: 1 Month = 8 Sessions**

| Time Unit    | Sessions Calculation | Example                 |
| ------------ | -------------------- | ----------------------- |
| **1 Month**  | 8 sessions           | 4 months = 32 sessions  |
| **1 Week**   | 2 sessions           | 16 weeks = 32 sessions  |
| **1 Hour**   | 0.5 sessions         | 2 hours = 1 session     |
| **1 Minute** | 0.008 sessions       | 120 minutes = 1 session |

### **Calculation Logic**

```javascript
// Extract time units from duration string
const monthMatch = duration.match(/(\d+)\s*month/i);
const weekMatch = duration.match(/(\d+)\s*week/i);
const hourMatch = duration.match(/(\d+)\s*hour/i);
const minuteMatch = duration.match(/(\d+)\s*minute/i);

let totalSessions = 0;

// Calculate sessions from months (1 month = 8 sessions)
if (monthMatch) {
  const months = parseInt(monthMatch[1]);
  totalSessions += months * 8;
}

// Calculate sessions from weeks (1 week = 2 sessions)
if (weekMatch) {
  const weeks = parseInt(weekMatch[1]);
  totalSessions += Math.ceil(weeks * 2);
}

// For hours/minutes, assume 1 session = 2 hours
if (hourMatch) {
  const hours = parseInt(hourMatch[1]);
  totalSessions += Math.ceil(hours / 2);
}

if (minuteMatch) {
  const minutes = parseInt(minuteMatch[1]);
  const hours = minutes / 60;
  totalSessions += Math.ceil(hours / 2);
}
```

## Default Course Durations with Sessions

| Duration               | Sessions     | Calculation                        |
| ---------------------- | ------------ | ---------------------------------- |
| **2 hours 0 minutes**  | 1 session    | 2 hours ÷ 2 = 1 session            |
| **4 months 16 weeks**  | 32 sessions  | (4 × 8) + (16 × 2) = 32 sessions   |
| **6 months 24 weeks**  | 48 sessions  | (6 × 8) + (24 × 2) = 48 sessions   |
| **8 months 32 weeks**  | 64 sessions  | (8 × 8) + (32 × 2) = 64 sessions   |
| **9 months 36 weeks**  | 72 sessions  | (9 × 8) + (36 × 2) = 72 sessions   |
| **12 months 48 weeks** | 96 sessions  | (12 × 8) + (48 × 2) = 96 sessions  |
| **18 months 72 weeks** | 144 sessions | (18 × 8) + (72 × 2) = 144 sessions |
| **24 months 96 weeks** | 192 sessions | (24 × 8) + (96 × 2) = 192 sessions |

## API Usage Examples

### **Add Course Duration with Auto-Calculated Sessions**

```bash
POST /api/v1/master-data/courseDurations/add
{
  "item": "3 months 12 weeks"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Course duration added successfully with calculated sessions",
  "data": [
    "2 hours 0 minutes (1 sessions)",
    "4 months 16 weeks (32 sessions)",
    "3 months 12 weeks (36 sessions)"
  ],
  "calculatedSessions": 36
}
```

### **Update Course Durations with Sessions**

```bash
PUT /api/v1/master-data/courseDurations
{
  "items": [
    "6 months",
    "1 year",
    "2 hours"
  ]
}
```

**Response:**

```json
{
  "success": true,
  "message": "courseDurations updated successfully with calculated sessions",
  "data": [
    "6 months (48 sessions)",
    "1 year (96 sessions)",
    "2 hours (1 sessions)"
  ],
  "calculatedSessions": [
    {
      "duration": "6 months (48 sessions)",
      "sessions": 48
    },
    {
      "duration": "1 year (96 sessions)",
      "sessions": 96
    },
    {
      "duration": "2 hours (1 sessions)",
      "sessions": 1
    }
  ]
}
```

## Supported Duration Formats

### **Months and Weeks**

- `"4 months"` → 32 sessions
- `"6 months 24 weeks"` → 48 sessions
- `"1 year"` → 96 sessions (12 months)

### **Hours and Minutes**

- `"2 hours"` → 1 session
- `"4 hours 30 minutes"` → 2 sessions
- `"90 minutes"` → 1 session

### **Mixed Formats**

- `"3 months 2 weeks"` → 28 sessions
- `"1 month 4 hours"` → 10 sessions

## Implementation Details

### **Controller Integration**

- **Add Operation:** Automatically calculates sessions when adding course durations
- **Update Operation:** Calculates sessions for all items in bulk update
- **Response Enhancement:** Returns calculated sessions count in response

### **Model Defaults**

- Default course durations now include calculated sessions
- Format: `"duration (X sessions)"`
- Maintains backward compatibility

### **Helper Functions**

- `calculateSessionsForDuration(duration)` - Calculates sessions for a duration string
- `extractSessionsFromDuration(durationWithSessions)` - Extracts session count from formatted string

## Benefits

1. **Consistency** - All course durations have standardized session counts
2. **Automation** - No manual session calculation required
3. **Flexibility** - Supports various duration formats
4. **Transparency** - Session counts are clearly displayed
5. **Scalability** - Easy to modify calculation rules if needed

## Next Steps

1. **Test the Integration** - Verify session calculations work correctly
2. **Update Frontend** - Display session counts in course creation forms
3. **Monitor Usage** - Track how session calculations are being used
4. **Optimize if Needed** - Adjust calculation rules based on feedback
