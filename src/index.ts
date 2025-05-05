import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import { Workflow, WorkflowStep, WorkflowStats, Identifier } from './types'

/**
 * Liteflow: A lightweight SQLite-based workflow tracker
 */
export class Liteflow {
  db: Database.Database

  private stepHandlers: ((step: {
    workflowId: string
    step: string
    data: any
    createdAt: string
  }) => void | Promise<void>)[] = []

  private startHandlers: ((info: {
    workflowId: string
    name: string
    identifiers: Identifier[]
    startedAt: string
  }) => void | Promise<void>)[] = []

  private completeHandlers: ((info: {
    workflowId: string
    completedAt: string
  }) => void | Promise<void>)[] = []

  private failHandlers: ((info: {
    workflowId: string
    failedAt: string
    reason?: string
  }) => void | Promise<void>)[] = []

  constructor(dbPath: string) {
    this.db = new Database(dbPath)
  }

  private wrap<T>(fn: () => T, fallback?: T): T {
    try {
      return fn()
    } catch (err) {
      console.error('[Liteflow Error]', err)
      return fallback as T
    }
  }

  init() {
    return this.wrap(() => {
      const schema = `
        CREATE TABLE IF NOT EXISTS workflow (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          identifiers TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          ended_at DATETIME
        );

        CREATE TABLE IF NOT EXISTS workflow_step (
          id TEXT PRIMARY KEY,
          workflow_id TEXT NOT NULL,
          step TEXT NOT NULL,
          data TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (workflow_id) REFERENCES workflow(id)
        );
      `
      this.db.exec(schema)
    })
  }

  onStep(handler: (step: {
    workflowId: string
    step: string
    data: any
    createdAt: string
  }) => void | Promise<void>) {
    this.stepHandlers.push(handler)
  }

  onStart(handler: (info: {
    workflowId: string
    name: string
    identifiers: Identifier[]
    startedAt: string
  }) => void | Promise<void>) {
    this.startHandlers.push(handler)
  }

  onComplete(handler: (info: {
    workflowId: string
    completedAt: string
  }) => void | Promise<void>) {
    this.completeHandlers.push(handler)
  }

  onFail(handler: (info: {
    workflowId: string
    failedAt: string
    reason?: string
  }) => void | Promise<void>) {
    this.failHandlers.push(handler)
  }

  startWorkflow(name: string, identifiers: Identifier[]) {
    return this.wrap(() => {
      const id = uuidv4()
      const startedAt = new Date().toISOString()
      const stmt = this.db.prepare(`
        INSERT INTO workflow (id, name, identifiers, started_at)
        VALUES (?, ?, ?, ?)
      `)
      stmt.run(id, name, JSON.stringify(identifiers), startedAt)

      for (const handler of this.startHandlers) {
        handler({ workflowId: id, name, identifiers, startedAt })
      }

      return id
    })
  }

  addStep(workflowId: string, step: string, data: any) {
    return this.wrap(() => {
      const stmt = this.db.prepare(`
        INSERT INTO workflow_step (id, workflow_id, step, data)
        VALUES (?, ?, ?, ?)
      `)
      const createdAt = new Date().toISOString()
      stmt.run(uuidv4(), workflowId, step, JSON.stringify(data))

      for (const handler of this.stepHandlers) {
        handler({ workflowId, step, data, createdAt })
      }
    })
  }

  completeWorkflow(workflowId: string) {
    return this.wrap(() => {
      const completedAt = new Date().toISOString()
      const stmt = this.db.prepare(`
        UPDATE workflow SET status = 'completed', ended_at = ?
        WHERE id = ?
      `)
      stmt.run(completedAt, workflowId)

      for (const handler of this.completeHandlers) {
        handler({ workflowId, completedAt })
      }
    })
  }

  failWorkflow(workflowId: string, reason?: string) {
    return this.wrap(() => {
      const failedAt = new Date().toISOString()
      const stmt = this.db.prepare(`
        UPDATE workflow SET status = 'failed', ended_at = ?
        WHERE id = ?
      `)
      stmt.run(failedAt, workflowId)

      for (const handler of this.failHandlers) {
        handler({ workflowId, failedAt, reason })
      }
    })
  }

  getWorkflowByIdentifier(key: string, value: string): Workflow | undefined {
    return this.wrap(() => {
      const stmt = this.db.prepare(`
        SELECT * FROM workflow
        WHERE EXISTS (
          SELECT 1 FROM json_each(workflow.identifiers)
          WHERE json_each.value ->> 'key' = ? AND json_each.value ->> 'value' = ?
        )
      `)
      return stmt.get(key, value) as Workflow | undefined
    })
  }

  getWorkflows(options: {
    status?: 'pending' | 'completed' | 'failed';
    page?: number;
    pageSize?: number;
    orderBy?: 'started_at' | 'ended_at';
    order?: 'asc' | 'desc';
    identifier?: {
      key: string;
      value: string;
    };
  } = {}) {
    return this.wrap(() => {
      const {
        status,
        page = 1,
        pageSize = 10,
        orderBy = 'started_at',
        order = 'desc',
        identifier
      } = options;

      const offset = (page - 1) * pageSize;

      let countQuery = 'SELECT COUNT(*) as total FROM workflow';
      const countParams: any[] = [];
      
      if (status) {
        countQuery += ' WHERE status = ?';
        countParams.push(status);
      }

      if (identifier) {
        countQuery += status ? ' AND ' : ' WHERE ';
        countQuery += 'EXISTS (SELECT 1 FROM json_each(workflow.identifiers) WHERE json_each.value ->> \'key\' = ? AND json_each.value ->> \'value\' = ?)';
        countParams.push(identifier.key, identifier.value);
      }

      const countStmt = this.db.prepare(countQuery);
      const { total } = countStmt.get(...countParams) as { total: number };

      let query = 'SELECT * FROM workflow';
      const params: any[] = [];

      if (status) {
        query += ' WHERE status = ?';
        params.push(status);
      }

      if (identifier) {
        query += status ? ' AND ' : ' WHERE ';
        query += 'EXISTS (SELECT 1 FROM json_each(workflow.identifiers) WHERE json_each.value ->> \'key\' = ? AND json_each.value ->> \'value\' = ?)';
        params.push(identifier.key, identifier.value);
      }

      query += ` ORDER BY ${orderBy} ${order}`;
      query += ' LIMIT ? OFFSET ?';
      params.push(pageSize, offset);

      const stmt = this.db.prepare(query);
      const workflows = stmt.all(...params) as Workflow[];

      return {
        workflows,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      };
    }, { workflows: [], total: 0, page: 1, pageSize: 10, totalPages: 0 })
  }

  getSteps(workflowId: string): WorkflowStep[] {
    return this.wrap(() => {
      const stmt = this.db.prepare(`
        SELECT * FROM workflow_step
        WHERE workflow_id = ?
        ORDER BY created_at ASC
      `)
      return stmt.all(workflowId) as WorkflowStep[]
    }, [])
  }

  getStepsByIdentifier(key: string, value: string): WorkflowStep[] {
    return this.wrap(() => {
      const stmt = this.db.prepare(`
        SELECT ws.* FROM workflow_step ws
        INNER JOIN workflow w ON w.id = ws.workflow_id
        WHERE EXISTS (
          SELECT 1 FROM json_each(w.identifiers)
          WHERE json_each.value ->> 'key' = ? AND json_each.value ->> 'value' = ?
        )
        ORDER BY ws.created_at ASC
      `)
      return stmt.all(key, value) as WorkflowStep[]
    }, [])
  }

  attachIdentifier(existingKey: string, existingValue: string, newIdentifier: Identifier) {
    return this.wrap(() => {
      const workflow = this.getWorkflowByIdentifier(existingKey, existingValue)
      if (!workflow) return false

      if (!newIdentifier || typeof newIdentifier !== 'object' || !newIdentifier.key || !newIdentifier.value) {
        return false
      }

      const currentIdentifiers = JSON.parse(workflow.identifiers || '[]')
      const exists = currentIdentifiers.find((i: Identifier) => i.key === newIdentifier.key && i.value === newIdentifier.value)
      if (exists) return false

      currentIdentifiers.push(newIdentifier)
      const stmt = this.db.prepare(`UPDATE workflow SET identifiers = ? WHERE id = ?`)
      stmt.run(JSON.stringify(currentIdentifiers), workflow.id)
      return true
    }, false)
  }

  getWorkflowStats(): WorkflowStats {
    return this.wrap(() => {
      const stmt = this.db.prepare(`
        SELECT 
          COALESCE(COUNT(*), 0) as total,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as completed,
          COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pending,
          COALESCE(ROUND(AVG(step_counts.count), 2), 0) as avgSteps
        FROM workflow
        LEFT JOIN (
          SELECT workflow_id, COUNT(*) as count
          FROM workflow_step
          GROUP BY workflow_id
        ) as step_counts ON workflow.id = step_counts.workflow_id
      `)
      return stmt.get() as WorkflowStats
    }, { total: 0, completed: 0, pending: 0, avgSteps: 0 })
  }

  getMostFrequentSteps(limit: number = 5): { step: string, count: number }[] {
    return this.wrap(() => {
      const stmt = this.db.prepare(`
        SELECT step, COUNT(*) as count
        FROM workflow_step
        GROUP BY step
        ORDER BY count DESC
        LIMIT ?
      `)
      return stmt.all(limit) as { step: string, count: number }[]
    }, [])
  }

  getAverageStepDuration(): { workflow_id: string, total_duration: number, step_count: number }[] {
    return this.wrap(() => {
      const stmt = this.db.prepare(`
        SELECT 
          workflow_id,
          MAX(created_at) - MIN(created_at) AS total_duration,
          COUNT(*) AS step_count
        FROM workflow_step
        GROUP BY workflow_id
      `)
      return stmt.all() as { workflow_id: string, total_duration: number, step_count: number }[]
    }, [])
  }

  deleteWorkflow(workflowId: string): boolean {
    return this.wrap(() => {
      const workflowStmt = this.db.prepare('SELECT id FROM workflow WHERE id = ?')
      const workflow = workflowStmt.get(workflowId)
      
      if (!workflow) {
        return false
      }

      this.db.exec('BEGIN TRANSACTION')

      try {
        const deleteStepsStmt = this.db.prepare('DELETE FROM workflow_step WHERE workflow_id = ?')
        deleteStepsStmt.run(workflowId)

        const deleteWorkflowStmt = this.db.prepare('DELETE FROM workflow WHERE id = ?')
        deleteWorkflowStmt.run(workflowId)

        this.db.exec('COMMIT')
        return true
      } catch (error) {
        this.db.exec('ROLLBACK')
        throw error
      }
    }, false)
  }

  deleteAllWorkflows(): boolean {
    return this.wrap(() => {
      this.db.exec('BEGIN TRANSACTION')

      try {
        this.db.exec('DELETE FROM workflow_step')
        this.db.exec('DELETE FROM workflow')
        this.db.exec('COMMIT')
        return true
      } catch (error) {
        this.db.exec('ROLLBACK')
        throw error
      }
    }, false)
  }
}
