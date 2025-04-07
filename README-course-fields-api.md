# Course Fields API

This API allows you to request specific fields from the course data, making your frontend more efficient by only fetching the data you need.

## Endpoint

```
GET /api/courses/fields
```

## Query Parameters

### Fields Parameter

The `fields` parameter allows you to specify which fields you want to retrieve. You can use:

1. **Individual fields**: Comma-separated list of field names
2. **Predefined field sets**: Special keywords that return a predefined set of fields

#### Individual Fields

```
/api/courses/fields?fields=title,category,image,prices
```

#### Predefined Field Sets

The API includes several predefined field sets for common UI components:

- `card`: Fields needed for course cards (includes title, category, tag, image, duration, isFree, status, categoryType, prices, slug, views, ratings, effortsPerWeek, sessions)
- `list`: Fields needed for course lists
- `detail`: All fields needed for course detail pages
- `search`: Fields needed for search results
- `related`: Fields needed for related courses

Example:
```
/api/courses/fields?fields=card
```

### Filters Parameter

The `filters` parameter allows you to filter the results:

```
/api/courses/fields?fields=card&filters[category]=Web Development&filters[isFree]=true
```

Available filters:
- `search`: Text search across title, category, and tag
- `category`: Filter by course category
- `categoryType`: Filter by category type (Free, Paid, Live, etc.)
- `status`: Filter by status (Published, Upcoming, Draft)
- `priceRange`: Filter by price range (e.g., "0-1000")
- `tag`: Filter by course tag
- `classType`: Filter by class type
- `hasCertification`: Filter by certification availability (Yes/No)
- `hasAssignments`: Filter by assignments availability (Yes/No)
- `hasProjects`: Filter by projects availability (Yes/No)
- `hasQuizzes`: Filter by quizzes availability (Yes/No)
- `isFree`: Filter by free status (true/false)
- `currency`: Filter by currency (e.g., "USD", "INR", "EUR")

Example with currency filter:
```
/api/courses/fields?fields=card&filters[currency]=USD
```

### Sort Parameter

The `sort` parameter allows you to sort the results:

```
/api/courses/fields?fields=card&sort[field]=title&sort[order]=asc
```

Available sort fields:
- `title`: Sort by course title
- `category`: Sort by course category
- `tag`: Sort by course tag
- `fee`: Sort by course fee
- `duration`: Sort by course duration
- `createdAt`: Sort by creation date
- `views`: Sort by view count
- `ratings`: Sort by average rating
- `enrollments`: Sort by enrollment count

### Pagination Parameters

The API supports pagination with `page` and `limit` parameters:

```
/api/courses/fields?fields=card&page=1&limit=10
```

## Response Format

```json
{
  "success": true,
  "data": [
    {
      "_id": "60d21b4667d0d8992e610c85",
      "course_title": "Web Development Bootcamp",
      "course_category": "Web Development",
      "course_tag": "Programming",
      "course_image": "https://example.com/image.jpg",
      "course_duration": "12 weeks",
      "isFree": false,
      "status": "Published",
      "category_type": "Paid",
      "prices": [
        {
          "currency": "USD",
          "individual": 499,
          "batch": 399
        }
      ],
      "slug": "web-development-bootcamp",
      "meta": {
        "views": 1200,
        "ratings": {
          "average": 4.5,
          "count": 150
        }
      },
      "efforts_per_Week": "3-5 hrs/week",
      "no_of_Sessions": 22
    }
  ],
  "pagination": {
    "total": 100,
    "totalPages": 10,
    "currentPage": 1,
    "limit": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

## Frontend Usage Examples

### React Hook Example

```jsx
import { useState, useEffect } from 'react';
import axios from 'axios';

const useCourses = (fields, filters = {}, sort = {}, page = 1, limit = 10) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        
        // Build query parameters
        const params = new URLSearchParams();
        params.append('fields', fields);
        
        // Add filters
        Object.entries(filters).forEach(([key, value]) => {
          params.append(`filters[${key}]`, value);
        });
        
        // Add sort
        if (sort.field && sort.order) {
          params.append('sort[field]', sort.field);
          params.append('sort[order]', sort.order);
        }
        
        // Add pagination
        params.append('page', page);
        params.append('limit', limit);
        
        const response = await axios.get(`/api/courses/fields?${params.toString()}`);
        
        setCourses(response.data.data);
        setPagination(response.data.pagination);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCourses();
  }, [fields, JSON.stringify(filters), JSON.stringify(sort), page, limit]);
  
  return { courses, loading, error, pagination };
};

export default useCourses;
```

### Usage in Components

```jsx
// Course Card Component with Required Effort and Total Learning Units
const CourseCard = () => {
  // Example with currency filter
  const { courses, loading, error } = useCourses('card', { 
    status: 'Published',
    currency: 'USD' // Filter courses with USD prices
  });
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div className="course-grid">
      {courses.map(course => (
        <div key={course._id} className="course-card">
          <img src={course.course_image} alt={course.course_title} />
          <h3>{course.course_title}</h3>
          <p>{course.course_category}</p>
          <p>{course.course_duration}</p>
          <p>{course.isFree ? 'Free' : `$${course.prices[0]?.individual || 0}`}</p>
          
          {/* Required Effort */}
          <div className="course-effort">
            <span className="effort-label">Required Effort</span>
            <span className="effort-value">{course.efforts_per_Week}</span>
          </div>
          
          {/* Total Learning Units */}
          <div className="course-units">
            <span className="units-label">Total Learning Units</span>
            <span className="units-value">{course.no_of_Sessions} Classes</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// Course Detail Component
const CourseDetail = ({ courseId }) => {
  const { courses, loading, error } = useCourses('detail', { _id: courseId });
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  const course = courses[0];
  if (!course) return <div>Course not found</div>;
  
  return (
    <div className="course-detail">
      <h1>{course.course_title}</h1>
      <p>{course.course_description.program_overview}</p>
      
      {/* Course Information */}
      <div className="course-info">
        <div className="info-item">
          <span className="info-label">Duration:</span>
          <span className="info-value">{course.course_duration}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Required Effort:</span>
          <span className="info-value">{course.efforts_per_Week}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Total Classes:</span>
          <span className="info-value">{course.no_of_Sessions}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Price:</span>
          <span className="info-value">
            {course.isFree ? 'Free' : `$${course.prices[0]?.individual || 0}`}
          </span>
        </div>
      </div>
      
      {/* More course details */}
    </div>
  );
};
```

## Benefits

1. **Reduced Data Transfer**: Only fetch the fields you need
2. **Improved Performance**: Smaller payloads mean faster loading times
3. **Flexible UI Components**: Each component can request exactly what it needs
4. **Consistent API**: One endpoint for all course data needs
5. **Future-Proof**: Easy to add new fields or predefined field sets 