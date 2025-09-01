# Design Document

## Overview

The inline DNS record editor feature will enhance the DomainDetail view by providing seamless DNS record management capabilities directly within the records list. Users will be able to add new DNS records and delete existing ones without modal dialogs, creating a more streamlined workflow. The design leverages the existing DNSRecordItem component architecture and extends the current API service layer.

## Architecture

### Component Architecture

The feature will extend the existing component structure:

```
DomainDetail.vue (Parent)
├── DNSRecordItem.vue (Existing records)
├── DNSRecordEditor.vue (New inline editor component)
└── ConfirmationDialog.vue (New deletion confirmation component)
```

### State Management

The DomainDetail component will manage:
- `addingNewRecord: boolean` - Controls visibility of inline editor
- `newRecordData: CreateDNSRecordRequest` - Form data for new record
- `deletingRecordId: string | null` - Tracks record being deleted
- `showDeleteConfirmation: boolean` - Controls deletion confirmation dialog

### Data Flow

1. **Add Record Flow:**
   - User clicks "添加记录" → `addingNewRecord = true`
   - Inline editor appears → User fills form
   - User saves → API call → Update records list → Hide editor

2. **Delete Record Flow:**
   - User clicks delete → Show confirmation dialog
   - User confirms → API call → Remove from records list
   - User cancels → Hide confirmation dialog

## Components and Interfaces

### DNSRecordEditor Component

A new component for inline DNS record creation:

```typescript
interface DNSRecordEditorProps {
  domainId: string
  loading?: boolean
}

interface DNSRecordEditorEmits {
  save: [data: CreateDNSRecordRequest]
  cancel: []
}

interface CreateDNSRecordRequest {
  type: DNSRecordType
  name: string
  content: string
  ttl: number
  proxied?: boolean
}
```

**Features:**
- Reuses validation logic from DNSRecordItem
- Same form fields and styling as edit mode
- Auto-focus on first input when shown
- Form reset on cancel/save
- Loading states during API calls

### ConfirmationDialog Component

A reusable confirmation dialog component:

```typescript
interface ConfirmationDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  loading?: boolean
}

interface ConfirmationDialogEmits {
  confirm: []
  cancel: []
}
```

### Enhanced DomainDetail Component

**New State Properties:**
```typescript
const addingNewRecord = ref(false)
const newRecordLoading = ref(false)
const deletingRecordId = ref<string | null>(null)
const deleteLoading = ref(false)
const showDeleteConfirmation = ref(false)
const recordToDelete = ref<DNSRecord | null>(null)
```

**New Methods:**
```typescript
const handleAddDNSRecord = () => void
const handleSaveNewRecord = (data: CreateDNSRecordRequest) => Promise<void>
const handleCancelNewRecord = () => void
const handleDeleteDNSRecord = (recordId: string) => void
const confirmDeleteRecord = () => Promise<void>
const cancelDeleteRecord = () => void
```

## Data Models

### API Request/Response Types

```typescript
// New type for creating DNS records
interface CreateDNSRecordRequest {
  type: DNSRecordType
  name: string
  content: string
  ttl: number
  proxied?: boolean
}

// API response for created record
interface CreateDNSRecordResponse extends DNSRecord {
  // Same as DNSRecord interface
}
```

### Form Validation

The inline editor will use the same validation rules as the existing DNSRecordItem:

- **Name validation:** Required, non-empty string
- **Content validation:** Type-specific validation (IP addresses, domains, etc.)
- **TTL validation:** Valid TTL values from predefined list
- **Type-specific rules:** Proxy toggle only for A/AAAA records

## Error Handling

### API Error Scenarios

1. **Create Record Errors:**
   - Network failures → Show error message, keep form open
   - Validation errors → Highlight invalid fields
   - Duplicate records → Show specific error message
   - Rate limiting → Show retry message

2. **Delete Record Errors:**
   - Network failures → Show error message, keep record in list
   - Record not found → Remove from list silently
   - Permission errors → Show access denied message

### User Experience

- **Loading States:** Disable form inputs and show spinners during API calls
- **Error Messages:** Display inline errors for form validation, toast notifications for API errors
- **Optimistic Updates:** Remove deleted records immediately, add them back if deletion fails
- **Form Persistence:** Keep form data when switching between add/edit modes

## Testing Strategy

### Unit Tests

1. **DNSRecordEditor Component:**
   - Form validation logic
   - Event emission on save/cancel
   - Loading state handling
   - Error display

2. **ConfirmationDialog Component:**
   - Modal open/close behavior
   - Event emission on confirm/cancel
   - Loading state during confirmation

3. **DomainDetail Component:**
   - State management for add/delete operations
   - API integration for create/delete
   - Error handling scenarios

### Integration Tests

1. **Add Record Flow:**
   - Complete add record workflow
   - Form validation integration
   - API error handling
   - Records list updates

2. **Delete Record Flow:**
   - Confirmation dialog workflow
   - API integration
   - Optimistic updates
   - Error recovery

### E2E Tests

1. **User Workflows:**
   - Add multiple records in sequence
   - Delete records with confirmation
   - Handle network errors gracefully
   - Form validation prevents invalid submissions

## Implementation Approach

### Phase 1: API Extension
- Add missing API endpoints for create/delete DNS records
- Extend API service layer with new methods
- Update TypeScript types

### Phase 2: Component Development
- Create DNSRecordEditor component
- Create ConfirmationDialog component
- Implement form validation and error handling

### Phase 3: Integration
- Integrate components into DomainDetail view
- Implement state management
- Add loading states and error handling

### Phase 4: Testing & Polish
- Add comprehensive test coverage
- Implement accessibility features
- Performance optimization
- User experience refinements

## API Integration

### Required New Endpoints

Based on the current API structure, we need to add:

```typescript
// Add to api.domains object
createDnsRecord: (domainId: string, data: CreateDNSRecordRequest) =>
  apiClient.post<DNSRecord>(`/api/domains/${domainId}/dns-records`, data),

deleteDnsRecord: (domainId: string, recordId: string) =>
  apiClient.delete<void>(`/api/domains/${domainId}/dns-records/${recordId}`)
```

### Backend API Endpoints

The backend will need to implement:

- `POST /api/domains/:id/dns-records` - Create new DNS record
- `DELETE /api/domains/:id/dns-records/:recordId` - Delete DNS record

### Error Response Handling

The API service will handle standard error responses:
- 400: Validation errors
- 404: Domain/record not found
- 409: Duplicate record conflicts
- 500: Server/Cloudflare API errors

## Accessibility Considerations

1. **Keyboard Navigation:**
   - Tab order through form fields
   - Enter to save, Escape to cancel
   - Focus management when showing/hiding editor

2. **Screen Reader Support:**
   - Proper ARIA labels for form fields
   - Announcement of loading states
   - Error message associations

3. **Visual Indicators:**
   - Clear loading states
   - Error highlighting
   - Success feedback

## Performance Considerations

1. **Optimistic Updates:**
   - Immediate UI updates for better perceived performance
   - Rollback on API failures

2. **Form Validation:**
   - Debounced validation to reduce computation
   - Client-side validation before API calls

3. **Memory Management:**
   - Proper cleanup of event listeners
   - Efficient re-rendering strategies

## Security Considerations

1. **Input Validation:**
   - Client-side validation for UX
   - Server-side validation for security
   - XSS prevention in form inputs

2. **API Security:**
   - Proper authentication for DNS operations
   - Rate limiting for create/delete operations
   - Input sanitization on backend