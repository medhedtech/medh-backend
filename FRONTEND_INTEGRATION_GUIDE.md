# MEDH API Frontend Integration Guide

## Overview
This document provides comprehensive TypeScript interfaces, API client implementations, and integration patterns for the MEDH Backend API with Next.js frontend applications.

## Table of Contents
1. [Authentication System](#authentication-system)
2. [TypeScript Interfaces](#typescript-interfaces)
3. [API Client Implementation](#api-client-implementation)
4. [Parent API Integration](#parent-api-integration)
5. [Instructor API Integration](#instructor-api-integration)
6. [Program Coordinator API Integration](#program-coordinator-api-integration)
7. [Error Handling](#error-handling)
8. [Usage Examples](#usage-examples)
9. [Best Practices](#best-practices)

---

## Authentication System

### Base Configuration
```typescript
// config/api.ts
export const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
};

// Token storage utilities
export const TokenStorage = {
  get: () => typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null,
  set: (token: string) => typeof window !== 'undefined' && localStorage.setItem('auth_token', token),
  remove: () => typeof window !== 'undefined' && localStorage.removeItem('auth_token'),
};
```

### Authentication Types
```typescript
// types/auth.ts
export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
    session_id: string;
    expires_in: string;
  };
}

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: string[];
  user_image?: {
    upload_date: string;
  };
  account_type: 'free' | 'premium' | 'enterprise';
  email_verified: boolean;
  profile_completion: number;
  is_online: boolean;
  last_seen: string;
  statistics: UserStatistics;
}

export interface UserStatistics {
  learning: {
    total_courses_enrolled: number;
    total_courses_completed: number;
    total_learning_time: number;
    current_streak: number;
    longest_streak: number;
    certificates_earned: number;
    skill_points: number;
    achievements_unlocked: number;
  };
  engagement: {
    total_logins: number;
    total_session_time: number;
    avg_session_duration: number;
    last_active_date: string;
    consecutive_active_days: number;
    total_page_views: number;
    feature_usage_count: Record<string, number>;
  };
  social: {
    reviews_written: number;
    discussions_participated: number;
    content_shared: number;
    followers_count: number;
    following_count: number;
    community_reputation: number;
  };
  financial: {
    total_spent: number;
    total_courses_purchased: number;
    subscription_months: number;
    refunds_requested: number;
    lifetime_value: number;
  };
}
```

---

## TypeScript Interfaces

### Parent API Types
```typescript
// types/parent.ts
export interface ParentDashboardProfile {
  parent: {
    id: string;
    full_name: string;
    email: string;
    phone_numbers: PhoneNumber[];
    user_image?: {
      upload_date: string;
    };
    status: string;
    member_since: string;
    last_login: string;
  };
  children: Child[];
  summary: {
    total_children: number;
    active_children: number;
    permissions: ParentPermissions;
  };
}

export interface Child {
  id: string;
  full_name: string;
  age?: number;
  grade?: string;
  school?: string;
  enrollment_date: string;
  status: 'active' | 'inactive' | 'suspended';
  current_courses: Course[];
  performance_summary: {
    overall_grade: number;
    attendance_rate: number;
    assignment_completion: number;
  };
}

export interface ParentPermissions {
  can_view_grades: boolean;
  can_view_attendance: boolean;
  can_view_performance: boolean;
  can_communicate_with_instructors: boolean;
  can_schedule_meetings: boolean;
  can_make_payments: boolean;
}

export interface UpcomingClass {
  id: string;
  title: string;
  subject: string;
  instructor_name: string;
  start_time: string;
  end_time: string;
  meeting_link?: string;
  type: 'live_class' | 'demo' | 'workshop' | 'lab' | 'exam';
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
}

export interface ChildProgress {
  child_id: string;
  overall_progress: number;
  current_courses: CourseProgress[];
  performance_metrics: {
    grade_average: number;
    attendance_rate: number;
    assignment_completion_rate: number;
    improvement_trend: 'improving' | 'stable' | 'declining';
  };
  recent_achievements: Achievement[];
}

export interface ChildAttendance {
  child_id: string;
  attendance_rate: number;
  recent_attendance: AttendanceRecord[];
  monthly_summary: Record<string, {
    total_classes: number;
    attended_classes: number;
    attendance_percentage: number;
  }>;
}

export interface ParentNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  priority: 'low' | 'medium' | 'high';
  child_id?: string;
  read: boolean;
  created_at: string;
  action_required: boolean;
  action_url?: string;
}
```

### Instructor API Types
```typescript
// types/instructor.ts
export interface InstructorCourse {
  _id: string;
  title: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration_weeks: number;
  total_students: number;
  status: 'active' | 'inactive' | 'completed';
  start_date: string;
  end_date: string;
  schedule: ClassSchedule[];
}

export interface ClassSchedule {
  day_of_week: number; // 0-6 (Sunday-Saturday)
  start_time: string;
  end_time: string;
  timezone: string;
}

export interface CourseStudent {
  student: {
    _id: string;
    full_name: string;
    email: string;
    enrollment_date: string;
    status: 'active' | 'inactive' | 'completed' | 'dropped';
  };
  progress: {
    completion_percentage: number;
    current_module: string;
    last_activity: string;
    grade_average: number;
  };
  attendance: {
    total_classes: number;
    attended_classes: number;
    attendance_rate: number;
  };
}

export interface InstructorStats {
  overview: {
    total_courses: number;
    active_students: number;
    completed_courses: number;
    average_rating: number;
  };
  recent_activity: {
    classes_this_week: number;
    new_enrollments: number;
    pending_assignments: number;
    unread_messages: number;
  };
  performance: {
    student_satisfaction: number;
    course_completion_rate: number;
    average_attendance_rate: number;
    revenue_this_month: number;
  };
}

export interface AttendanceSession {
  batch_id: string;
  session_date: string;
  session_type: 'live_class' | 'demo' | 'workshop' | 'lab' | 'exam' | 'presentation';
  session_title: string;
  session_duration_minutes?: number;
  attendance_records: AttendanceRecord[];
  session_notes?: string;
  meeting_link?: string;
  recording_link?: string;
  materials_shared?: SessionMaterial[];
}

export interface AttendanceRecord {
  student_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  join_time?: string;
  leave_time?: string;
  duration_minutes?: number;
  notes?: string;
}

export interface SessionMaterial {
  name: string;
  url: string;
  type: 'document' | 'video' | 'presentation' | 'code' | 'other';
}

export interface RevenueStats {
  total_revenue: number;
  monthly_revenue: number;
  revenue_growth: number;
  top_earning_courses: Array<{
    course_id: string;
    course_name: string;
    revenue: number;
    student_count: number;
  }>;
  payment_breakdown: {
    subscription: number;
    one_time: number;
    corporate: number;
  };
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  student_count: number;
  course_completions: number;
  refunds: number;
  net_revenue: number;
}

export interface CourseBatch {
  _id: string;
  name: string;
  course_id: string;
  instructor_id: string;
  start_date: string;
  end_date: string;
  schedule: ClassSchedule[];
  student_capacity: number;
  enrolled_students: number;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  meeting_details: {
    platform: string;
    meeting_id?: string;
    meeting_link?: string;
  };
}
```

### Program Coordinator API Types
```typescript
// types/coordinator.ts
export interface CoordinatorDashboard {
  recent_activities: RecentActivity[];
  quick_stats: {
    total_courses: number;
    active_enrollments: number;
    pending_applications: number;
    active_classes_today: number;
    technical_issues_reported: number;
    instructor_performance_alerts: number;
  };
  quick_access: QuickAccessItem[];
}

export interface RecentActivity {
  id: string;
  type: 'enrollment_approved' | 'instructor_assigned' | 'course_created' | 'issue_reported' | 'feedback_received';
  description: string;
  timestamp: string;
  priority: 'low' | 'medium' | 'high';
  related_entity?: {
    type: 'course' | 'student' | 'instructor' | 'batch';
    id: string;
    name: string;
  };
}

export interface QuickAccessItem {
  name: string;
  count: number;
  url: string;
  icon?: string;
  badge_color?: 'red' | 'yellow' | 'green' | 'blue';
}

export interface CourseOversight {
  _id: string;
  title: string;
  description: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  instructor: {
    id: string;
    name: string;
    email: string;
  };
  status: 'active' | 'inactive' | 'completed' | 'draft';
  enrollment_stats: {
    total_enrolled: number;
    capacity: number;
    completion_rate: number;
    average_rating: number;
  };
  schedule: {
    start_date: string;
    end_date: string;
    duration_weeks: number;
    classes_per_week: number;
  };
  progress_metrics: {
    modules_completed: number;
    total_modules: number;
    overall_progress: number;
    attendance_rate: number;
  };
  recent_issues: CourseIssue[];
}

export interface CourseIssue {
  type: 'technical' | 'content' | 'instructor' | 'student';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  reported_date: string;
  status?: 'open' | 'in_progress' | 'resolved';
  reporter?: {
    id: string;
    name: string;
    role: string;
  };
}

export interface CourseProgress {
  course_id: string;
  overall_progress: number;
  module_progress: ModuleProgress[];
  student_performance: {
    total_students: number;
    active_students: number;
    at_risk_students: number;
    top_performers: number;
    avg_completion_time: string;
  };
  instructor_metrics: {
    response_time: string;
    feedback_quality: number;
    engagement_score: number;
  };
  recommendations: CourseRecommendation[];
}

export interface ModuleProgress {
  module_name: string;
  completion_rate: number;
  avg_score: number;
  difficulty_rating?: number;
  feedback_score?: number;
}

export interface CourseRecommendation {
  type: 'improvement' | 'warning' | 'opportunity';
  area: string;
  suggestion: string;
  priority: 'low' | 'medium' | 'high';
  estimated_impact?: 'low' | 'medium' | 'high';
  implementation_effort?: 'low' | 'medium' | 'high';
}

export interface EnrollmentApplication {
  application_id: string;
  student: {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    background: string;
    experience_level: 'beginner' | 'intermediate' | 'advanced';
  };
  course: {
    id: string;
    title: string;
    category: string;
    level: 'beginner' | 'intermediate' | 'advanced';
  };
  application_details: {
    submitted_date: string;
    motivation: string;
    prerequisites_met: boolean;
    payment_status: 'pending' | 'completed' | 'failed';
    documents_submitted: string[];
    priority_score: number;
  };
  status: 'pending' | 'approved' | 'rejected' | 'waitlisted';
  coordinator_notes: string;
  last_updated: string;
}

export interface ApplicationReview {
  application_id: string;
  decision: 'approved' | 'rejected' | 'waitlisted';
  reviewed_by: string;
  review_date: string;
  reason: string;
  notes: string;
  batch_assignment?: string;
  next_steps: string;
}

export interface WaitlistEntry {
  position: number;
  student: {
    id: string;
    full_name: string;
    email: string;
    application_date: string;
  };
  course: {
    id: string;
    title: string;
    current_capacity: number;
    enrolled_count: number;
  };
  estimated_availability: string;
  priority_score: number;
  waitlist_date: string;
  contact_attempts?: number;
  last_contacted?: string;
}

export interface ClassMonitoring {
  class_id: string;
  course: {
    id: string;
    title: string;
    module: string;
  };
  instructor: {
    id: string;
    name: string;
    status: 'online' | 'offline' | 'busy';
  };
  schedule: {
    start_time: string;
    end_time: string;
    duration_minutes: number;
  };
  attendance: {
    total_students: number;
    present: number;
    absent: number;
    late_joiners: number;
    attendance_rate: number;
  };
  technical_status: {
    platform: 'Zoom' | 'Teams' | 'Google Meet' | 'Custom';
    connection_quality: 'excellent' | 'good' | 'fair' | 'poor';
    audio_quality: 'excellent' | 'good' | 'fair' | 'poor';
    video_quality: 'excellent' | 'good' | 'fair' | 'poor';
    issues_reported: number;
  };
  engagement_metrics: {
    chat_messages: number;
    questions_asked: number;
    polls_conducted: number;
    engagement_score: number;
  };
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
}

export interface InstructorPerformance {
  instructor: {
    id: string;
    name: string;
    email: string;
    specializations: string[];
  };
  performance_metrics: {
    student_satisfaction: number;
    completion_rate: number;
    attendance_rate: number;
    response_time: string;
    engagement_score: number;
  };
  course_stats: {
    total_courses: number;
    active_students: number;
    completed_students: number;
    classes_conducted: number;
  };
  recent_feedback: {
    positive_count: number;
    negative_count: number;
    improvement_suggestions: number;
  };
  alerts: PerformanceAlert[];
}

export interface PerformanceAlert {
  type: 'low_engagement' | 'poor_rating' | 'attendance_drop' | 'technical_issues';
  course: string;
  severity: 'low' | 'medium' | 'high';
  date: string;
  description?: string;
  recommended_action?: string;
}

export interface AttendanceReport {
  summary: {
    overall_attendance_rate: number;
    total_classes_conducted: number;
    total_student_sessions: number;
    attendance_trend: 'improving' | 'stable' | 'declining';
  };
  by_course: CourseAttendance[];
  by_instructor: InstructorAttendance[];
  by_batch: BatchAttendance[];
  attendance_alerts: AttendanceAlert[];
}

export interface CourseAttendance {
  course_id: string;
  course_title: string;
  attendance_rate: number;
  total_classes: number;
  enrolled_students: number;
  at_risk_students: number;
}

export interface InstructorAttendance {
  instructor_id: string;
  instructor_name: string;
  courses_taught: number;
  avg_attendance_rate: number;
  total_classes: number;
}

export interface BatchAttendance {
  batch_id: string;
  batch_name: string;
  course_title: string;
  attendance_rate: number;
  student_count: number;
  class_count: number;
}

export interface AttendanceAlert {
  type: 'low_attendance' | 'frequent_absences' | 'batch_risk' | 'instructor_concern';
  entity: string;
  course: string;
  attendance_rate: number;
  severity: 'low' | 'medium' | 'high';
  recommended_action?: string;
}

export interface ProgramAnalytics {
  program_overview: {
    program_id: string;
    total_courses: number;
    total_students: number;
    total_instructors: number;
    completion_rate: number;
    satisfaction_score: number;
  };
  key_metrics: {
    enrollment_growth: {
      current_period: number;
      previous_period: number;
      growth_rate: number;
    };
    revenue_metrics: {
      total_revenue: number;
      avg_revenue_per_student: number;
      revenue_growth: number;
    };
    operational_efficiency: {
      instructor_utilization: number;
      class_fill_rate: number;
      resource_utilization: number;
    };
  };
  performance_indicators: {
    student_success_rate: number;
    course_completion_rate: number;
    student_satisfaction: number;
    instructor_performance: number;
    technical_reliability: number;
  };
  trends_analysis: {
    enrollment_trend: 'increasing' | 'stable' | 'decreasing';
    completion_trend: 'improving' | 'stable' | 'declining';
    satisfaction_trend: 'improving' | 'stable' | 'declining';
    revenue_trend: 'increasing' | 'stable' | 'decreasing';
  };
  recommendations: AnalyticsRecommendation[];
}

export interface AnalyticsRecommendation {
  area: string;
  suggestion: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  priority?: 'low' | 'medium' | 'high';
  estimated_roi?: string;
}

export interface ResourceAllocation {
  resource_summary: {
    total_resources: number;
    allocated_resources: number;
    available_resources: number;
    utilization_rate: number;
  };
  resource_categories: {
    [key: string]: {
      total: number;
      allocated: number;
      utilization: number;
    };
  };
  allocation_by_course: CourseResourceAllocation[];
  resource_requests: {
    pending: number;
    approved: number;
    rejected: number;
    under_review: number;
  };
}

export interface CourseResourceAllocation {
  course_id: string;
  course_title: string;
  resources_allocated: number;
  resource_value: number;
  utilization_rate: number;
}

export interface ResourceUtilization {
  utilization_metrics: {
    overall_utilization: number;
    peak_utilization: number;
    low_utilization: number;
    avg_utilization: number;
  };
  by_resource_type: {
    [key: string]: {
      utilization: number;
      trend: 'increasing' | 'stable' | 'decreasing';
    };
  };
  underutilized_resources: UnderutilizedResource[];
  optimization_opportunities: OptimizationOpportunity[];
}

export interface UnderutilizedResource {
  resource_id: string;
  resource_name: string;
  current_utilization: number;
  allocated_to: string;
  recommendation: string;
}

export interface OptimizationOpportunity {
  opportunity: string;
  potential_savings: number;
  implementation_effort: 'low' | 'medium' | 'high';
  priority?: 'low' | 'medium' | 'high';
}

export interface CustomReportRequest {
  report_name: string;
  data_sources: string[];
  filters: Record<string, any>;
  metrics: string[];
  format: 'pdf' | 'excel' | 'csv' | 'json';
  schedule?: 'one_time' | 'daily' | 'weekly' | 'monthly';
}

export interface CustomReportResponse {
  report_id: string;
  report_name: string;
  status: 'generating' | 'completed' | 'failed';
  estimated_completion: string;
  created_by: string;
  data_sources: string[];
  filters: Record<string, any>;
  metrics: string[];
  format: string;
  schedule: string;
  progress: number;
}
```

### Common Types
```typescript
// types/common.ts
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  status?: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Array<{
    type: string;
    msg: string;
    path: string;
    location: string;
    value?: any;
  }>;
  error_code?: string;
  hint?: string;
}

export interface PhoneNumber {
  country: string;
  number: string;
  type?: string;
  isVerified?: boolean;
}

export interface Course {
  _id: string;
  title: string;
  description: string;
  instructor: {
    id: string;
    name: string;
  };
  level: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  tags: string[];
  duration_weeks: number;
  price: number;
  rating: number;
  total_students: number;
  thumbnail?: string;
  status: 'active' | 'inactive' | 'coming_soon';
}

export interface CourseProgress {
  course_id: string;
  course_title: string;
  progress_percentage: number;
  current_module: string;
  modules_completed: number;
  total_modules: number;
  last_accessed: string;
  estimated_completion: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  type: 'completion' | 'performance' | 'streak' | 'milestone';
  earned_date: string;
  points_awarded: number;
  badge_url?: string;
}
```

---

## API Client Implementation

### Base API Client
```typescript
// lib/api-client.ts
import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { API_CONFIG, TokenStorage } from '../config/api';
import { ApiResponse, ApiError } from '../types/common';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.baseURL,
      timeout: API_CONFIG.timeout,
      headers: API_CONFIG.headers,
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = TokenStorage.get();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle errors
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          TokenStorage.remove();
          // Redirect to login page
          window.location.href = '/login';
        }
        return Promise.reject(this.handleError(error));
      }
    );
  }

  private handleError(error: AxiosError): ApiError {
    if (error.response?.data) {
      return error.response.data as ApiError;
    }
    
    return {
      success: false,
      message: error.message || 'An unexpected error occurred',
      error_code: 'NETWORK_ERROR',
    };
  }

  async get<T>(url: string, params?: any): Promise<ApiResponse<T>> {
    const response = await this.client.get(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.client.post(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.client.put(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<ApiResponse<T>> {
    const response = await this.client.delete(url);
    return response.data;
  }
}

export const apiClient = new ApiClient();
```

### Authentication API
```typescript
// lib/auth-api.ts
import { apiClient } from './api-client';
import { LoginRequest, AuthResponse } from '../types/auth';
import { TokenStorage } from '../config/api';

export class AuthAPI {
  static async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse['data']>('/auth/login', credentials);
    
    if (response.success && response.data.token) {
      TokenStorage.set(response.data.token);
    }
    
    return {
      success: response.success,
      message: response.message,
      data: response.data,
    };
  }

  static async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      TokenStorage.remove();
    }
  }

  static async logoutAllDevices(): Promise<void> {
    try {
      await apiClient.post('/auth/logout-all-devices');
    } finally {
      TokenStorage.remove();
    }
  }

  static async refreshToken(): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse['data']>('/auth/refresh');
    
    if (response.success && response.data.token) {
      TokenStorage.set(response.data.token);
    }
    
    return {
      success: response.success,
      message: response.message,
      data: response.data,
    };
  }

  static async getCurrentUser(): Promise<AuthResponse['data']['user']> {
    const response = await apiClient.get<AuthResponse['data']['user']>('/auth/me');
    return response.data;
  }

  static isAuthenticated(): boolean {
    return !!TokenStorage.get();
  }
}
```

### Parent API Client
```typescript
// lib/parent-api.ts
import { apiClient } from './api-client';
import {
  ParentDashboardProfile,
  UpcomingClass,
  ChildProgress,
  ChildAttendance,
  ParentNotification,
  Child,
} from '../types/parent';

export class ParentAPI {
  // Dashboard endpoints
  static async getDashboardProfile(): Promise<ParentDashboardProfile> {
    const response = await apiClient.get<ParentDashboardProfile>('/parent/dashboard/profile');
    return response.data;
  }

  static async getUpcomingClasses(): Promise<UpcomingClass[]> {
    const response = await apiClient.get<{ classes: UpcomingClass[] }>('/parent/dashboard/classes/upcoming');
    return response.data.classes;
  }

  static async getChildProgress(childId: string): Promise<ChildProgress> {
    const response = await apiClient.get<ChildProgress>(`/parent/dashboard/progress/${childId}`);
    return response.data;
  }

  static async getChildAttendance(childId: string): Promise<ChildAttendance> {
    const response = await apiClient.get<ChildAttendance>(`/parent/dashboard/attendance/${childId}`);
    return response.data;
  }

  // Parent management endpoints
  static async getChildren(): Promise<ParentDashboardProfile> {
    const response = await apiClient.get<ParentDashboardProfile>('/parent/children');
    return response.data;
  }

  static async linkChild(childId: string, relationship: string = 'parent'): Promise<{ linkId: string; relationship: string }> {
    const response = await apiClient.post<{ linkId: string; relationship: string }>('/parent/link-child', {
      childId,
      relationship,
    });
    return response.data;
  }

  // Notification endpoints
  static async getNotifications(): Promise<{ notifications: ParentNotification[]; unread_count: number }> {
    const response = await apiClient.get<{ notifications: ParentNotification[]; unread_count: number }>('/parent/notifications');
    return response.data;
  }

  static async markNotificationAsRead(notificationId: string): Promise<{ notification_id: string; read_at: Date }> {
    const response = await apiClient.put<{ notification_id: string; read_at: Date }>(`/parent/notifications/${notificationId}/read`);
    return response.data;
  }

  // Academic tracking endpoints
  static async getTimetable(): Promise<any> {
    const response = await apiClient.get('/parent/timetable');
    return response.data;
  }

  static async getAttendanceReports(): Promise<any> {
    const response = await apiClient.get('/parent/attendance');
    return response.data;
  }

  static async getClassRecordings(): Promise<any> {
    const response = await apiClient.get('/parent/classes/recordings');
    return response.data;
  }

  static async getPerformanceTracking(): Promise<any> {
    const response = await apiClient.get('/parent/performance/tracking');
    return response.data;
  }

  static async getPendingAssignments(): Promise<any> {
    const response = await apiClient.get('/parent/assignments/pending');
    return response.data;
  }

  static async getGradeReports(): Promise<any> {
    const response = await apiClient.get('/parent/grades');
    return response.data;
  }

  // Communication endpoints
  static async getMessages(): Promise<any> {
    const response = await apiClient.get('/parent/messages');
    return response.data;
  }

  static async sendMessage(message: any): Promise<any> {
    const response = await apiClient.post('/parent/messages', message);
    return response.data;
  }

  static async getAnnouncements(): Promise<any> {
    const response = await apiClient.get('/parent/announcements');
    return response.data;
  }
}
```

### Instructor API Client
```typescript
// lib/instructor-api.ts
import { apiClient } from './api-client';
import {
  InstructorCourse,
  CourseStudent,
  InstructorStats,
  AttendanceSession,
  AttendanceRecord,
  RevenueStats,
  MonthlyRevenue,
  CourseBatch,
} from '../types/instructor';

export class InstructorAPI {
  // Dashboard endpoints
  static async getCourses(): Promise<InstructorCourse[]> {
    const response = await apiClient.get<InstructorCourse[]>('/instructors/courses');
    return response.data;
  }

  static async getCourseStudents(courseId: string): Promise<CourseStudent[]> {
    const response = await apiClient.get<CourseStudent[]>(`/instructors/students/${courseId}`);
    return response.data;
  }

  static async getDashboardStats(): Promise<InstructorStats> {
    const response = await apiClient.get<InstructorStats>('/instructors/dashboard/stats');
    return response.data;
  }

  // Attendance management
  static async getBatchAttendance(batchId: string): Promise<AttendanceRecord[]> {
    const response = await apiClient.get<AttendanceRecord[]>(`/attendance/batch/${batchId}`);
    return response.data;
  }

  static async markAttendance(attendanceData: AttendanceSession): Promise<any> {
    const response = await apiClient.post('/attendance/mark', attendanceData);
    return response.data;
  }

  static async updateAttendance(attendanceId: string, updates: Partial<AttendanceRecord>): Promise<any> {
    const response = await apiClient.put(`/attendance/${attendanceId}`, updates);
    return response.data;
  }

  // Revenue management
  static async getRevenueStats(): Promise<RevenueStats> {
    const response = await apiClient.get<RevenueStats>('/instructors/revenue/stats');
    return response.data;
  }

  static async getMonthlyRevenue(): Promise<MonthlyRevenue[]> {
    const response = await apiClient.get<MonthlyRevenue[]>('/instructors/revenue/monthly');
    return response.data;
  }

  static async getRevenueDetails(params: {
    startDate: string;
    endDate: string;
  }): Promise<any> {
    const response = await apiClient.get('/instructors/revenue/details', { params });
    return response.data;
  }

  // Course management
  static async getCourseDetails(courseId: string): Promise<InstructorCourse> {
    const response = await apiClient.get<InstructorCourse>(`/instructors/courses/${courseId}`);
    return response.data;
  }

  static async getCourseBatches(courseId: string): Promise<CourseBatch[]> {
    const response = await apiClient.get<CourseBatch[]>(`/instructors/courses/${courseId}/batches`);
    return response.data;
  }
}
```

### Program Coordinator API Client
```typescript
// lib/coordinator-api.ts
import { apiClient } from './api-client';
import {
  CoordinatorDashboard,
  CourseOversight,
  CourseProgress,
  EnrollmentApplication,
  ApplicationReview,
  WaitlistEntry,
  ClassMonitoring,
  InstructorPerformance,
  AttendanceReport,
  ProgramAnalytics,
  ResourceAllocation,
  ResourceUtilization,
  CustomReportRequest,
  CustomReportResponse,
} from '../types/coordinator';

export class CoordinatorAPI {
  // Dashboard endpoints
  static async getDashboardOverview(): Promise<CoordinatorDashboard> {
    const response = await apiClient.get<CoordinatorDashboard>('/coordinator/dashboard/overview');
    return response.data;
  }

  // Course oversight endpoints
  static async getCourses(params?: {
    status?: string;
    category?: string;
    instructor_id?: string;
    page?: number;
    limit?: number;
  }): Promise<{ courses: CourseOversight[]; pagination: any; filters_applied: any }> {
    const response = await apiClient.get<{ courses: CourseOversight[]; pagination: any; filters_applied: any }>('/coordinator/courses', params);
    return response.data;
  }

  static async getCourseProgress(courseId: string): Promise<CourseProgress> {
    const response = await apiClient.get<CourseProgress>(`/coordinator/courses/${courseId}/progress`);
    return response.data;
  }

  static async submitCourseFeedback(courseId: string, feedback: {
    feedback_type: string;
    subject: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    suggested_actions?: string[];
  }): Promise<any> {
    const response = await apiClient.post(`/coordinator/courses/${courseId}/feedback`, feedback);
    return response.data;
  }

  // Enrollment management endpoints
  static async getEnrollmentApplications(params?: {
    status?: string;
    course_id?: string;
    priority?: string;
    page?: number;
    limit?: number;
  }): Promise<{ applications: EnrollmentApplication[]; summary: any; filters_applied: any }> {
    const response = await apiClient.get<{ applications: EnrollmentApplication[]; summary: any; filters_applied: any }>('/coordinator/enrollments/applications', params);
    return response.data;
  }

  static async reviewApplication(applicationId: string, review: {
    decision: 'approved' | 'rejected' | 'waitlisted';
    reason: string;
    notes: string;
    batch_assignment?: string;
  }): Promise<ApplicationReview> {
    const response = await apiClient.put<ApplicationReview>(`/coordinator/enrollments/${applicationId}/review`, review);
    return response.data;
  }

  static async getWaitlist(courseId?: string): Promise<{ waitlisted_students: WaitlistEntry[]; waitlist_stats: any }> {
    const params = courseId ? { course_id: courseId } : undefined;
    const response = await apiClient.get<{ waitlisted_students: WaitlistEntry[]; waitlist_stats: any }>('/coordinator/enrollments/waitlist', params);
    return response.data;
  }

  // Class management endpoints
  static async monitorClasses(params?: {
    date?: string;
    status?: string;
  }): Promise<{ classes: ClassMonitoring[]; summary: any }> {
    const response = await apiClient.get<{ classes: ClassMonitoring[]; summary: any }>('/coordinator/classes/monitor', params);
    return response.data;
  }

  static async reportClassIssue(issue: {
    class_id: string;
    issue_type: 'technical' | 'content' | 'instructor' | 'student';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    immediate_action_required: boolean;
  }): Promise<any> {
    const response = await apiClient.post('/coordinator/classes/issues/report', issue);
    return response.data;
  }

  static async getClassFeedback(params?: {
    course_id?: string;
    instructor_id?: string;
    date_range?: string;
  }): Promise<any> {
    const response = await apiClient.get('/coordinator/classes/feedback', params);
    return response.data;
  }

  // Instructor management endpoints
  static async assignInstructor(instructorId: string, assignment: {
    course_id: string;
    batch_id: string;
    start_date: string;
    responsibilities: string[];
    compensation: {
      type: 'hourly' | 'fixed' | 'percentage';
      amount: number;
      currency: string;
    };
  }): Promise<any> {
    const response = await apiClient.post(`/coordinator/instructors/${instructorId}/assign`, assignment);
    return response.data;
  }

  static async getInstructorPerformance(params?: {
    instructor_id?: string;
    time_period?: string;
  }): Promise<{ instructors: InstructorPerformance[]; summary: any }> {
    const response = await apiClient.get<{ instructors: InstructorPerformance[]; summary: any }>('/coordinator/instructors/performance', params);
    return response.data;
  }

  static async getCommunicationMessages(params?: {
    flagged_only?: boolean;
    priority?: string;
    course_id?: string;
  }): Promise<any> {
    const response = await apiClient.get('/coordinator/communication/messages', params);
    return response.data;
  }

  // Attendance management endpoints
  static async getAttendanceReports(params?: {
    report_type?: string;
    course_id?: string;
    instructor_id?: string;
    batch_id?: string;
    date_range?: string;
  }): Promise<AttendanceReport> {
    const response = await apiClient.get<AttendanceReport>('/coordinator/attendance/reports', params);
    return response.data;
  }

  static async editAttendanceRecord(attendanceId: string, updates: {
    student_id: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    reason?: string;
    notes?: string;
  }): Promise<any> {
    const response = await apiClient.put(`/coordinator/attendance/${attendanceId}/edit`, updates);
    return response.data;
  }

  static async generateAttendanceSummary(request: {
    report_type: string;
    filters: Record<string, any>;
    format: 'pdf' | 'excel' | 'csv';
    include_charts?: boolean;
  }): Promise<any> {
    const response = await apiClient.post('/coordinator/attendance/summary/generate', request);
    return response.data;
  }

  // Reporting endpoints
  static async getProgramAnalytics(params?: {
    program_id?: string;
    time_period?: string;
    metrics?: string;
  }): Promise<ProgramAnalytics> {
    const response = await apiClient.get<ProgramAnalytics>('/coordinator/reports/program-analytics', params);
    return response.data;
  }

  static async generateCustomReport(request: CustomReportRequest): Promise<CustomReportResponse> {
    const response = await apiClient.post<CustomReportResponse>('/coordinator/reports/custom', request);
    return response.data;
  }

  // Resource allocation endpoints
  static async getResourcesOverview(): Promise<ResourceAllocation> {
    const response = await apiClient.get<ResourceAllocation>('/coordinator/resources/overview');
    return response.data;
  }

  static async allocateResource(allocation: {
    resource_id: string;
    course_id: string;
    quantity: number;
    allocation_period: {
      start: string;
      end: string;
    };
    notes?: string;
  }): Promise<any> {
    const response = await apiClient.post('/coordinator/resources/allocate', allocation);
    return response.data;
  }

  static async getResourceUtilization(params?: {
    resource_type?: string;
    time_period?: string;
  }): Promise<ResourceUtilization> {
    const response = await apiClient.get<ResourceUtilization>('/coordinator/resources/utilization', params);
    return response.data;
  }
}
```

## Program Coordinator API Integration

The Program Coordinator API provides comprehensive management capabilities for educational program oversight. Here's how to integrate it into your Next.js application:

### Query Key Factory Extensions
```typescript
// lib/query-keys.ts (addition to existing)
export const queryKeys = {
  // ... existing keys ...
  
  // Program Coordinator
  coordinator: {
    all: () => ['coordinator'],
    dashboard: () => [...queryKeys.coordinator.all(), 'dashboard'],
    overview: () => [...queryKeys.coordinator.dashboard(), 'overview'],
    
    // Course oversight
    courses: () => [...queryKeys.coordinator.all(), 'courses'],
    course: (courseId: string) => [...queryKeys.coordinator.courses(), courseId],
    courseProgress: (courseId: string) => [...queryKeys.coordinator.course(courseId), 'progress'],
    
    // Enrollment management
    enrollments: () => [...queryKeys.coordinator.all(), 'enrollments'],
    applications: () => [...queryKeys.coordinator.enrollments(), 'applications'],
    waitlist: () => [...queryKeys.coordinator.enrollments(), 'waitlist'],
    
    // Class management
    classes: () => [...queryKeys.coordinator.all(), 'classes'],
    classMonitoring: () => [...queryKeys.coordinator.classes(), 'monitor'],
    classFeedback: () => [...queryKeys.coordinator.classes(), 'feedback'],
    
    // Instructor management
    instructors: () => [...queryKeys.coordinator.all(), 'instructors'],
    instructorPerformance: () => [...queryKeys.coordinator.instructors(), 'performance'],
    communication: () => [...queryKeys.coordinator.all(), 'communication'],
    messages: () => [...queryKeys.coordinator.communication(), 'messages'],
    
    // Attendance management
    attendance: () => [...queryKeys.coordinator.all(), 'attendance'],
    attendanceReports: () => [...queryKeys.coordinator.attendance(), 'reports'],
    
    // Reporting
    reports: () => [...queryKeys.coordinator.all(), 'reports'],
    analytics: () => [...queryKeys.coordinator.reports(), 'analytics'],
    customReports: () => [...queryKeys.coordinator.reports(), 'custom'],
    
    // Resource allocation
    resources: () => [...queryKeys.coordinator.all(), 'resources'],
    resourcesOverview: () => [...queryKeys.coordinator.resources(), 'overview'],
    resourceUtilization: () => [...queryKeys.coordinator.resources(), 'utilization'],
  },
};
```

### Custom Hooks for Program Coordinator
```typescript
// hooks/useCoordinator.ts
import { useApiQuery, useApiMutation } from './useApiQuery';
import { CoordinatorAPI } from '../lib/coordinator-api';
import { queryKeys } from '../lib/query-keys';

export const useCoordinatorDashboard = () => {
  return useApiQuery(
    queryKeys.coordinator.overview(),
    CoordinatorAPI.getDashboardOverview,
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
      refetchInterval: 5 * 60 * 1000, // 5 minutes
    }
  );
};

export const useCourses = (filters?: any) => {
  return useApiQuery(
    [...queryKeys.coordinator.courses(), 'filtered', filters],
    () => CoordinatorAPI.getCourses(filters),
    {
      enabled: true,
      staleTime: 5 * 60 * 1000,
    }
  );
};

export const useCourseProgress = (courseId: string) => {
  return useApiQuery(
    queryKeys.coordinator.courseProgress(courseId),
    () => CoordinatorAPI.getCourseProgress(courseId),
    {
      enabled: !!courseId,
    }
  );
};

export const useEnrollmentApplications = (filters?: any) => {
  return useApiQuery(
    [...queryKeys.coordinator.applications(), 'filtered', filters],
    () => CoordinatorAPI.getEnrollmentApplications(filters)
  );
};

export const useClassMonitoring = (filters?: any) => {
  return useApiQuery(
    [...queryKeys.coordinator.classMonitoring(), 'filtered', filters],
    () => CoordinatorAPI.monitorClasses(filters),
    {
      refetchInterval: 30 * 1000, // 30 seconds for real-time monitoring
    }
  );
};

export const useInstructorPerformance = (filters?: any) => {
  return useApiQuery(
    [...queryKeys.coordinator.instructorPerformance(), 'filtered', filters],
    () => CoordinatorAPI.getInstructorPerformance(filters)
  );
};

export const useAttendanceReports = (filters?: any) => {
  return useApiQuery(
    [...queryKeys.coordinator.attendanceReports(), 'filtered', filters],
    () => CoordinatorAPI.getAttendanceReports(filters)
  );
};

export const useProgramAnalytics = (filters?: any) => {
  return useApiQuery(
    [...queryKeys.coordinator.analytics(), 'filtered', filters],
    () => CoordinatorAPI.getProgramAnalytics(filters),
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  );
};

export const useResourcesOverview = () => {
  return useApiQuery(
    queryKeys.coordinator.resourcesOverview(),
    CoordinatorAPI.getResourcesOverview
  );
};

// Mutations
export const useReviewApplication = () => {
  return useApiMutation(
    ({ applicationId, review }: { applicationId: string; review: any }) =>
      CoordinatorAPI.reviewApplication(applicationId, review),
    {
      onSuccess: () => {
        // Invalidate related queries
      },
      invalidateQueries: [
        queryKeys.coordinator.applications(),
        queryKeys.coordinator.waitlist(),
      ],
    }
  );
};

export const useReportClassIssue = () => {
  return useApiMutation(
    CoordinatorAPI.reportClassIssue,
    {
      invalidateQueries: [
        queryKeys.coordinator.classMonitoring(),
        queryKeys.coordinator.classFeedback(),
      ],
    }
  );
};

export const useAssignInstructor = () => {
  return useApiMutation(
    ({ instructorId, assignment }: { instructorId: string; assignment: any }) =>
      CoordinatorAPI.assignInstructor(instructorId, assignment),
    {
      invalidateQueries: [
        queryKeys.coordinator.instructorPerformance(),
        queryKeys.coordinator.courses(),
      ],
    }
  );
};

export const useEditAttendance = () => {
  return useApiMutation(
    ({ attendanceId, updates }: { attendanceId: string; updates: any }) =>
      CoordinatorAPI.editAttendanceRecord(attendanceId, updates),
    {
      invalidateQueries: [
        queryKeys.coordinator.attendanceReports(),
      ],
    }
  );
};

export const useAllocateResource = () => {
  return useApiMutation(
    CoordinatorAPI.allocateResource,
    {
      invalidateQueries: [
        queryKeys.coordinator.resourcesOverview(),
        queryKeys.coordinator.resourceUtilization(),
      ],
    }
  );
};
```

---

## Error Handling

### Error Handler Hook
```typescript
// hooks/useErrorHandler.ts
import { useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { ApiError } from '../types/common';

export const useErrorHandler = () => {
  const handleError = useCallback((error: ApiError | Error) => {
    if ('success' in error && !error.success) {
      // API Error
      const apiError = error as ApiError;
      
      switch (apiError.error_code) {
        case 'VALIDATION_ERROR':
          toast.error(apiError.message || 'Please check your input and try again');
          break;
        case 'UNAUTHORIZED':
          toast.error('Please log in to continue');
          break;
        case 'FORBIDDEN':
          toast.error('You don\'t have permission to perform this action');
          break;
        case 'NOT_FOUND':
          toast.error('The requested resource was not found');
          break;
        case 'NETWORK_ERROR':
          toast.error('Network error. Please check your connection and try again');
          break;
        default:
          toast.error(apiError.message || 'An unexpected error occurred');
      }
      
      // Log detailed errors for debugging
      if (apiError.errors) {
        console.error('Validation errors:', apiError.errors);
      }
    } else {
      // Generic Error
      toast.error(error.message || 'An unexpected error occurred');
      console.error('Unexpected error:', error);
    }
  }, []);

  return { handleError };
};
```

### API Query Hooks
```typescript
// hooks/useApiQuery.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useErrorHandler } from './useErrorHandler';

export const useApiQuery = <T>(
  key: string[],
  queryFn: () => Promise<T>,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    retry?: number;
  }
) => {
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: key,
    queryFn,
    onError: handleError,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

export const useApiMutation = <TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData) => void;
    invalidateQueries?: string[][];
  }
) => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      options?.onSuccess?.(data);
      
      // Invalidate related queries
      options?.invalidateQueries?.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey });
      });
    },
    onError: handleError,
  });
};
```

---

## Usage Examples

### Parent Dashboard Component
```typescript
// components/ParentDashboard.tsx
import React from 'react';
import { useApiQuery } from '../hooks/useApiQuery';
import { ParentAPI } from '../lib/parent-api';
import { ParentDashboardProfile } from '../types/parent';

export const ParentDashboard: React.FC = () => {
  const {
    data: profile,
    isLoading,
    error,
  } = useApiQuery<ParentDashboardProfile>(
    ['parent', 'dashboard', 'profile'],
    ParentAPI.getDashboardProfile
  );

  const {
    data: upcomingClasses,
    isLoading: classesLoading,
  } = useApiQuery(
    ['parent', 'dashboard', 'upcoming-classes'],
    ParentAPI.getUpcomingClasses
  );

  if (isLoading) {
    return <div>Loading dashboard...</div>;
  }

  if (error) {
    return <div>Error loading dashboard</div>;
  }

  return (
    <div className="parent-dashboard">
      <div className="profile-section">
        <h1>Welcome, {profile?.parent.full_name}</h1>
        <p>Children: {profile?.summary.total_children}</p>
        <p>Active Children: {profile?.summary.active_children}</p>
      </div>

      <div className="children-section">
        <h2>Your Children</h2>
        {profile?.children.map((child) => (
          <ChildCard key={child.id} child={child} />
        ))}
      </div>

      <div className="upcoming-classes">
        <h2>Upcoming Classes</h2>
        {classesLoading ? (
          <div>Loading classes...</div>
        ) : (
          upcomingClasses?.map((class_) => (
            <ClassCard key={class_.id} class={class_} />
          ))
        )}
      </div>
    </div>
  );
};

// Child component
interface ChildCardProps {
  child: ParentDashboardProfile['children'][0];
}

const ChildCard: React.FC<ChildCardProps> = ({ child }) => {
  const { data: progress } = useApiQuery(
    ['parent', 'child', child.id, 'progress'],
    () => ParentAPI.getChildProgress(child.id),
    { enabled: !!child.id }
  );

  return (
    <div className="child-card">
      <h3>{child.full_name}</h3>
      <p>Status: {child.status}</p>
      <p>Overall Progress: {progress?.overall_progress}%</p>
      <p>Attendance Rate: {progress?.performance_metrics.attendance_rate}%</p>
    </div>
  );
};
```

### Instructor Course Management
```typescript
// components/InstructorCourses.tsx
import React, { useState } from 'react';
import { useApiQuery, useApiMutation } from '../hooks/useApiQuery';
import { InstructorAPI } from '../lib/instructor-api';
import { AttendanceSession } from '../types/instructor';

export const InstructorCourses: React.FC = () => {
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

  const { data: courses, isLoading } = useApiQuery(
    ['instructor', 'courses'],
    InstructorAPI.getCourses
  );

  const { data: students } = useApiQuery(
    ['instructor', 'course', selectedCourse, 'students'],
    () => InstructorAPI.getCourseStudents(selectedCourse!),
    { enabled: !!selectedCourse }
  );

  const markAttendanceMutation = useApiMutation(
    InstructorAPI.markAttendance,
    {
      onSuccess: () => {
        toast.success('Attendance marked successfully');
      },
      invalidateQueries: [
        ['instructor', 'course', selectedCourse, 'students'],
        ['instructor', 'attendance'],
      ],
    }
  );

  const handleMarkAttendance = (attendanceData: AttendanceSession) => {
    markAttendanceMutation.mutate(attendanceData);
  };

  if (isLoading) {
    return <div>Loading courses...</div>;
  }

  return (
    <div className="instructor-courses">
      <div className="courses-list">
        <h2>Your Courses</h2>
        {courses?.map((course) => (
          <div
            key={course._id}
            className={`course-card ${selectedCourse === course._id ? 'selected' : ''}`}
            onClick={() => setSelectedCourse(course._id)}
          >
            <h3>{course.title}</h3>
            <p>Students: {course.total_students}</p>
            <p>Status: {course.status}</p>
          </div>
        ))}
      </div>

      {selectedCourse && (
        <div className="course-details">
          <h2>Course Students</h2>
          <AttendanceMarker
            students={students || []}
            onMarkAttendance={handleMarkAttendance}
            isLoading={markAttendanceMutation.isLoading}
          />
        </div>
      )}
    </div>
  );
};

// Attendance marking component
interface AttendanceMarkerProps {
  students: any[];
  onMarkAttendance: (data: AttendanceSession) => void;
  isLoading: boolean;
}

const AttendanceMarker: React.FC<AttendanceMarkerProps> = ({
  students,
  onMarkAttendance,
  isLoading,
}) => {
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    const records = Object.entries(attendanceRecords).map(([studentId, status]) => ({
      student_id: studentId,
      status: status as 'present' | 'absent' | 'late' | 'excused',
      join_time: status === 'present' ? '10:00 AM' : undefined,
      leave_time: status === 'present' ? '11:00 AM' : undefined,
      duration_minutes: status === 'present' ? 60 : 0,
    }));

    const attendanceData: AttendanceSession = {
      batch_id: '507f1f77bcf86cd799439011', // This should come from your course data
      session_date: new Date().toISOString(),
      session_type: 'live_class',
      session_title: 'Class Session',
      session_duration_minutes: 60,
      attendance_records: records,
    };

    onMarkAttendance(attendanceData);
  };

  return (
    <div className="attendance-marker">
      <h3>Mark Attendance</h3>
      {students.map((student) => (
        <div key={student.student._id} className="student-attendance">
          <span>{student.student.full_name}</span>
          <select
            value={attendanceRecords[student.student._id] || ''}
            onChange={(e) =>
              setAttendanceRecords((prev) => ({
                ...prev,
                [student.student._id]: e.target.value,
              }))
            }
          >
            <option value="">Select Status</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
            <option value="excused">Excused</option>
          </select>
        </div>
      ))}
      <button onClick={handleSubmit} disabled={isLoading}>
        {isLoading ? 'Marking...' : 'Mark Attendance'}
      </button>
    </div>
  );
};
```

### Authentication Hook
```typescript
// hooks/useAuth.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { AuthAPI } from '../lib/auth-api';
import { LoginRequest, User } from '../types/auth';

export const useAuth = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['auth', 'user'],
    queryFn: AuthAPI.getCurrentUser,
    enabled: AuthAPI.isAuthenticated(),
    retry: false,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const loginMutation = useMutation({
    mutationFn: AuthAPI.login,
    onSuccess: (data) => {
      queryClient.setQueryData(['auth', 'user'], data.data.user);
      router.push('/dashboard');
    },
  });

  const logoutMutation = useMutation({
    mutationFn: AuthAPI.logout,
    onSuccess: () => {
      queryClient.clear();
      router.push('/login');
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    isLoginLoading: loginMutation.isLoading,
    isLogoutLoading: logoutMutation.isLoading,
    loginError: loginMutation.error,
  };
};
```

---

## Best Practices

### 1. Environment Configuration
```typescript
// config/environment.ts
export const ENV = {
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1',
  APP_ENV: process.env.NODE_ENV || 'development',
  
  // Feature flags
  FEATURES: {
    NOTIFICATIONS: process.env.NEXT_PUBLIC_FEATURE_NOTIFICATIONS === 'true',
    ANALYTICS: process.env.NEXT_PUBLIC_FEATURE_ANALYTICS === 'true',
    REALTIME: process.env.NEXT_PUBLIC_FEATURE_REALTIME === 'true',
  },
  
  // API timeouts
  TIMEOUTS: {
    DEFAULT: 30000,
    UPLOAD: 120000,
    DOWNLOAD: 60000,
  },
};
```

### 2. Query Key Factory
```typescript
// lib/query-keys.ts
export const queryKeys = {
  // Auth
  auth: {
    user: () => ['auth', 'user'],
  },
  
  // Parent
  parent: {
    all: () => ['parent'],
    dashboard: () => [...queryKeys.parent.all(), 'dashboard'],
    profile: () => [...queryKeys.parent.dashboard(), 'profile'],
    children: () => [...queryKeys.parent.all(), 'children'],
    child: (childId: string) => [...queryKeys.parent.children(), childId],
    childProgress: (childId: string) => [...queryKeys.parent.child(childId), 'progress'],
    childAttendance: (childId: string) => [...queryKeys.parent.child(childId), 'attendance'],
    notifications: () => [...queryKeys.parent.all(), 'notifications'],
    upcomingClasses: () => [...queryKeys.parent.dashboard(), 'upcoming-classes'],
  },
  
  // Instructor
  instructor: {
    all: () => ['instructor'],
    courses: () => [...queryKeys.instructor.all(), 'courses'],
    course: (courseId: string) => [...queryKeys.instructor.courses(), courseId],
    courseStudents: (courseId: string) => [...queryKeys.instructor.course(courseId), 'students'],
    courseBatches: (courseId: string) => [...queryKeys.instructor.course(courseId), 'batches'],
    stats: () => [...queryKeys.instructor.all(), 'stats'],
    attendance: () => [...queryKeys.instructor.all(), 'attendance'],
    batchAttendance: (batchId: string) => [...queryKeys.instructor.attendance(), 'batch', batchId],
    revenue: () => [...queryKeys.instructor.all(), 'revenue'],
    revenueStats: () => [...queryKeys.instructor.revenue(), 'stats'],
    monthlyRevenue: () => [...queryKeys.instructor.revenue(), 'monthly'],
  },
};
```

### 3. Response Data Validation
```typescript
// lib/validators.ts
import { z } from 'zod';

export const userSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  email: z.string().email(),
  role: z.array(z.string()),
  account_type: z.enum(['free', 'premium', 'enterprise']),
  email_verified: z.boolean(),
  profile_completion: z.number(),
  is_online: z.boolean(),
  last_seen: z.string(),
});

export const apiResponseSchema = <T>(dataSchema: z.ZodSchema<T>) =>
  z.object({
    success: z.boolean(),
    message: z.string(),
    data: dataSchema,
  });

// Usage in API calls
export const validateResponse = <T>(
  response: unknown,
  schema: z.ZodSchema<T>
): T => {
  return schema.parse(response);
};
```

### 4. Error Boundary
```typescript
// components/ErrorBoundary.tsx
import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Send error to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="error-boundary">
            <h2>Something went wrong</h2>
            <p>Please refresh the page or contact support if the problem persists.</p>
            <button onClick={() => window.location.reload()}>
              Refresh Page
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
```

### 5. Loading States
```typescript
// components/LoadingStates.tsx
import React from 'react';

export const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
  </div>
);

export const ComponentLoader: React.FC = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

export const SkeletonLoader: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <div className="animate-pulse">
    {Array.from({ length: lines }, (_, i) => (
      <div key={i} className="h-4 bg-gray-300 rounded mb-2"></div>
    ))}
  </div>
);
```

This comprehensive guide provides everything needed for frontend integration with the MEDH API, including proper TypeScript types, error handling, and best practices for Next.js applications.