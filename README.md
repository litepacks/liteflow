# Liteflow

> ⚠️ **Experimental Package**: This package is currently under development and should not be used in production. The API may change.

A lightweight workflow tracker for Node.js applications with multi-database support.

## Features

- Simple workflow management
- Step tracking
- Identifier-based workflow lookup
- Workflow statistics
- **CLI tool for real-time statistics monitoring**
- **Multi-database support** (SQLite, PostgreSQL, MySQL)
- **Batch insert architecture** for high-performance writes
- TypeScript support
- Async/await API
- Bulk operations support
- Performance optimizations
- Centralized error handling
- Graceful error recovery

## Installation

```bash
npm install liteflow
```

## Quick Start

```typescript
import { Liteflow } from 'liteflow';

// Initialize with a database path (SQLite)
const liteflow = new Liteflow('path/to/database.db');
await liteflow.init();

// Start a new workflow - returns a WorkflowInstance
const workflow = liteflow.startWorkflow('test-workflow', [
  { key: 'test', value: '123' }
]);

// Add steps to the workflow
workflow.addStep('step1', { data: 'test1' });
workflow.addStep('step2', { data: 'test2' });

// Flush batch inserts (optional - done automatically)
await liteflow.flushBatchInserts();

// Mark workflow as complete
workflow.complete();

// Get workflow steps
const steps = await workflow.getSteps();

// Clean up when done
await liteflow.destroy();
```

## Database Configuration

### SQLite (Default)

```typescript
// Simple path (backward compatible)
const liteflow = new Liteflow('./database.db');

// Or with config object
const liteflow = new Liteflow({
  client: 'sqlite3',
  connection: {
    filename: './database.db'
  },
  useNullAsDefault: true
});
```

### PostgreSQL

```typescript
const liteflow = new Liteflow({
  client: 'pg',
  connection: {
    host: 'localhost',
    port: 5432,
    user: 'username',
    password: 'password',
    database: 'mydb'
  }
});
```

### MySQL

```typescript
const liteflow = new Liteflow({
  client: 'mysql2',
  connection: {
    host: 'localhost',
    port: 3306,
    user: 'username',
    password: 'password',
    database: 'mydb'
  }
});
```

## Usage

```typescript
import { Liteflow } from 'liteflow';

// Initialize with a database path
const liteflow = new Liteflow('path/to/database.db');
await liteflow.init();

// Start a new workflow - returns a WorkflowInstance
const workflow = liteflow.startWorkflow('test-workflow', [
  { key: 'test', value: '123' }
]);

// Use the workflow instance methods directly
workflow.addStep('step1', { data: 'test1' });
workflow.addStep('step2', { data: 'test2' });
workflow.complete();

// Or use the traditional API (still supported)
const workflowId = workflow.id; // Get the workflow ID
liteflow.addStep(workflowId, 'step1', { data: 'test1' });
liteflow.addStep(workflowId, 'step2', { data: 'test2' });
liteflow.completeWorkflow(workflowId);

// Batch insert multiple steps (more efficient)
await liteflow.addSteps(workflowId, [
  { step: 'step3', data: { value: 3 } },
  { step: 'step4', data: { value: 4 } },
  { step: 'step5', data: { value: 5 } }
]);

// Manual flush of pending batch inserts
await liteflow.flushBatchInserts();

// Get workflow by identifier
const foundWorkflow = await liteflow.getWorkflowByIdentifier('test', '123');

// Get workflow steps
const steps = await workflow.getSteps(); // Using instance method
// or
const stepsById = await liteflow.getSteps(workflowId); // Using traditional method

// Get steps by identifier
const stepsByIdentifier = await liteflow.getStepsByIdentifier('test', '123');

// Get workflow statistics
const stats = await liteflow.getWorkflowStats();

// Get workflows with pagination and filtering
const workflows = await liteflow.getWorkflows({
  status: 'completed',
  page: 1,
  pageSize: 10,
  orderBy: 'started_at',
  order: 'desc'
});

// Delete a workflow
const deleted = await workflow.delete(); // Using instance method
// or
const deletedById = await liteflow.deleteWorkflow(workflowId); // Using traditional method
if (deleted) {
  console.log('Workflow deleted successfully');
}

// Delete all workflows
const allDeleted = await liteflow.deleteAllWorkflows();
if (allDeleted) {
  console.log('All workflows deleted successfully');
}

// Attach additional identifiers
await liteflow.attachIdentifier('test', '123', { key: 'test2', value: '456' });

// Get most frequent steps
const frequentSteps = await liteflow.getMostFrequentSteps(5);

// Get average step duration
const stepDurations = await liteflow.getAverageStepDuration();

// Clean up database connection
await liteflow.destroy();
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

### `Liteflow(config: string | LiteflowConfig, options?: { batchInsertDelay?: number })`

Creates a new Liteflow instance.

**Parameters:**
- `config`: Database path (string) for SQLite, or configuration object for other databases
- `options.batchInsertDelay`: Delay in milliseconds before flushing batch inserts (default: 100)

**Example:**
```typescript
// SQLite with string path
const liteflow = new Liteflow('./database.db');

// PostgreSQL with config
const liteflow = new Liteflow({
  client: 'pg',
  connection: {
    host: 'localhost',
    database: 'mydb',
    user: 'user',
    password: 'pass'
  }
});

// Custom batch delay
const liteflow = new Liteflow('./database.db', { batchInsertDelay: 200 });
```

### `init(): Promise<void>`

Initializes the database schema. Must be called before using other methods.

### `destroy(): Promise<void>`

Closes the database connection and flushes any pending batch inserts. Should be called when done using the instance.

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

### Batch Insert Methods

### `addSteps(workflowId: string | WorkflowInstance, steps: Array<{ step: string, data: any }>): Promise<void>`

Adds multiple steps to a workflow in a single batch operation. More efficient than calling `addStep` multiple times.

**Example:**
```typescript
await liteflow.addSteps(workflowId, [
  { step: 'step1', data: { value: 1 } },
  { step: 'step2', data: { value: 2 } },
  { step: 'step3', data: { value: 3 } }
]);
```

### `flushBatchInserts(): Promise<void>`

Manually flushes any pending batch inserts to the database. Normally happens automatically after the configured delay, but can be called to ensure immediate persistence.

**Example:**
```typescript
liteflow.addStep(workflowId, 'step1', { data: 'test' });
await liteflow.flushBatchInserts(); // Ensure step is persisted
```

### WorkflowInstance Methods

The `WorkflowInstance` returned by `startWorkflow` provides the following methods:

- `workflow.id`: Get the workflow ID (string)
- `workflow.addStep(step: string, data: any)`: Add a step to this workflow
- `workflow.addSteps(steps: Array<{ step: string, data: any }>)`: Add multiple steps in batch (Promise)
- `workflow.complete()`: Mark this workflow as completed
- `workflow.fail(reason?: string)`: Mark this workflow as failed
- `workflow.getSteps()`: Get all steps for this workflow (Promise)
- `workflow.delete()`: Delete this workflow (Promise)

### `addStep(workflowId: string | WorkflowInstance, step: string, data: any): void`

Adds a step to a workflow. Steps are queued and inserted in batches for performance. Accepts either a workflow ID string or a WorkflowInstance.

### `completeWorkflow(workflowId: string | WorkflowInstance): void`

Marks a workflow as completed. Accepts either a workflow ID string or a WorkflowInstance.

### `getWorkflowByIdentifier(key: string, value: string): Promise<Workflow | undefined>`

Retrieves a workflow by its identifier.

### `getSteps(workflowId: string): Promise<WorkflowStep[]>`

Gets all steps for a workflow.

### `getStepsByIdentifier(key: string, value: string): Promise<WorkflowStep[]>`

Gets all steps for workflows matching the given identifier key and value.

### `getWorkflowStats(): Promise<WorkflowStats>`

Returns workflow statistics.

### `attachIdentifier(existingKey: string, existingValue: string, newIdentifier: Identifier): Promise<boolean>`

Attaches a new identifier to an existing workflow. Returns true if successful, false if the workflow doesn't exist or if the identifier already exists.

### `getMostFrequentSteps(limit?: number): Promise<{ step: string, count: number }[]>`

Returns the most frequent steps across all workflows, limited by the specified number.

### `getAverageStepDuration(): Promise<{ workflow_id: string, total_duration: number, step_count: number }[]>`

Returns average step duration for workflows.

### `getWorkflows(options?: GetWorkflowsOptions): Promise<{ workflows: Workflow[], total: number, page: number, pageSize: number, totalPages: number }>`

Retrieves workflows with pagination, filtering and sorting options.

Options:
- `status?: 'pending' | 'completed' | 'failed'` - Filter by workflow status
- `page?: number` - Page number (default: 1)
- `pageSize?: number` - Items per page (default: 10)
- `orderBy?: 'started_at' | 'ended_at'` - Field to sort by (default: 'started_at')
- `order?: 'asc' | 'desc'` - Sort order (default: 'desc')
- `identifier?: { key: string, value: string }` - Filter by identifier key and value

### `deleteWorkflow(workflowId: string): Promise<boolean>`

Deletes a workflow and all its steps. Returns true if the workflow was deleted successfully, false if the workflow doesn't exist or if there was an error.

### `deleteAllWorkflows(): Promise<boolean>`

Deletes all workflows and their steps. Returns true if the operation was successful, false if there was an error.

## Types

```typescript
interface LiteflowConfig {
  client: 'sqlite3' | 'pg' | 'mysql' | 'mysql2';
  connection: string | {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
    filename?: string;
  };
  useNullAsDefault?: boolean;
}

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

## Performance

### Batch Insert Architecture

Liteflow uses an automatic batch insert system for workflow steps:

- **Automatic Batching**: Steps added with `addStep()` are queued and inserted in batches
- **Configurable Delay**: Default 100ms delay before flushing (configurable via constructor)
- **Manual Control**: Use `flushBatchInserts()` for immediate persistence
- **Explicit Batching**: Use `addSteps()` for bulk operations

**Performance Benefits:**
- Reduces database round trips
- Improves throughput for high-volume workflows
- Maintains ACID guarantees

**Example:**
```typescript
// Automatic batching (100ms delay)
workflow.addStep('step1', { data: 1 });
workflow.addStep('step2', { data: 2 });
// Steps will be inserted together after 100ms

// Manual flush for immediate persistence
await liteflow.flushBatchInserts();

// Explicit batch insert
await liteflow.addSteps(workflowId, [
  { step: 'step1', data: { value: 1 } },
  { step: 'step2', data: { value: 2 } }
]);
```

## Migration Guide

### Upgrading from 1.0.x to 2.0.x

The main change is that all database methods are now asynchronous. Add `await` to all method calls:

```typescript
// Before (1.0.x)
const liteflow = new Liteflow('./database.db');
liteflow.init();
const steps = liteflow.getSteps(workflowId);
const stats = liteflow.getWorkflowStats();

// After (2.0.x)
const liteflow = new Liteflow('./database.db');
await liteflow.init();
const steps = await liteflow.getSteps(workflowId);
const stats = await liteflow.getWorkflowStats();

// Don't forget to clean up
await liteflow.destroy();
```

**Key Changes:**
1. All database methods return Promises (use `await`)
2. `init()` is now async
3. New `destroy()` method for cleanup
4. New batch insert methods (`addSteps`, `flushBatchInserts`)
5. Multi-database support (SQLite, PostgreSQL, MySQL)

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