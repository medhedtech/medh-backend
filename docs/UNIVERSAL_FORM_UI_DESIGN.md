# Universal Form Management UI Design

## 🎯 Overview

A comprehensive UI design for managing universal forms with a focus on demo session bookings. This design emphasizes quick actions, intuitive navigation, and efficient form processing workflows.

## 🎨 Design Principles

- **Form-First Navigation**: Quick access to different form types
- **Status-Driven Workflow**: Visual status indicators and progress tracking
- **Action-Oriented Interface**: One-click actions for common tasks
- **Responsive Design**: Mobile-first approach
- **Accessibility**: WCAG 2.1 AA compliant

## 📱 Main Dashboard Layout

### Header Navigation

```jsx
const UniversalFormHeader = () => (
  <header className="form-header">
    <div className="header-left">
      <h1>Form Management</h1>
      <div className="form-type-tabs">
        <Tab active icon="📞" label="Demo Sessions" count={12} />
        <Tab icon="🏢" label="Corporate" count={5} />
        <Tab icon="👥" label="Partnerships" count={3} />
        <Tab icon="📧" label="Contact" count={8} />
        <Tab icon="💼" label="Careers" count={15} />
        <Tab icon="👨‍🏫" label="Educators" count={4} />
      </div>
    </div>
    <div className="header-right">
      <SearchBar placeholder="Search forms..." />
      <NotificationBell count={7} />
      <UserProfile />
    </div>
  </header>
);
```

### Quick Action Sidebar

```jsx
const QuickActionSidebar = () => (
  <aside className="quick-actions">
    <div className="action-group">
      <h3>🚀 Quick Actions</h3>
      <ActionButton
        icon="➕"
        label="New Demo Booking"
        color="primary"
        onClick={() => openModal("demo-booking")}
      />
      <ActionButton
        icon="📅"
        label="Schedule Demo"
        color="success"
        onClick={() => openModal("schedule-demo")}
      />
      <ActionButton
        icon="✉️"
        label="Send Confirmation"
        color="info"
        onClick={() => openModal("send-confirmation")}
      />
    </div>

    <div className="action-group">
      <h3>📊 Analytics</h3>
      <MetricCard title="Today's Demos" value="8" trend="+2" color="green" />
      <MetricCard
        title="Pending Reviews"
        value="12"
        trend="-1"
        color="orange"
      />
      <MetricCard
        title="Conversion Rate"
        value="68%"
        trend="+5%"
        color="blue"
      />
    </div>

    <div className="action-group">
      <h3>🔧 Tools</h3>
      <ActionButton icon="📤" label="Export Data" variant="outline" />
      <ActionButton icon="🔄" label="Bulk Actions" variant="outline" />
      <ActionButton icon="⚙️" label="Settings" variant="outline" />
    </div>
  </aside>
);
```

## 📋 Demo Session Form Management

### Demo Session List View

```jsx
const DemoSessionList = () => {
  const [forms, setForms] = useState([]);
  const [filters, setFilters] = useState({
    status: "all",
    priority: "all",
    dateRange: "today",
  });

  return (
    <div className="demo-session-list">
      {/* Filters Bar */}
      <div className="filters-bar">
        <div className="filter-group">
          <FilterSelect
            label="Status"
            value={filters.status}
            options={[
              { value: "all", label: "All Status" },
              { value: "scheduled", label: "📅 Scheduled" },
              { value: "confirmed", label: "✅ Confirmed" },
              { value: "completed", label: "🎯 Completed" },
              { value: "cancelled", label: "❌ Cancelled" },
            ]}
            onChange={(value) => setFilters({ ...filters, status: value })}
          />

          <FilterSelect
            label="Priority"
            value={filters.priority}
            options={[
              { value: "all", label: "All Priority" },
              { value: "urgent", label: "🔴 Urgent" },
              { value: "high", label: "🟡 High" },
              { value: "medium", label: "🔵 Medium" },
              { value: "low", label: "⚪ Low" },
            ]}
            onChange={(value) => setFilters({ ...filters, priority: value })}
          />

          <DateRangePicker
            value={filters.dateRange}
            onChange={(range) => setFilters({ ...filters, dateRange: range })}
          />
        </div>

        <div className="view-controls">
          <ViewToggle options={["card", "table", "calendar"]} />
          <SortSelect options={["newest", "priority", "status", "name"]} />
        </div>
      </div>

      {/* Demo Session Cards */}
      <div className="demo-cards-grid">
        {forms.map((form) => (
          <DemoSessionCard key={form.id} form={form} />
        ))}
      </div>
    </div>
  );
};
```

### Demo Session Card Component

```jsx
const DemoSessionCard = ({ form }) => (
  <div className={`demo-card status-${form.status} priority-${form.priority}`}>
    <div className="card-header">
      <div className="student-info">
        <Avatar
          src={form.student_details?.profile_image}
          name={form.contact_info.full_name}
          size="sm"
        />
        <div className="student-details">
          <h4>{form.contact_info.full_name}</h4>
          <p className="student-type">
            {form.is_student_under_16 ? "👶 Under 16" : "🎓 16+"}
          </p>
        </div>
      </div>

      <div className="card-actions">
        <StatusBadge status={form.demo_session_details.demo_status} />
        <PriorityIndicator priority={form.priority} />
        <MoreMenu formId={form.id} />
      </div>
    </div>

    <div className="card-body">
      <div className="demo-details">
        <DetailRow icon="📧" label="Email" value={form.contact_info.email} />
        <DetailRow
          icon="📱"
          label="Phone"
          value={`${form.contact_info.mobile_number.country_code} ${form.contact_info.mobile_number.number}`}
        />
        <DetailRow
          icon="📅"
          label="Preferred Date"
          value={formatDate(form.demo_session_details.preferred_date)}
        />
        <DetailRow
          icon="⏰"
          label="Time Slot"
          value={form.demo_session_details.preferred_time_slot}
        />
        <DetailRow
          icon="🌍"
          label="Timezone"
          value={form.demo_session_details.timezone}
        />
      </div>

      {form.student_details.preferred_course?.length > 0 && (
        <div className="course-interests">
          <h5>📚 Course Interests</h5>
          <div className="course-tags">
            {form.student_details.preferred_course.map((course) => (
              <CourseTag key={course} course={course} />
            ))}
          </div>
        </div>
      )}
    </div>

    <div className="card-footer">
      <div className="quick-actions">
        <QuickActionButton
          icon="✅"
          label="Confirm"
          color="success"
          onClick={() => confirmDemo(form.id)}
          disabled={form.demo_session_details.demo_status === "confirmed"}
        />
        <QuickActionButton
          icon="📞"
          label="Call"
          color="primary"
          onClick={() => initiateCall(form.contact_info.mobile_number)}
        />
        <QuickActionButton
          icon="✉️"
          label="Email"
          color="info"
          onClick={() => sendEmail(form.contact_info.email)}
        />
        <QuickActionButton
          icon="🔄"
          label="Reschedule"
          color="warning"
          onClick={() => rescheduleDemo(form.id)}
        />
      </div>

      <div className="metadata">
        <TimeAgo date={form.submitted_at} />
        <FormId id={form.application_id} />
      </div>
    </div>
  </div>
);
```

## 🎯 Quick Action Modals

### Demo Confirmation Modal

```jsx
const DemoConfirmationModal = ({ formId, onClose, onConfirm }) => {
  const [zoomDetails, setZoomDetails] = useState({
    meetingId: "",
    passcode: "",
    meetingUrl: "",
  });
  const [instructor, setInstructor] = useState("");
  const [confirmationMessage, setConfirmationMessage] = useState("");

  return (
    <Modal title="🎯 Confirm Demo Session" onClose={onClose}>
      <div className="confirmation-form">
        <div className="form-section">
          <h4>📅 Session Details</h4>
          <FormGroup>
            <Label>Assigned Instructor</Label>
            <InstructorSelect
              value={instructor}
              onChange={setInstructor}
              placeholder="Select instructor..."
            />
          </FormGroup>

          <FormGroup>
            <Label>🔗 Zoom Meeting</Label>
            <div className="zoom-controls">
              <Button variant="outline" onClick={generateZoomMeeting} icon="🎥">
                Generate Zoom Meeting
              </Button>
              <div className="zoom-details">
                <Input
                  label="Meeting ID"
                  value={zoomDetails.meetingId}
                  onChange={(e) =>
                    setZoomDetails({
                      ...zoomDetails,
                      meetingId: e.target.value,
                    })
                  }
                />
                <Input
                  label="Passcode"
                  value={zoomDetails.passcode}
                  onChange={(e) =>
                    setZoomDetails({ ...zoomDetails, passcode: e.target.value })
                  }
                />
                <Input
                  label="Meeting URL"
                  value={zoomDetails.meetingUrl}
                  onChange={(e) =>
                    setZoomDetails({
                      ...zoomDetails,
                      meetingUrl: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </FormGroup>
        </div>

        <div className="form-section">
          <h4>✉️ Confirmation Message</h4>
          <Textarea
            value={confirmationMessage}
            onChange={(e) => setConfirmationMessage(e.target.value)}
            placeholder="Custom message for the student (optional)"
            rows={4}
          />
        </div>

        <div className="form-section">
          <h4>📋 Checklist</h4>
          <ChecklistItem checked label="Student contact details verified" />
          <ChecklistItem checked label="Instructor availability confirmed" />
          <ChecklistItem label="Zoom meeting tested" />
          <ChecklistItem label="Confirmation email ready" />
        </div>
      </div>

      <div className="modal-actions">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={() =>
            onConfirm({
              instructor,
              zoomDetails,
              confirmationMessage,
            })
          }
          icon="✅"
        >
          Confirm Demo Session
        </Button>
      </div>
    </Modal>
  );
};
```

### Bulk Actions Modal

```jsx
const BulkActionsModal = ({ selectedForms, onClose, onComplete }) => {
  const [action, setAction] = useState("");
  const [actionParams, setActionParams] = useState({});

  const bulkActions = [
    {
      id: "confirm_all",
      label: "✅ Confirm All Sessions",
      description: "Confirm all selected demo sessions",
      requiresParams: ["instructor", "zoom_settings"],
    },
    {
      id: "reschedule_all",
      label: "🔄 Reschedule All",
      description: "Reschedule all selected sessions",
      requiresParams: ["new_date", "new_time"],
    },
    {
      id: "send_reminder",
      label: "📧 Send Reminders",
      description: "Send reminder emails to all students",
      requiresParams: ["email_template"],
    },
    {
      id: "export_data",
      label: "📤 Export Data",
      description: "Export selected forms data",
      requiresParams: ["format", "fields"],
    },
  ];

  return (
    <Modal title="🔧 Bulk Actions" size="lg" onClose={onClose}>
      <div className="bulk-actions-form">
        <div className="selection-summary">
          <h4>📋 Selected Forms</h4>
          <p>{selectedForms.length} demo sessions selected</p>
          <div className="selected-forms-preview">
            {selectedForms.slice(0, 3).map((form) => (
              <div key={form.id} className="form-preview">
                <Avatar name={form.contact_info.full_name} size="xs" />
                <span>{form.contact_info.full_name}</span>
              </div>
            ))}
            {selectedForms.length > 3 && (
              <span className="more-count">
                +{selectedForms.length - 3} more
              </span>
            )}
          </div>
        </div>

        <div className="action-selection">
          <h4>⚡ Select Action</h4>
          <div className="action-grid">
            {bulkActions.map((bulkAction) => (
              <ActionCard
                key={bulkAction.id}
                selected={action === bulkAction.id}
                onClick={() => setAction(bulkAction.id)}
                {...bulkAction}
              />
            ))}
          </div>
        </div>

        {action && (
          <div className="action-parameters">
            <h4>⚙️ Action Parameters</h4>
            <BulkActionParams
              action={action}
              params={actionParams}
              onChange={setActionParams}
            />
          </div>
        )}
      </div>

      <div className="modal-actions">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={() => onComplete(action, actionParams)}
          disabled={!action}
          icon="⚡"
        >
          Execute Action
        </Button>
      </div>
    </Modal>
  );
};
```

## 📊 Analytics Dashboard

### Demo Session Analytics

```jsx
const DemoAnalytics = () => (
  <div className="analytics-dashboard">
    <div className="metrics-grid">
      <MetricCard
        title="📅 Today's Sessions"
        value="12"
        trend="+3"
        color="blue"
        icon="📅"
        subtitle="3 confirmed, 9 pending"
      />
      <MetricCard
        title="✅ Confirmation Rate"
        value="85%"
        trend="+12%"
        color="green"
        icon="✅"
        subtitle="Last 7 days"
      />
      <MetricCard
        title="🎯 Completion Rate"
        value="92%"
        trend="+5%"
        color="purple"
        icon="🎯"
        subtitle="Last 30 days"
      />
      <MetricCard
        title="⏱️ Avg Response Time"
        value="2.4h"
        trend="-0.8h"
        color="orange"
        icon="⏱️"
        subtitle="Form to confirmation"
      />
    </div>

    <div className="charts-grid">
      <ChartCard
        title="📈 Demo Bookings Trend"
        type="line"
        data={demoBookingsTrendData}
        timeRange="7d"
      />
      <ChartCard title="🕐 Popular Time Slots" type="bar" data={timeSlotData} />
      <ChartCard
        title="📚 Course Interest Distribution"
        type="doughnut"
        data={courseInterestData}
      />
      <ChartCard
        title="🌍 Geographic Distribution"
        type="map"
        data={geographicData}
      />
    </div>

    <div className="insights-panel">
      <h3>💡 Insights & Recommendations</h3>
      <InsightCard
        type="success"
        title="Peak Hours Identified"
        description="Most bookings occur between 2-4 PM IST. Consider adding more instructors during this time."
        action="View Schedule"
      />
      <InsightCard
        type="warning"
        title="Response Time Alert"
        description="Average response time increased by 40 minutes this week. Review assignment workflow."
        action="Optimize Process"
      />
      <InsightCard
        type="info"
        title="Course Demand"
        description="AI/Data Science courses show 150% increase in demo requests. Consider promotional campaigns."
        action="View Details"
      />
    </div>
  </div>
);
```

## 📱 Mobile-Responsive Design

### Mobile Navigation

```jsx
const MobileFormNavigation = () => (
  <div className="mobile-nav">
    <div className="nav-header">
      <h2>Forms</h2>
      <div className="nav-actions">
        <IconButton icon="🔍" onClick={openSearch} />
        <IconButton icon="🔔" badge={7} onClick={openNotifications} />
        <IconButton icon="➕" onClick={openQuickAdd} />
      </div>
    </div>

    <div className="nav-tabs">
      <Tab icon="📞" label="Demos" count={12} active />
      <Tab icon="🏢" label="Corporate" count={5} />
      <Tab icon="👥" label="Partners" count={3} />
      <Tab icon="📧" label="Contact" count={8} />
    </div>

    <div className="quick-stats">
      <StatChip label="Pending" value="8" color="orange" />
      <StatChip label="Today" value="12" color="blue" />
      <StatChip label="Urgent" value="3" color="red" />
    </div>
  </div>
);
```

### Mobile Demo Card

```jsx
const MobileDemoCard = ({ form }) => (
  <div className="mobile-demo-card">
    <div className="card-header">
      <Avatar name={form.contact_info.full_name} size="sm" />
      <div className="header-info">
        <h4>{form.contact_info.full_name}</h4>
        <StatusBadge status={form.demo_session_details.demo_status} size="sm" />
      </div>
      <SwipeActions formId={form.id} />
    </div>

    <div className="card-details">
      <DetailChip
        icon="📅"
        value={formatDate(form.demo_session_details.preferred_date)}
      />
      <DetailChip
        icon="⏰"
        value={form.demo_session_details.preferred_time_slot}
      />
      <DetailChip icon="📱" value={form.contact_info.mobile_number.number} />
    </div>

    <div className="card-actions">
      <ActionButton icon="✅" label="Confirm" size="sm" />
      <ActionButton icon="📞" label="Call" size="sm" />
      <ActionButton icon="✉️" label="Email" size="sm" />
    </div>
  </div>
);
```

## 🎨 CSS Styling Framework

### Design Tokens

```css
:root {
  /* Colors */
  --primary-50: #eff6ff;
  --primary-500: #3b82f6;
  --primary-600: #2563eb;
  --primary-700: #1d4ed8;

  --success-50: #f0fdf4;
  --success-500: #22c55e;
  --success-600: #16a34a;

  --warning-50: #fffbeb;
  --warning-500: #f59e0b;
  --warning-600: #d97706;

  --error-50: #fef2f2;
  --error-500: #ef4444;
  --error-600: #dc2626;

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;

  /* Typography */
  --font-sm: 0.875rem;
  --font-base: 1rem;
  --font-lg: 1.125rem;
  --font-xl: 1.25rem;
  --font-2xl: 1.5rem;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg:
    0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);

  /* Border Radius */
  --radius-sm: 0.25rem;
  --radius: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
}
```

### Component Styles

```css
/* Demo Session Card */
.demo-card {
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  border: 1px solid #e5e7eb;
  padding: var(--space-6);
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.demo-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}

.demo-card.status-urgent {
  border-left: 4px solid var(--error-500);
}

.demo-card.status-high {
  border-left: 4px solid var(--warning-500);
}

.demo-card.status-confirmed {
  border-left: 4px solid var(--success-500);
}

/* Quick Actions */
.quick-actions {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.quick-action-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius);
  font-size: var(--font-sm);
  font-weight: 500;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  cursor: pointer;
}

.quick-action-btn.primary {
  background: var(--primary-500);
  color: white;
}

.quick-action-btn.primary:hover {
  background: var(--primary-600);
}

.quick-action-btn.success {
  background: var(--success-500);
  color: white;
}

.quick-action-btn.success:hover {
  background: var(--success-600);
}

/* Status Badges */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--font-sm);
  font-weight: 500;
}

.status-badge.scheduled {
  background: var(--primary-50);
  color: var(--primary-700);
}

.status-badge.confirmed {
  background: var(--success-50);
  color: var(--success-700);
}

.status-badge.completed {
  background: var(--success-50);
  color: var(--success-700);
}

.status-badge.cancelled {
  background: var(--error-50);
  color: var(--error-700);
}

/* Responsive Design */
@media (max-width: 768px) {
  .demo-cards-grid {
    grid-template-columns: 1fr;
    gap: var(--space-4);
  }

  .filters-bar {
    flex-direction: column;
    gap: var(--space-4);
  }

  .quick-actions {
    justify-content: center;
  }

  .demo-card {
    padding: var(--space-4);
  }
}

/* Dark Mode Support */
@media (prefers-color-scheme: dark) {
  .demo-card {
    background: #1f2937;
    border-color: #374151;
    color: #f9fafb;
  }

  .status-badge.scheduled {
    background: #1e3a8a;
    color: #93c5fd;
  }

  .status-badge.confirmed {
    background: #14532d;
    color: #86efac;
  }
}
```

## 🔧 Implementation Guide

### 1. Component Architecture

```
src/
├── components/
│   ├── forms/
│   │   ├── UniversalFormDashboard.jsx
│   │   ├── DemoSessionList.jsx
│   │   ├── DemoSessionCard.jsx
│   │   ├── QuickActionSidebar.jsx
│   │   └── modals/
│   │       ├── DemoConfirmationModal.jsx
│   │       ├── BulkActionsModal.jsx
│   │       └── RescheduleModal.jsx
│   ├── ui/
│   │   ├── Button.jsx
│   │   ├── Modal.jsx
│   │   ├── StatusBadge.jsx
│   │   ├── Avatar.jsx
│   │   └── MetricCard.jsx
│   └── charts/
│       ├── LineChart.jsx
│       ├── BarChart.jsx
│       └── DoughnutChart.jsx
├── hooks/
│   ├── useUniversalForms.js
│   ├── useDemoSessions.js
│   └── useFormActions.js
├── services/
│   ├── formAPI.js
│   ├── demoSessionAPI.js
│   └── analyticsAPI.js
└── utils/
    ├── formHelpers.js
    ├── dateUtils.js
    └── constants.js
```

### 2. State Management

```javascript
// Redux store structure for form management
const initialState = {
  forms: {
    demoSessions: {
      list: [],
      filters: {
        status: "all",
        priority: "all",
        dateRange: "today",
      },
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
      },
      loading: false,
      error: null,
    },
    corporateTraining: {
      // Similar structure
    },
    // ... other form types
  },
  ui: {
    selectedForms: [],
    activeModal: null,
    sidebarCollapsed: false,
    viewMode: "card", // 'card', 'table', 'calendar'
  },
  analytics: {
    metrics: {},
    charts: {},
    insights: [],
  },
};
```

### 3. API Integration

```javascript
// Demo Session API service
class DemoSessionAPI {
  static async getDemoSessions(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await fetch(
      `/api/v1/forms?form_type=book_a_free_demo_session&${params}`,
    );
    return response.json();
  }

  static async confirmDemo(formId, confirmationData) {
    const response = await fetch(`/api/v1/forms/${formId}/confirm-demo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(confirmationData),
    });
    return response.json();
  }

  static async bulkAction(formIds, action, params) {
    const response = await fetch(`/api/v1/forms/bulk-action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formIds, action, params }),
    });
    return response.json();
  }

  static async getAnalytics(dateRange = "7d") {
    const response = await fetch(
      `/api/v1/forms/analytics/demo-sessions?range=${dateRange}`,
    );
    return response.json();
  }
}
```

### 4. Custom Hooks

```javascript
// Custom hook for demo session management
export const useDemoSessions = () => {
  const dispatch = useDispatch();
  const { list, filters, loading, error } = useSelector(
    (state) => state.forms.demoSessions,
  );

  const fetchDemoSessions = useCallback(
    async (newFilters = {}) => {
      dispatch(setLoading(true));
      try {
        const data = await DemoSessionAPI.getDemoSessions({
          ...filters,
          ...newFilters,
        });
        dispatch(setDemoSessions(data.data));
        dispatch(setPagination(data.pagination));
      } catch (error) {
        dispatch(setError(error.message));
      } finally {
        dispatch(setLoading(false));
      }
    },
    [dispatch, filters],
  );

  const confirmDemo = useCallback(
    async (formId, confirmationData) => {
      try {
        await DemoSessionAPI.confirmDemo(formId, confirmationData);
        await fetchDemoSessions(); // Refresh list
        toast.success("Demo session confirmed successfully!");
      } catch (error) {
        toast.error("Failed to confirm demo session");
      }
    },
    [fetchDemoSessions],
  );

  const bulkAction = useCallback(
    async (formIds, action, params) => {
      try {
        await DemoSessionAPI.bulkAction(formIds, action, params);
        await fetchDemoSessions(); // Refresh list
        toast.success(`Bulk action "${action}" completed successfully!`);
      } catch (error) {
        toast.error(`Failed to execute bulk action: ${error.message}`);
      }
    },
    [fetchDemoSessions],
  );

  return {
    demoSessions: list,
    filters,
    loading,
    error,
    fetchDemoSessions,
    confirmDemo,
    bulkAction,
    setFilters: (newFilters) => dispatch(setFilters(newFilters)),
  };
};
```

## 🚀 Key Features

### ✅ Demo Session Focused

- **Priority-based sorting** for urgent demo requests
- **One-click confirmation** with Zoom integration
- **Student age categorization** (Under 16 vs 16+)
- **Course interest visualization**
- **Time slot optimization**

### ✅ Quick Actions

- **Bulk operations** for multiple forms
- **Smart filtering** by status, priority, date
- **Quick communication** (call, email, WhatsApp)
- **Calendar integration** for scheduling

### ✅ Analytics & Insights

- **Real-time metrics** dashboard
- **Conversion rate tracking**
- **Popular time slots analysis**
- **Geographic distribution**
- **Performance insights**

### ✅ Mobile-First Design

- **Responsive layout** for all screen sizes
- **Touch-friendly interactions**
- **Swipe actions** for mobile
- **Optimized navigation**

### ✅ Accessibility

- **WCAG 2.1 AA compliance**
- **Keyboard navigation**
- **Screen reader support**
- **High contrast mode**

This comprehensive UI design provides an intuitive, efficient, and scalable solution for managing universal forms with a special focus on demo session bookings. The design emphasizes quick actions, visual clarity, and smooth workflows to enhance productivity for form administrators.
