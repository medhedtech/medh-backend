# Course Types API & Frontend Integration Guide

## Table of Contents
1. [Overview](#overview)
2. [API Endpoints](#api-endpoints)
3. [Frontend Integration](#frontend-integration)
4. [Advanced Features](#advanced-features)
5. [Best Practices](#best-practices)
6. [Migration Guide](#migration-guide)
7. [Error Handling](#error-handling)
8. [Performance Optimization](#performance-optimization)

## Overview

This comprehensive guide covers the integration of the new course-types API system that supports multiple course models (BlendedCourse, LiveCourse, FreeCourse) alongside the legacy Course model. The API provides unified access to both new and legacy course data with advanced search, filtering, and collaboration features.

### Key Features
- **Unified Data Access**: Single endpoints for both new and legacy course data
- **Advanced Search**: Full-text search with faceted filtering
- **Collaborative Fetching**: Multiple merge strategies for different use cases
- **Smart Deduplication**: Automatic handling of duplicate course data
- **Performance Monitoring**: Built-in analytics and optimization insights
- **Schema Comparison**: Migration planning and analysis tools

### Base URL
```
/api/v1/tcourse
```

## API Endpoints

### 1. Collaborative Course Fetch (Recommended)

#### Endpoint
```
GET /api/v1/tcourse/collab
```

#### Description
The primary endpoint for fetching courses from both new and legacy systems with advanced merge strategies, deduplication, and comparison features.

#### Query Parameters

##### Source Control
- `source` (string, default: 'both')
  - `'new'` - Fetch only from new course-types models
  - `'legacy'` - Fetch only from legacy Course model
  - `'both'` - Fetch from both sources

##### Merge Strategies
- `merge_strategy` (string, default: 'unified')
  - `'unified'` - Combine all courses into a single array
  - `'separate'` - Return courses grouped by source
  - `'prioritize_new'` - Prioritize new courses, add unique legacy courses

##### Data Processing
- `deduplicate` (boolean, default: false) - Remove duplicate courses
- `similarity_threshold` (number, 0-1, default: 0.8) - Deduplication threshold
- `include_metadata` (boolean, default: true) - Include performance metadata
- `comparison_mode` (string, default: 'summary')
  - `'detailed'` - Full schema comparison and field analysis
  - `'summary'` - Basic comparison statistics
  - `'none'` - No comparison data

##### Standard Filters
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20) - Results per page
- `search` (string) - Text search across multiple fields
- `currency` (string) - Filter by currency code
- `course_category` (string) - Filter by category
- `class_type` (string) - Filter by class type
- `course_grade` (string) - Filter by grade
- `status` (string, default: 'Published') - Filter by status
- `sort_by` (string, default: 'createdAt') - Sort field
- `sort_order` (string, default: 'desc') - Sort direction

### 2. Advanced Search

#### Endpoint
```
GET /api/v1/tcourse/search
```

#### Enhanced Features
- Full-text search with MongoDB text indexing
- Smart currency handling with USD fallback
- Multi-value filtering with comma separation
- Faceted search results for UI components
- Performance optimizations with aggregation pipelines

#### Additional Parameters
- `price_range` (string) - Format: "min-max" (e.g., "100-500")
- `certification` (string: 'Yes'|'No') - Certification availability
- `has_assignments` (string: 'Yes'|'No') - Assignments availability
- `has_projects` (string: 'Yes'|'No') - Projects availability
- `has_quizzes` (string: 'Yes'|'No') - Quizzes availability
- `exclude_ids` (string) - Comma-separated course IDs to exclude
- `user_id` (string) - User ID to exclude enrolled courses
- `group_by_type` (string, default: 'false') - Group results by type

### 3. Unified Course Access

#### Get All Courses
```
GET /api/v1/tcourse/all
```

#### Get Courses by Type
```
GET /api/v1/tcourse/:type
```

#### Get Single Course
```
GET /api/v1/tcourse/:type/:id
```

### 4. Course Management

#### Create Course
```
POST /api/v1/tcourse/
```

#### Update Course
```
PUT /api/v1/tcourse/:type/:id
```

#### Delete Course
```
DELETE /api/v1/tcourse/:type/:id
```

### 5. Curriculum Management

#### Get Curriculum
```
GET /api/v1/tcourse/:type/:id/curriculum
```

#### Curriculum Operations
```
POST /api/v1/tcourse/:type/:id/curriculum/weeks
PUT /api/v1/tcourse/:type/:id/curriculum/weeks/:weekId
DELETE /api/v1/tcourse/:type/:id/curriculum/weeks/:weekId
POST /api/v1/tcourse/:type/:id/curriculum/weeks/:weekId/lessons
POST /api/v1/tcourse/:type/:id/curriculum/weeks/:weekId/sections
POST /api/v1/tcourse/:type/:id/curriculum/weeks/:weekId/live-classes
GET /api/v1/tcourse/:type/:id/curriculum/stats
```

## Frontend Integration

### 1. Course Service Implementation

#### React/JavaScript Service
```javascript
// courseService.js
class CourseService {
  constructor(baseURL = '/api/v1/tcourse') {
    this.baseURL = baseURL;
  }

  // Collaborative course fetching
  async fetchCourses(options = {}) {
    const {
      source = 'both',
      merge_strategy = 'unified',
      deduplicate = false,
      page = 1,
      limit = 20,
      search = '',
      filters = {},
      include_metadata = true
    } = options;

    const params = new URLSearchParams({
      source,
      merge_strategy,
      deduplicate: deduplicate.toString(),
      page: page.toString(),
      limit: limit.toString(),
      include_metadata: include_metadata.toString(),
      ...filters
    });

    if (search) params.append('search', search);

    try {
      const response = await fetch(`${this.baseURL}/collab?${params}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      throw error;
    }
  }

  // Advanced search with facets
  async searchCourses(searchOptions = {}) {
    const {
      search = '',
      filters = {},
      sort = { by: 'createdAt', order: 'desc' },
      pagination = { page: 1, limit: 20 },
      groupByType = false
    } = searchOptions;

    const params = new URLSearchParams({
      search,
      sort_by: sort.by,
      sort_order: sort.order,
      page: pagination.page.toString(),
      limit: pagination.limit.toString(),
      group_by_type: groupByType.toString(),
      ...filters
    });

    try {
      const response = await fetch(`${this.baseURL}/search?${params}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to search courses:', error);
      throw error;
    }
  }

  // Get single course
  async getCourse(type, id, options = {}) {
    const { currency, include_legacy = true } = options;
    const params = new URLSearchParams({
      include_legacy: include_legacy.toString()
    });
    
    if (currency) params.append('currency', currency);

    try {
      const response = await fetch(`${this.baseURL}/${type}/${id}?${params}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch course:', error);
      throw error;
    }
  }

  // Curriculum management
  async getCurriculum(type, id) {
    try {
      const response = await fetch(`${this.baseURL}/${type}/${id}/curriculum`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch curriculum:', error);
      throw error;
    }
  }

  async addWeekToCurriculum(type, id, weekData) {
    try {
      const response = await fetch(`${this.baseURL}/${type}/${id}/curriculum/weeks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(weekData)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to add week:', error);
      throw error;
    }
  }
}

export default new CourseService();
```

### 2. React Hooks for Course Management

#### useCourses Hook
```javascript
// hooks/useCourses.js
import { useState, useEffect, useCallback } from 'react';
import courseService from '../services/courseService';

export const useCourses = (initialOptions = {}) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({});
  const [metadata, setMetadata] = useState({});
  const [facets, setFacets] = useState({});

  const fetchCourses = useCallback(async (options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await courseService.fetchCourses({
        ...initialOptions,
        ...options
      });

      setCourses(response.data);
      setPagination(response.pagination);
      setMetadata(response.metadata || {});
      setFacets(response.facets || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [initialOptions]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const refetch = useCallback((newOptions = {}) => {
    return fetchCourses(newOptions);
  }, [fetchCourses]);

  return {
    courses,
    loading,
    error,
    pagination,
    metadata,
    facets,
    refetch
  };
};
```

#### useAdvancedSearch Hook
```javascript
// hooks/useAdvancedSearch.js
import { useState, useCallback, useMemo } from 'react';
import courseService from '../services/courseService';
import { debounce } from 'lodash';

export const useAdvancedSearch = () => {
  const [searchState, setSearchState] = useState({
    query: '',
    filters: {},
    sort: { by: 'createdAt', order: 'desc' },
    pagination: { page: 1, limit: 20 }
  });

  const [results, setResults] = useState({
    courses: [],
    facets: {},
    pagination: {},
    loading: false,
    error: null
  });

  const debouncedSearch = useMemo(
    () => debounce(async (searchOptions) => {
      setResults(prev => ({ ...prev, loading: true, error: null }));

      try {
        const response = await courseService.searchCourses(searchOptions);
        setResults({
          courses: response.data,
          facets: response.facets || {},
          pagination: response.pagination,
          loading: false,
          error: null
        });
      } catch (error) {
        setResults(prev => ({
          ...prev,
          loading: false,
          error: error.message
        }));
      }
    }, 300),
    []
  );

  const search = useCallback((newSearchState = {}) => {
    const updatedState = { ...searchState, ...newSearchState };
    setSearchState(updatedState);
    debouncedSearch(updatedState);
  }, [searchState, debouncedSearch]);

  const updateFilters = useCallback((newFilters) => {
    search({
      filters: { ...searchState.filters, ...newFilters },
      pagination: { ...searchState.pagination, page: 1 }
    });
  }, [search, searchState]);

  const updateSort = useCallback((sortBy, sortOrder = 'desc') => {
    search({
      sort: { by: sortBy, order: sortOrder },
      pagination: { ...searchState.pagination, page: 1 }
    });
  }, [search, searchState]);

  const updatePagination = useCallback((page, limit) => {
    search({
      pagination: { page, limit: limit || searchState.pagination.limit }
    });
  }, [search, searchState]);

  return {
    searchState,
    results,
    search,
    updateFilters,
    updateSort,
    updatePagination
  };
};
```

### 3. React Components

#### CourseList Component
```javascript
// components/CourseList.jsx
import React from 'react';
import { useCourses } from '../hooks/useCourses';
import CourseCard from './CourseCard';
import Pagination from './Pagination';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

const CourseList = ({ 
  source = 'both', 
  merge_strategy = 'unified',
  deduplicate = true,
  filters = {} 
}) => {
  const {
    courses,
    loading,
    error,
    pagination,
    metadata,
    refetch
  } = useCourses({
    source,
    merge_strategy,
    deduplicate,
    ...filters
  });

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={() => refetch()} />;

  return (
    <div className="course-list">
      {/* Performance Metrics */}
      {metadata.performance && (
        <div className="performance-info">
          <small>
            Loaded {courses.length} courses in {
              (metadata.performance.new_model?.fetch_time_ms || 0) +
              (metadata.performance.legacy_model?.fetch_time_ms || 0)
            }ms
            {metadata.deduplication && (
              <span> • {metadata.deduplication.duplicates_removed} duplicates removed</span>
            )}
          </small>
        </div>
      )}

      {/* Course Grid */}
      <div className="course-grid">
        {courses.map(course => (
          <CourseCard 
            key={course._id} 
            course={course}
            showSource={source === 'both'}
          />
        ))}
      </div>

      {/* Pagination */}
      <Pagination
        current={pagination.page}
        total={pagination.totalPages}
        pageSize={pagination.limit}
        onChange={(page) => refetch({ page })}
      />
    </div>
  );
};

export default CourseList;
```

#### AdvancedSearchComponent
```javascript
// components/AdvancedSearch.jsx
import React, { useState } from 'react';
import { useAdvancedSearch } from '../hooks/useAdvancedSearch';
import SearchFilters from './SearchFilters';
import CourseGrid from './CourseGrid';
import FacetedFilters from './FacetedFilters';

const AdvancedSearch = () => {
  const {
    searchState,
    results,
    search,
    updateFilters,
    updateSort,
    updatePagination
  } = useAdvancedSearch();

  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="advanced-search">
      {/* Search Header */}
      <div className="search-header">
        <div className="search-input-container">
          <input
            type="text"
            placeholder="Search courses..."
            value={searchState.query}
            onChange={(e) => search({ query: e.target.value })}
            className="search-input"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="filter-toggle"
          >
            Filters {Object.keys(searchState.filters).length > 0 && 
              `(${Object.keys(searchState.filters).length})`}
          </button>
        </div>

        {/* Sort Options */}
        <div className="sort-options">
          <select
            value={`${searchState.sort.by}-${searchState.sort.order}`}
            onChange={(e) => {
              const [by, order] = e.target.value.split('-');
              updateSort(by, order);
            }}
          >
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="popularity-desc">Most Popular</option>
            <option value="ratings-desc">Highest Rated</option>
          </select>
        </div>
      </div>

      <div className="search-content">
        {/* Faceted Filters Sidebar */}
        {showFilters && (
          <div className="filters-sidebar">
            <FacetedFilters
              facets={results.facets}
              activeFilters={searchState.filters}
              onFilterChange={updateFilters}
            />
          </div>
        )}

        {/* Results */}
        <div className="search-results">
          {results.loading ? (
            <LoadingSpinner />
          ) : results.error ? (
            <ErrorMessage message={results.error} />
          ) : (
            <>
              <div className="results-header">
                <span>{results.pagination.total || 0} courses found</span>
              </div>
              
              <CourseGrid 
                courses={results.courses}
                onPageChange={updatePagination}
                pagination={results.pagination}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvancedSearch;
```

#### FacetedFilters Component
```javascript
// components/FacetedFilters.jsx
import React from 'react';

const FacetedFilters = ({ facets, activeFilters, onFilterChange }) => {
  const handleFilterToggle = (filterType, value) => {
    const currentValues = activeFilters[filterType]?.split(',') || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    
    onFilterChange({
      [filterType]: newValues.length > 0 ? newValues.join(',') : undefined
    });
  };

  const renderFacetGroup = (title, facetData, filterKey) => {
    if (!facetData || facetData.length === 0) return null;
  
  return (
      <div className="facet-group">
        <h4>{title}</h4>
        <div className="facet-options">
          {facetData.map(item => {
            const isActive = activeFilters[filterKey]?.includes(item._id);
            return (
              <label key={item._id} className="facet-option">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={() => handleFilterToggle(filterKey, item._id)}
                />
                <span>{item._id} ({item.count})</span>
              </label>
            );
          })}
        </div>
    </div>
  );
};

  return (
    <div className="faceted-filters">
      <h3>Filter Courses</h3>
      
      {renderFacetGroup('Categories', facets.categories, 'course_category')}
      {renderFacetGroup('Class Types', facets.classTypes, 'class_type')}
      {renderFacetGroup('Delivery Format', facets.deliveryFormats, 'delivery_format')}
      {renderFacetGroup('Tags', facets.tags, 'course_tag')}

      {/* Price Range Filter */}
      {facets.priceRanges && facets.priceRanges.length > 0 && (
        <div className="facet-group">
          <h4>Price Range</h4>
          <div className="price-range-inputs">
            <input
              type="number"
              placeholder="Min"
              onChange={(e) => {
                const max = activeFilters.price_range?.split('-')[1] || '';
                onFilterChange({
                  price_range: e.target.value ? `${e.target.value}-${max}` : undefined
                });
              }}
            />
            <input
              type="number"
              placeholder="Max"
              onChange={(e) => {
                const min = activeFilters.price_range?.split('-')[0] || '';
                onFilterChange({
                  price_range: e.target.value ? `${min}-${e.target.value}` : undefined
                });
              }}
            />
          </div>
        </div>
      )}

      {/* Feature Filters */}
      <div className="facet-group">
        <h4>Course Features</h4>
        {['certification', 'has_assignments', 'has_projects', 'has_quizzes'].map(feature => (
          <label key={feature} className="facet-option">
            <input
              type="checkbox"
              checked={activeFilters[feature] === 'Yes'}
              onChange={(e) => onFilterChange({
                [feature]: e.target.checked ? 'Yes' : undefined
              })}
            />
            <span>{feature.replace('has_', '').replace('_', ' ')}</span>
          </label>
        ))}
      </div>

      {/* Clear Filters */}
      {Object.keys(activeFilters).length > 0 && (
        <button
          onClick={() => onFilterChange({})}
          className="clear-filters-btn"
        >
          Clear All Filters
        </button>
      )}
    </div>
  );
};

export default FacetedFilters;
```

### 4. Migration Dashboard Component

```javascript
// components/MigrationDashboard.jsx
import React, { useState, useEffect } from 'react';
import courseService from '../services/courseService';

const MigrationDashboard = () => {
  const [migrationData, setMigrationData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchMigrationData = async () => {
      try {
        const response = await courseService.fetchCourses({
          source: 'both',
          merge_strategy: 'separate',
          comparison_mode: 'detailed',
          include_metadata: true,
          limit: 1000 // Get all for analysis
        });
        setMigrationData(response);
      } catch (error) {
        console.error('Failed to fetch migration data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMigrationData();
  }, []);

  if (loading) return <div>Loading migration analysis...</div>;
  if (!migrationData) return <div>Failed to load migration data</div>;

  const { data, comparison, metadata } = migrationData;
  const newCourses = data.new_courses || [];
  const legacyCourses = data.legacy_courses || [];

  return (
    <div className="migration-dashboard">
      <h2>Course Migration Dashboard</h2>

      {/* Overview Stats */}
      <div className="migration-stats">
        <div className="stat-card">
          <h3>New Model Courses</h3>
          <div className="stat-number">{newCourses.length}</div>
          <div className="stat-breakdown">
            {metadata.performance?.new_model?.breakdown && 
              Object.entries(metadata.performance.new_model.breakdown).map(([type, count]) => (
                <div key={type}>{type}: {count}</div>
              ))
            }
          </div>
        </div>

        <div className="stat-card">
          <h3>Legacy Courses</h3>
          <div className="stat-number">{legacyCourses.length}</div>
          <div className="stat-breakdown">
            {metadata.performance?.legacy_model?.type_distribution &&
              Object.entries(metadata.performance.legacy_model.type_distribution).map(([type, count]) => (
                <div key={type}>{type}: {count}</div>
              ))
            }
          </div>
        </div>

        <div className="stat-card">
          <h3>Migration Progress</h3>
          <div className="stat-number">
            {((newCourses.length / (newCourses.length + legacyCourses.length)) * 100).toFixed(1)}%
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ 
                width: `${(newCourses.length / (newCourses.length + legacyCourses.length)) * 100}%` 
              }}
            />
          </div>
        </div>
      </div>

      {/* Schema Comparison */}
      {comparison?.detailed && (
        <div className="schema-comparison">
          <h3>Schema Analysis</h3>
          <div className="schema-stats">
            <div className="schema-section">
              <h4>New Model Only Fields</h4>
              <ul>
                {comparison.detailed.schema_differences.new_only_fields.map(field => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            </div>
            
            <div className="schema-section">
              <h4>Legacy Only Fields</h4>
              <ul>
                {comparison.detailed.schema_differences.legacy_only_fields.map(field => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            </div>
            
            <div className="schema-section">
              <h4>Common Fields</h4>
              <div>
                {comparison.detailed.schema_differences.common_fields.length} shared fields
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      {metadata.performance && (
        <div className="performance-metrics">
          <h3>Performance Analysis</h3>
          <div className="performance-stats">
            <div className="perf-stat">
              <label>New Model Fetch Time:</label>
              <span>{metadata.performance.new_model?.fetch_time_ms || 0}ms</span>
            </div>
            <div className="perf-stat">
              <label>Legacy Model Fetch Time:</label>
              <span>{metadata.performance.legacy_model?.fetch_time_ms || 0}ms</span>
            </div>
            {metadata.deduplication && (
              <div className="perf-stat">
                <label>Deduplication Time:</label>
                <span>{metadata.deduplication.processing_time_ms}ms</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MigrationDashboard;
```

## Advanced Features

### 1. Real-time Course Updates

```javascript
// hooks/useRealtimeCourses.js
import { useState, useEffect } from 'react';
import { useCourses } from './useCourses';

export const useRealtimeCourses = (options = {}) => {
  const courseData = useCourses(options);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      // Check for updates every 30 seconds
      courseData.refetch();
      setLastUpdate(Date.now());
    }, 30000);

    return () => clearInterval(interval);
  }, [courseData.refetch]);

  return {
    ...courseData,
    lastUpdate
  };
};
```

### 2. Course Comparison Tool

```javascript
// components/CourseComparison.jsx
import React, { useState } from 'react';
import courseService from '../services/courseService';

const CourseComparison = ({ courseIds }) => {
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);

  const compareSchemas = async () => {
    setLoading(true);
    try {
      const response = await courseService.fetchCourses({
        source: 'both',
        merge_strategy: 'separate',
        comparison_mode: 'detailed',
        exclude_ids: courseIds.join(',')
      });
      setComparisonData(response.comparison);
    } catch (error) {
      console.error('Comparison failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="course-comparison">
      <button onClick={compareSchemas} disabled={loading}>
        {loading ? 'Analyzing...' : 'Compare Schemas'}
      </button>
      
      {comparisonData && (
        <div className="comparison-results">
          {/* Render comparison data */}
        </div>
      )}
    </div>
  );
};
```

### 3. Performance Monitor

```javascript
// components/PerformanceMonitor.jsx
import React, { useState, useEffect } from 'react';

const PerformanceMonitor = ({ metadata }) => {
  const [performanceHistory, setPerformanceHistory] = useState([]);

  useEffect(() => {
    if (metadata?.performance) {
      setPerformanceHistory(prev => [
        ...prev.slice(-9), // Keep last 10 entries
        {
          timestamp: Date.now(),
          newModel: metadata.performance.new_model?.fetch_time_ms || 0,
          legacyModel: metadata.performance.legacy_model?.fetch_time_ms || 0
        }
      ]);
    }
  }, [metadata]);

  const averagePerformance = performanceHistory.reduce((acc, curr) => ({
    newModel: acc.newModel + curr.newModel,
    legacyModel: acc.legacyModel + curr.legacyModel
  }), { newModel: 0, legacyModel: 0 });

  if (performanceHistory.length > 0) {
    averagePerformance.newModel /= performanceHistory.length;
    averagePerformance.legacyModel /= performanceHistory.length;
  }

  return (
    <div className="performance-monitor">
      <h4>Performance Metrics</h4>
      <div className="metrics">
        <div className="metric">
          <label>Avg New Model:</label>
          <span>{averagePerformance.newModel.toFixed(1)}ms</span>
        </div>
        <div className="metric">
          <label>Avg Legacy Model:</label>
          <span>{averagePerformance.legacyModel.toFixed(1)}ms</span>
        </div>
      </div>
    </div>
  );
};
```

## Best Practices

### 1. API Usage Patterns

#### Recommended Approach
```javascript
// Use collaborative endpoint for most use cases
const courses = await courseService.fetchCourses({
  source: 'both',
  merge_strategy: 'unified',
  deduplicate: true,
  include_metadata: true
});
```

#### Migration Strategy
```javascript
// During migration, prioritize new courses
const courses = await courseService.fetchCourses({
  source: 'both',
  merge_strategy: 'prioritize_new',
  comparison_mode: 'detailed'
});
```

#### Performance Optimization
```javascript
// For large datasets, use pagination and metadata
const courses = await courseService.fetchCourses({
  limit: 50,
  include_metadata: true,
  deduplicate: false // Disable for better performance if not needed
});
```

### 2. Error Handling

```javascript
// Comprehensive error handling
const handleCourseOperation = async (operation) => {
  try {
    const result = await operation();
    return { success: true, data: result };
  } catch (error) {
    console.error('Course operation failed:', error);
    
    // Handle specific error types
    if (error.message.includes('404')) {
      return { success: false, error: 'Course not found' };
    } else if (error.message.includes('403')) {
      return { success: false, error: 'Access denied' };
    } else if (error.message.includes('timeout')) {
      return { success: false, error: 'Request timeout - please try again' };
    }
    
    return { success: false, error: 'An unexpected error occurred' };
  }
};
```

### 3. Caching Strategy

```javascript
// Simple cache implementation
class CourseCache {
  constructor(ttl = 5 * 60 * 1000) { // 5 minutes
    this.cache = new Map();
    this.ttl = ttl;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  set(key, data) {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.ttl
    });
  }

  clear() {
    this.cache.clear();
  }
}

const courseCache = new CourseCache();
```

### 4. State Management

#### Redux Integration
   ```javascript
// Redux slice for courses
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import courseService from '../services/courseService';

export const fetchCourses = createAsyncThunk(
  'courses/fetchCourses',
  async (options, { rejectWithValue }) => {
    try {
      return await courseService.fetchCourses(options);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const coursesSlice = createSlice({
  name: 'courses',
  initialState: {
    data: [],
    loading: false,
    error: null,
    pagination: {},
    metadata: {},
    facets: {}
  },
  reducers: {
    clearCourses: (state) => {
      state.data = [];
      state.error = null;
    },
    updateFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCourses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCourses.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload.data;
        state.pagination = action.payload.pagination;
        state.metadata = action.payload.metadata;
        state.facets = action.payload.facets;
      })
      .addCase(fetchCourses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearCourses, updateFilters } = coursesSlice.actions;
export default coursesSlice.reducer;
```

## Migration Guide

### Phase 1: Parallel Operation
1. Deploy new course-types models alongside legacy
2. Use collaborative endpoint with `merge_strategy: 'unified'`
3. Monitor performance and data consistency

### Phase 2: Gradual Migration
1. Switch to `merge_strategy: 'prioritize_new'`
2. Begin migrating legacy courses to new models
3. Use deduplication to handle overlaps

### Phase 3: Legacy Deprecation
1. Migrate remaining legacy courses
2. Switch to `source: 'new'` for new features
3. Maintain `source: 'both'` for backward compatibility

### Migration Checklist
- [ ] Test collaborative endpoint with existing data
- [ ] Implement error handling for both models
- [ ] Set up performance monitoring
- [ ] Create migration dashboard
- [ ] Plan data validation strategy
- [ ] Prepare rollback procedures

## Error Handling

### API Error Responses
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information",
  "code": "ERROR_CODE"
}
```

### Common Error Codes
- `COURSE_NOT_FOUND` - Course ID not found in any model
- `INVALID_COURSE_TYPE` - Unsupported course type
- `VALIDATION_ERROR` - Request validation failed
- `DATABASE_ERROR` - Database operation failed
- `AUTHENTICATION_ERROR` - Authentication required
- `AUTHORIZATION_ERROR` - Insufficient permissions

### Frontend Error Handling
```javascript
const handleApiError = (error, context = '') => {
  const errorMap = {
    'COURSE_NOT_FOUND': 'The requested course could not be found.',
    'VALIDATION_ERROR': 'Please check your input and try again.',
    'DATABASE_ERROR': 'A server error occurred. Please try again later.',
    'AUTHENTICATION_ERROR': 'Please log in to continue.',
    'AUTHORIZATION_ERROR': 'You do not have permission to perform this action.'
  };

  const userMessage = errorMap[error.code] || error.message || 'An unexpected error occurred.';
  
  // Log for debugging
  console.error(`${context} Error:`, error);
  
  // Show user-friendly message
  return userMessage;
};
```

## Performance Optimization

### 1. Query Optimization
- Use appropriate pagination limits
- Implement field selection for large datasets
- Utilize MongoDB aggregation pipelines
- Cache frequently accessed data

### 2. Frontend Optimization
- Implement virtual scrolling for large lists
- Use React.memo for course components
- Debounce search inputs
- Lazy load course details

### 3. Monitoring
- Track API response times
- Monitor deduplication performance
- Analyze search query patterns
- Set up performance alerts

This comprehensive guide provides everything needed to integrate the collaborative course API system with modern frontend applications while maintaining backward compatibility and optimal performance. 