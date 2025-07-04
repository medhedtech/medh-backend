# Course Types Integration - Unified Pricing & Legacy Compatibility

## Overview

This document summarizes the major improvements made to the course types system to achieve complete feature parity with the legacy course model while maintaining better structure and type safety.

## Key Improvements Made

### ✅ 1. Unified Pricing Structure

**Before:**
- New course types had different pricing structures for each type
- Blended: `{individual, group, enterprise}`
- Live: `{regular, early_bird, group_discount}`
- Free: No pricing

**After:**
- All course types now use the same legacy-compatible pricing structure:
```javascript
prices: [{
  currency: "USD" | "EUR" | "INR" | "GBP" | "AUD" | "CAD",
  individual: number,
  batch: number,
  min_batch_size: number,
  max_batch_size: number,
  early_bird_discount: number, // 0-100%
  group_discount: number,      // 0-100%
  is_active: boolean
}]
```

### ✅ 2. Complete Legacy Field Compatibility

Added all missing legacy fields to the base course schema:

#### Core Legacy Fields
- `subtitle_languages: string[]` - Multi-language support
- `no_of_Sessions: number` - Session count (min: 0 for free courses)
- `course_duration: string` - Course duration
- `session_duration: string` - Session duration
- `category_type: "Paid" | "Live" | "Free"` - Legacy category type
- `isFree: boolean` - Free course flag
- `class_type: "Blended Courses" | "Live Courses" | "Self-Paced"` - Class delivery type

#### Assessment & Certification Fields
- `is_Certification: "Yes" | "No"` - Certification availability
- `is_Assignments: "Yes" | "No"` - Assignments availability
- `is_Projects: "Yes" | "No"` - Projects availability
- `is_Quizes: "Yes" | "No"` - Quizzes availability

#### Metadata Fields
- `efforts_per_Week: string` - Time commitment description
- `min_hours_per_week: number` - Minimum time commitment
- `max_hours_per_week: number` - Maximum time commitment
- `related_courses: string[]` - Related course IDs

#### Advanced Features
- `assigned_instructor: ObjectId` - Instructor assignment
- `specifications: ObjectId` - Category specifications
- `unique_key: string` - UUID identifier
- `resource_pdfs: Array<{title, url, description}>` - PDF resources
- `bonus_modules: Array<{title, description, content, order}>` - Additional content
- `final_evaluation: {has_final_exam, has_final_project, ...}` - Final assessment structure

### ✅ 3. Enhanced Search & Filtering

- Added `course_grade` field to base schema
- Updated text search index to include `course_grade`
- Added `course_grade` filtering support in all query APIs:
  - `getCoursesByType`
  - `getAllCoursesUnified`
  - `searchAllCourses`

### ✅ 4. Updated Test Data

Updated test files to use the new unified structure:

#### Blended Course Example
```javascript
{
  course_type: "blended",
  // ... base fields ...
  prices: [
    {
      currency: "INR",
      individual: 15000,
      batch: 12000,
      min_batch_size: 3,
      max_batch_size: 10,
      early_bird_discount: 10,
      group_discount: 15,
      is_active: true
    }
  ],
  // Legacy compatibility fields
  no_of_Sessions: 24,
  category_type: "Paid",
  class_type: "Blended Courses",
  is_Certification: "Yes",
  // ... other legacy fields ...
}
```

#### Live Course Example
```javascript
{
  course_type: "live",
  // ... base fields ...
  prices: [
    {
      currency: "INR",
Query Parameters:
- `include_legacy` (default: "true") - Include legacy courses
- `group_by_type` (default: "false") - Group results by course type

Response includes source information:
```json
{
  "success": true,
  "count": 150,
  "data": [...],
  "sources": {
    "new_model": 50,
    "legacy_model": 100
  }
}
```

#### Get Courses by Type (New + Legacy)
```
GET /api/v1/courses/:type
```

Supported types: `blended`, `live`, `free`

Query Parameters:
- `include_legacy` (default: "true") - Include legacy courses

The system will:
1. First search in the new type-specific model
2. Then search legacy courses based on `class_type` and `category_type` filters
3. Map legacy courses to the requested type structure

#### Get Course by ID (New + Legacy)
```
GET /api/v1/courses/:type/:id
```

Query Parameters:
- `include_legacy` (default: "true") - Include legacy courses
- Use `type=auto` to auto-detect the course type from legacy data

The system will:
1. First search in the new type-specific model
2. If not found, search in legacy Course model
3. Auto-detect course type from legacy data if `type=auto`

### Legacy Mapping Logic

#### Course Type Detection
Legacy courses are mapped to types based on:

**Live Courses:**
- `class_type` contains "live" (case-insensitive)
- `category_type` contains "live" (case-insensitive)

**Blended Courses:**
- `class_type` contains "blend" (case-insensitive)
- `category_type` contains "blend" (case-insensitive)

**Free Courses:**
- `isFree: true`
- `class_type` contains "self" or "record" (case-insensitive)
- `category_type` contains "self" or "record" (case-insensitive)
- Default fallback for unmatched courses

#### Field Mapping
Legacy course fields are mapped to new structure:

```javascript
// Base mapping
{
  ...legacyCourse,
  course_type: detectedType,
  _legacy: true
}

// Type-specific additions
if (type === "blended") {
  mappedCourse.doubt_session_schedule = course.doubt_session_schedule || {};
}

if (type === "live") {
  mappedCourse.course_schedule = course.course_schedule || {};
}

if (type === "free") {
  mappedCourse.access_type = course.access_type || "unlimited";
  mappedCourse.access_duration = course.access_duration || null;
}
```

### Update and Delete Operations

#### Update Course
```
PUT /api/v1/courses/:type/:id
```

Query Parameters:
- `force_legacy` (default: "false") - Force update in legacy model

The system will:
1. Try to update in new type-specific model first
2. Fall back to legacy model if not found
3. Use `force_legacy=true` to directly update legacy model

#### Delete Course
```
DELETE /api/v1/courses/:type/:id
```

Query Parameters:
- `force_legacy` (default: "false") - Force delete from legacy model

Response includes information about which model was used:
```json
{
  "success": true,
  "message": "Course deleted successfully",
  "deletedFrom": "legacy_model"
}
```

## Migration Strategy

### Phase 1: Dual Support (Current)
- Both systems work simultaneously
- New courses can be created in type-specific models
- Legacy courses remain accessible through unified endpoints
- All endpoints support both data sources

### Phase 2: Gradual Migration
- Migrate existing courses to new type-specific models
- Use migration scripts to transform legacy data
- Monitor usage and performance

### Phase 3: Legacy Deprecation
- Deprecate direct legacy course endpoints
- Keep unified endpoints as the standard interface
- Eventually remove legacy model support

## Usage Examples

### Get All Blended Courses (New + Legacy)
```bash
curl "http://localhost:3000/api/v1/courses/blended?include_legacy=true"
```

### Get Unified Course List Grouped by Type
```bash
curl "http://localhost:3000/api/v1/courses/all?group_by_type=true"
```

### Update a Course (Try New Model First, Fall Back to Legacy)
```bash
curl -X PUT "http://localhost:3000/api/v1/courses/live/60f7b3b3b3b3b3b3b3b3b3b3" \
  -H "Content-Type: application/json" \
  -d '{"course_title": "Updated Title"}'
```

### Force Update in Legacy Model
```bash
curl -X PUT "http://localhost:3000/api/v1/courses/live/60f7b3b3b3b3b3b3b3b3b3b3?force_legacy=true" \
  -H "Content-Type: application/json" \
  -d '{"course_title": "Updated Title"}'
```

### Get Course with Auto-Type Detection
```bash
curl "http://localhost:3000/api/v1/courses/auto/60f7b3b3b3b3b3b3b3b3b3b3"
```

## Error Handling

The system gracefully handles:
- Missing type-specific models
- Invalid course types
- Legacy data format inconsistencies
- Mixed data sources

Error responses include source information when available:
```json
{
  "success": false,
  "message": "Course not found",
  "searched_in": ["new_model", "legacy_model"]
}
```

## Performance Considerations

- Unified endpoints may be slower due to multiple model queries
- Use `include_legacy=false` to improve performance when only new courses are needed
- Consider caching strategies for frequently accessed unified data
- Monitor database query patterns and optimize as needed

## Best Practices

1. **New Development**: Use type-specific models for new courses
2. **Legacy Support**: Keep `include_legacy=true` for backward compatibility
3. **Migration**: Plan gradual migration of legacy courses
4. **Performance**: Use specific endpoints when legacy support isn't needed
5. **Monitoring**: Track usage of legacy vs new endpoints for migration planning 