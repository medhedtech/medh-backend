# Batch Analytics Dashboard API Documentation

This documentation covers the analytics and dashboard APIs for the Batch Management System that provide comprehensive insights into batch performance, student assignments, and instructor workload.

## Base URL
```
http://localhost:8080/api/v1/batches/analytics
```

## Authentication
All endpoints require JWT authentication and admin/super-admin role.

**Headers Required:**
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

---

## 📊 **1. Get Complete Dashboard Analytics**

**Endpoint:** `GET /dashboard`

**Description:** Returns comprehensive analytics data for the entire batch management dashboard including overview statistics, status distribution, assignment types, and instructor workload.

### Request
```bash
GET /api/v1/batches/analytics/dashboard?period=30
```

### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `period` | number | 30 | Number of days for analytics period |

### Response
```json
{
  "success": true,
  "message": "Batch analytics retrieved successfully",
  "data": {
    "overview": {
      "total_batches": {
        "value": 15,
        "change": 12.5,
        "period": "Last 30 days"
      },
      "active_students": {
        "value": 285,
        "change": 8.2,
        "description": "Currently enrolled"
      },
      "capacity_utilization": {
        "value": 82.5,
        "change": 4.1,
        "description": "Average across all batches"
      },
      "active_batches": {
        "value": 8,
        "change": 0,
        "description": "Currently running"
      },
      "individual_assignments": {
        "value": 142,
        "change": 15.3,
        "description": "Student-instructor pairs"
      },
      "unassigned_students": {
        "value": 8,
        "change": 23.1,
        "description": "Need instructor assignment"
      }
    },
    "batch_status_distribution": [
      {
        "status": "Active",
        "count": 8,
        "percentage": 53
      },
      {
        "status": "Upcoming", 
        "count": 4,
        "percentage": 27
      },
      {
        "status": "Completed",
        "count": 3,
        "percentage": 20
      },
      {
        "status": "Cancelled",
        "count": 0,
        "percentage": 0
      }
    ],
    "assignment_types": [
      {
        "type": "Mentor",
        "count": 45,
        "percentage": 32
      },
      {
        "type": "Tutor",
        "count": 38,
        "percentage": 27
      },
      {
        "type": "Advisor",
        "count": 32,
        "percentage": 23
      },
      {
        "type": "Supervisor",
        "count": 27,
        "percentage": 19
      }
    ],
    "instructor_workload": [
      {
        "_id": "instructor_id_1",
        "name": "Dr. Sarah Johnson",
        "email": "sarah.johnson@medh.co",
        "active_batches": 3,
        "total_students": 75,
        "total_batches": 4,
        "utilization": 75
      },
      {
        "_id": "instructor_id_2", 
        "name": "Prof. Michael Chen",
        "email": "michael.chen@medh.co",
        "active_batches": 2,
        "total_students": 50,
        "total_batches": 3,
        "utilization": 50
      }
    ],
    "period": "Last 30 days"
  }
}
```

---

## 📈 **2. Get Batch Status Distribution**

**Endpoint:** `GET /status-distribution`

**Description:** Returns the distribution of batches by their current status with counts and percentages.

### Request
```bash
GET /api/v1/batches/analytics/status-distribution
```

### Response
```json
{
  "success": true,
  "message": "Batch status distribution retrieved successfully",
  "data": {
    "distribution": [
      {
        "status": "Active",
        "count": 8,
        "percentage": 53
      },
      {
        "status": "Upcoming",
        "count": 4, 
        "percentage": 27
      },
      {
        "status": "Completed",
        "count": 3,
        "percentage": 20
      },
      {
        "status": "Cancelled",
        "count": 0,
        "percentage": 0
      }
    ],
    "total_batches": 15
  }
}
```

---

## 👥 **3. Get Instructor Workload Analytics**

**Endpoint:** `GET /instructor-workload`

**Description:** Returns detailed workload analytics for all instructors including their active batches, total students, and utilization rates.

### Request
```bash
GET /api/v1/batches/analytics/instructor-workload
```

### Response
```json
{
  "success": true,
  "message": "Instructor workload analytics retrieved successfully",
  "data": [
    {
      "_id": "6836bb36d5d3e50e4b812b84",
      "name": "Dr. Sarah Johnson",
      "email": "sarah.johnson@medh.co",
      "active_batches": 3,
      "total_students": 75,
      "total_batches": 4,
      "utilization": 75
    },
    {
      "_id": "6836bb36d5d3e50e4b812b85",
      "name": "Prof. Michael Chen", 
      "email": "michael.chen@medh.co",
      "active_batches": 2,
      "total_students": 50,
      "total_batches": 3,
      "utilization": 50
    },
    {
      "_id": "6836bb36d5d3e50e4b812b86",
      "name": "Dr. Priya Sharma",
      "email": "priya.sharma@medh.co",
      "active_batches": 2,
      "total_students": 60,
      "total_batches": 2,
      "utilization": 60
    },
    {
      "_id": "6836bb36d5d3e50e4b812b87",
      "name": "Mr. Alex Rodriguez",
      "email": "alex.rodriguez@medh.co", 
      "active_batches": 1,
      "total_students": 25,
      "total_batches": 1,
      "utilization": 25
    }
  ]
}
```

---

## 📊 **4. Get Capacity Utilization Analytics**

**Endpoint:** `GET /capacity`

**Description:** Returns detailed capacity utilization analytics including overall utilization rates and individual batch details.

### Request
```bash
GET /api/v1/batches/analytics/capacity
```

### Response
```json
{
  "success": true,
  "message": "Capacity analytics retrieved successfully",
  "data": {
    "overall_utilization": 82.5,
    "total_capacity": 500,
    "total_enrolled": 412,
    "capacity_percentage": 82,
    "batch_details": [
      {
        "batch_id": "6836bb36d5d3e50e4b812b84",
        "batch_name": "Web Development Batch March 2025",
        "capacity": 30,
        "enrolled": 28,
        "utilization": 93.3,
        "status": "Active"
      },
      {
        "batch_id": "6836bb36d5d3e50e4b812b85",
        "batch_name": "Data Science Fundamentals",
        "capacity": 25,
        "enrolled": 18,
        "utilization": 72.0,
        "status": "Active"
      }
    ]
  }
}
```

---

## 🔧 **Frontend Integration Examples**

### React/JavaScript Integration

```javascript
// Fetch complete dashboard data
const fetchDashboardAnalytics = async (period = 30) => {
  try {
    const response = await fetch(`/api/v1/batches/analytics/dashboard?period=${period}`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    throw error;
  }
};

// Usage in React component
const DashboardComponent = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const data = await fetchDashboardAnalytics(30);
        setAnalytics(data);
      } catch (error) {
        console.error('Failed to load analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadAnalytics();
  }, []);
  
  if (loading) return <div>Loading analytics...</div>;
  
  return (
    <div className="dashboard">
      {/* Overview Cards */}
      <div className="overview-cards">
        <div className="card">
          <h3>Total Batches</h3>
          <div className="value">{analytics.overview.total_batches.value}</div>
          <div className="change">
            {analytics.overview.total_batches.change}% vs last period
          </div>
        </div>
        
        <div className="card">
          <h3>Active Students</h3>
          <div className="value">{analytics.overview.active_students.value}</div>
          <div className="change">
            {analytics.overview.active_students.change}% vs last period
          </div>
        </div>
        
        <div className="card">
          <h3>Capacity Utilization</h3>
          <div className="value">{analytics.overview.capacity_utilization.value}%</div>
          <div className="change">
            {analytics.overview.capacity_utilization.change}% vs last period
          </div>
        </div>
      </div>
      
      {/* Status Distribution Chart */}
      <div className="status-distribution">
        <h3>Batch Status Distribution</h3>
        {analytics.batch_status_distribution.map(status => (
          <div key={status.status} className="status-item">
            <span>{status.status}</span>
            <span>{status.count} ({status.percentage}%)</span>
          </div>
        ))}
      </div>
      
      {/* Instructor Workload Table */}
      <div className="instructor-workload">
        <h3>Instructor Workload</h3>
        <table>
          <thead>
            <tr>
              <th>Instructor</th>
              <th>Active Batches</th>
              <th>Total Students</th>
              <th>Utilization</th>
            </tr>
          </thead>
          <tbody>
            {analytics.instructor_workload.map(instructor => (
              <tr key={instructor._id}>
                <td>{instructor.name}</td>
                <td>{instructor.active_batches}</td>
                <td>{instructor.total_students}</td>
                <td>{instructor.utilization}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

### Data Refresh Function
```javascript
// Function to refresh analytics data with different time periods
const refreshAnalytics = async (period) => {
  try {
    const [dashboard, statusDist, workload, capacity] = await Promise.all([
      fetch(`/api/v1/batches/analytics/dashboard?period=${period}`),
      fetch('/api/v1/batches/analytics/status-distribution'),
      fetch('/api/v1/batches/analytics/instructor-workload'),
      fetch('/api/v1/batches/analytics/capacity')
    ]);
    
    const data = await Promise.all([
      dashboard.json(),
      statusDist.json(), 
      workload.json(),
      capacity.json()
    ]);
    
    return {
      dashboard: data[0].data,
      statusDistribution: data[1].data,
      instructorWorkload: data[2].data,
      capacity: data[3].data
    };
  } catch (error) {
    console.error('Error refreshing analytics:', error);
    throw error;
  }
};
```

---

## 📋 **Response Status Codes**

| Status Code | Description |
|-------------|-------------|
| `200` | Success - Analytics retrieved successfully |
| `401` | Unauthorized - Invalid or missing JWT token |
| `403` | Forbidden - Insufficient permissions (requires admin/super-admin) |
| `500` | Internal Server Error - Server-side error |

---

## 🚀 **Performance Notes**

- **Caching**: Consider implementing Redis caching for analytics data as it involves complex aggregations
- **Pagination**: For large datasets, implement pagination on instructor workload and capacity details
- **Real-time Updates**: Consider WebSocket connections for real-time dashboard updates
- **Database Indexing**: Ensure proper indexes on `status`, `created_at`, `assigned_instructor`, and `enrollment_date` fields

---

## 🔍 **Testing the APIs**

### cURL Examples

```bash
# Get complete dashboard analytics
curl -X GET "http://localhost:8080/api/v1/batches/analytics/dashboard?period=30" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get status distribution
curl -X GET "http://localhost:8080/api/v1/batches/analytics/status-distribution" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get instructor workload
curl -X GET "http://localhost:8080/api/v1/batches/analytics/instructor-workload" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get capacity analytics  
curl -X GET "http://localhost:8080/api/v1/batches/analytics/capacity" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

This comprehensive analytics API provides all the data needed to power your batch management dashboard with real-time insights into batch performance, student enrollment, and instructor utilization. 