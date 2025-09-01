# UI Components

This directory contains reusable UI components built with Vue 3, TypeScript, and Tailwind CSS. All components follow a purple theme color scheme as specified in the requirements.

## Components

### Button
A versatile button component with multiple variants and sizes.

**Props:**
- `variant`: 'primary' | 'secondary' | 'outline' | 'ghost' (default: 'primary')
- `size`: 'sm' | 'md' | 'lg' (default: 'md')
- `disabled`: boolean (default: false)

**Events:**
- `click`: Emitted when button is clicked

**Usage:**
```vue
<Button variant="primary" size="md" @click="handleClick">
  Click me
</Button>
```

### Input
A form input component with label and error support.

**Props:**
- `id`: string
- `type`: string (default: 'text')
- `label`: string
- `placeholder`: string
- `disabled`: boolean (default: false)
- `error`: string
- `modelValue`: string

**Events:**
- `update:modelValue`: For v-model support
- `blur`: Focus lost event
- `focus`: Focus gained event

**Usage:**
```vue
<Input 
  v-model="email" 
  label="Email" 
  placeholder="Enter your email"
  type="email"
  :error="emailError"
/>
```

### Modal
A modal dialog component with backdrop and keyboard support.

**Props:**
- `open`: boolean (required)
- `title`: string
- `size`: 'sm' | 'md' | 'lg' | 'xl' (default: 'md')
- `showClose`: boolean (default: true)
- `closeOnBackdrop`: boolean (default: true)

**Events:**
- `close`: Emitted when modal should be closed

**Slots:**
- `default`: Modal content
- `header`: Custom header content
- `footer`: Modal footer (typically for buttons)

**Usage:**
```vue
<Modal :open="showModal" title="Confirm Action" @close="showModal = false">
  <p>Are you sure you want to proceed?</p>
  <template #footer>
    <Button variant="outline" @click="showModal = false">Cancel</Button>
    <Button @click="confirm">Confirm</Button>
  </template>
</Modal>
```

### Card
A container component for grouping related content.

**Props:**
- `title`: string
- `variant`: 'default' | 'outlined' | 'elevated' (default: 'default')

**Slots:**
- `default`: Card content
- `header`: Custom header content
- `footer`: Card footer

**Usage:**
```vue
<Card title="Domain Information" variant="outlined">
  <p>Domain details go here...</p>
</Card>
```

### LoadingSpinner
A loading indicator component with optional overlay.

**Props:**
- `size`: 'sm' | 'md' | 'lg' (default: 'md')
- `text`: string
- `overlay`: boolean (default: false)

**Usage:**
```vue
<LoadingSpinner size="md" text="Loading..." />
<LoadingSpinner overlay text="Processing..." />
```

### Alert
An alert component for displaying messages with different severity levels.

**Props:**
- `variant`: 'info' | 'success' | 'warning' | 'error' (default: 'info')
- `title`: string
- `dismissible`: boolean (default: false)

**Events:**
- `dismiss`: Emitted when alert is dismissed

**Slots:**
- `default`: Alert content

**Usage:**
```vue
<Alert variant="success" title="Success" dismissible @dismiss="handleDismiss">
  Operation completed successfully!
</Alert>
```

## Theme Configuration

All components use the purple color scheme defined in the Tailwind configuration:

- Primary colors: purple-600, purple-700
- Hover states: purple-50, purple-100, purple-200
- Focus rings: purple-500
- Text colors: purple-700, purple-900

## Dependencies

- **radix-vue**: Provides accessible component primitives
- **lucide-vue-next**: Icon library for consistent iconography
- **Tailwind CSS**: Utility-first CSS framework for styling

## Testing

Components include unit tests using Vitest and Vue Test Utils. Run tests with:

```bash
npm run test
```

## Development

To add new components:

1. Create the component file in this directory
2. Add TypeScript interfaces for props and events
3. Include proper accessibility attributes
4. Follow the purple theme color scheme
5. Add the component to the index.ts export file
6. Write unit tests
7. Update this README with component documentation