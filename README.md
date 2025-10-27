# Liteflow

> ⚠️ **Experimental Package**: This package is currently under development and should not be used in production. The API may change.

A lightweight SQLite-based workflow tracker for Node.js applications.

## Features

- Simple workflow management
- Step tracking
- Identifier-based workflow lookup
- Workflow statistics
- **CLI tool for real-time statistics monitoring**
- SQLite-based storage
- TypeScript support
- Bulk operations support
- Performance optimizations
- Centralized error handling
- Graceful error recovery

## Installation

```bash
npm install liteflow
```

## Usage

```typescript
import { Liteflow } from 'liteflow';

// Initialize with a database path
const liteflow = new Liteflow('path/to/database.db');
liteflow.init();

// Start a new workflow - returns a WorkflowInstance
const workflow = liteflow.startWorkflow('test-workflow', [
  { key: 'test', value: '123' }
]);

// NEW: Use the workflow instance methods directly
workflow.addStep('step1', { data: 'test1' });
workflow.addStep('step2', { data: 'test2' });
workflow.complete();

// Or use the traditional API (still supported)
const workflowId = workflow.id; // Get the workflow ID
liteflow.addStep(workflowId, 'step1', { data: 'test1' });
liteflow.addStep(workflowId, 'step2', { data: 'test2' });
liteflow.completeWorkflow(workflowId);

// Get workflow by identifier
const foundWorkflow = liteflow.getWorkflowByIdentifier('test', '123');

// Get workflow steps
const steps = workflow.getSteps(); // Using instance method
// or
const stepsById = liteflow.getSteps(workflowId); // Using traditional method

// Get steps by identifier
const stepsByIdentifier = liteflow.getStepsByIdentifier('test', '123');

// Get workflow statistics
const stats = liteflow.getWorkflowStats();

// Get workflows with pagination and filtering
const workflows = liteflow.getWorkflows({
  status: 'completed',
  page: 1,
  pageSize: 10,
  orderBy: 'started_at',
  order: 'desc'
});

// Delete a workflow
const deleted = workflow.delete(); // Using instance method
// or
const deletedById = liteflow.deleteWorkflow(workflowId); // Using traditional method
if (deleted) {
  console.log('Workflow deleted successfully');
}

// Delete all workflows
const allDeleted = liteflow.deleteAllWorkflows();
if (allDeleted) {
  console.log('All workflows deleted successfully');
}

// Attach additional identifiers
liteflow.attachIdentifier('test', '123', { key: 'test2', value: '456' });

// Get most frequent steps
const frequentSteps = liteflow.getMostFrequentSteps(5);

// Get average step duration
const stepDurations = liteflow.getAverageStepDuration();
```

## CLI Usage

Liteflow includes a powerful CLI tool for monitoring workflow statistics in real-time.

### Installation

After installing the package, the CLI is available as `liteflow`:

```bash
npm install -g liteflow
# or use npx
npx liteflow stats --db ./path/to/database.db
```

### Commands

#### `stats` - Display Workflow Statistics

Display general workflow statistics with various filtering and monitoring options:

```bash
# Basic usage - show statistics
liteflow stats --db ./liteflow.db

# Show verbose output with workflow details
liteflow stats --db ./liteflow.db --verbose

# Filter by workflow status
liteflow stats --db ./liteflow.db --status pending
liteflow stats --db ./liteflow.db --status completed
liteflow stats --db ./liteflow.db --status failed

# Filter by identifier
liteflow stats --db ./liteflow.db --key userId --value 1001

# Real-time monitoring (refreshes every 2 seconds)
liteflow stats --db ./liteflow.db --watch

# Real-time monitoring with custom interval (5 seconds)
liteflow stats --db ./liteflow.db --watch --interval 5

# Combine filters with real-time monitoring
liteflow stats --db ./liteflow.db --status pending --watch --verbose
```

#### CLI Options

- `-d, --db <path>` - Path to database file (default: `./liteflow.db`)
- `-w, --watch` - Enable real-time monitoring (refresh every 2 seconds)
- `-i, --interval <seconds>` - Refresh interval for watch mode in seconds (default: `2`)
- `-s, --status <status>` - Filter by status (`pending`, `completed`, `failed`)
- `-k, --key <key>` - Filter by identifier key
- `-v, --value <value>` - Filter by identifier value
- `--verbose` - Show detailed information including workflows and steps
- `-h, --help` - Display help information

### CLI Output

The CLI displays:

1. **General Statistics**: Total workflows, completed, pending, failed counts, and average steps per workflow
2. **Workflow List** (with `--verbose` or filters): Detailed list of workflows with status, start time, and duration
3. **Most Frequent Steps**: Top 5 most frequently executed steps across all workflows

## API Reference

### `Liteflow(dbPath: string)`

Creates a new Liteflow instance.

### `init()`

Initializes the database schema.

### Error Handling

Liteflow implements a centralized error handling mechanism through the `wrap` function. This ensures that:

- All database operations are wrapped in try-catch blocks
- Errors are logged to the console
- Operations return fallback values instead of throwing errors
- System stability is maintained even when errors occur

Fallback values for different operations:
- `getWorkflows`: `{ workflows: [], total: 0, page: 1, pageSize: 10, totalPages: 0 }`
- `getSteps` and `getStepsByIdentifier`: `[]`
- `getWorkflowStats`: `{ total: 0, completed: 0, pending: 0, avgSteps: 0 }`
- `getMostFrequentSteps` and `getAverageStepDuration`: `[]`
- `attachIdentifier`, `deleteWorkflow`, `deleteAllWorkflows`: `false`

### `startWorkflow(name: string, identifiers: Identifier[]): WorkflowInstance`

Starts a new workflow and returns a WorkflowInstance object that provides convenient instance methods.

### WorkflowInstance Methods

The `WorkflowInstance` returned by `startWorkflow` provides the following methods:

- `workflow.id`: Get the workflow ID (string)
- `workflow.addStep(step: string, data: any)`: Add a step to this workflow
- `workflow.complete()`: Mark this workflow as completed
- `workflow.fail(reason?: string)`: Mark this workflow as failed
- `workflow.getSteps()`: Get all steps for this workflow
- `workflow.delete()`: Delete this workflow

### `addStep(workflowId: string | WorkflowInstance, step: string, data: any): void`

Adds a step to a workflow. Accepts either a workflow ID string or a WorkflowInstance.

### `completeWorkflow(workflowId: string | WorkflowInstance): void`

Marks a workflow as completed. Accepts either a workflow ID string or a WorkflowInstance.

### `getWorkflowByIdentifier(key: string, value: string): Workflow | undefined`

Retrieves a workflow by its identifier.

### `getSteps(workflowId: string): WorkflowStep[]`

Gets all steps for a workflow.

### `getStepsByIdentifier(key: string, value: string): WorkflowStep[]`

Gets all steps for workflows matching the given identifier key and value.

### `getWorkflowStats(): WorkflowStats`

Returns workflow statistics.

### `attachIdentifier(existingKey: string, existingValue: string, newIdentifier: Identifier): boolean`

Attaches a new identifier to an existing workflow. Returns true if successful, false if the workflow doesn't exist or if the identifier already exists.

### `getMostFrequentSteps(limit?: number): { step: string, count: number }[]`

Returns the most frequent steps across all workflows, limited by the specified number.

### `getAverageStepDuration(): { workflow_id: string, total_duration: number, step_count: number }[]`

Returns average step duration for workflows.

### `getWorkflows(options?: GetWorkflowsOptions): { workflows: Workflow[], total: number, page: number, pageSize: number, totalPages: number }`

Retrieves workflows with pagination, filtering and sorting options.

Options:
- `status?: 'pending' | 'completed' | 'failed'` - Filter by workflow status
- `page?: number` - Page number (default: 1)
- `pageSize?: number` - Items per page (default: 10)
- `orderBy?: 'started_at' | 'ended_at'` - Field to sort by (default: 'started_at')
- `order?: 'asc' | 'desc'` - Sort order (default: 'desc')
- `identifier?: { key: string, value: string }` - Filter by identifier key and value

### `deleteWorkflow(workflowId: string): boolean`

Deletes a workflow and all its steps. Returns true if the workflow was deleted successfully, false if the workflow doesn't exist or if there was an error.

### `deleteAllWorkflows(): boolean`

Deletes all workflows and their steps. Returns true if the operation was successful, false if there was an error.

## Types

```typescript
interface Identifier {
  key: string;
  value: string;
}

interface Workflow {
  id: string;
  name: string;
  identifiers: string;
  status: 'pending' | 'completed' | 'failed';
  started_at: string;
  ended_at?: string;
}

interface WorkflowStep {
  id: string;
  workflow_id: string;
  step: string;
  data: string;
  created_at: string;
}

interface WorkflowStats {
  total: number;
  completed: number;
  pending: number;
  avgSteps: number;
}

interface GetWorkflowsOptions {
  status?: 'pending' | 'completed' | 'failed';
  page?: number;
  pageSize?: number;
  orderBy?: 'started_at' | 'ended_at';
  order?: 'asc' | 'desc';
  identifier?: {
    key: string;
    value: string;
  };
}
```

## Development

### Setup

```bash
git clone https://github.com/indatawetrust/liteflow.git
cd liteflow
npm install
```

### Testing

```bash
npm test
```

### Benchmarking

```bash
npm run benchmark
```

## License

MIT