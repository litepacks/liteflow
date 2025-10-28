import { Knex, knex } from 'knex'
import { v4 as uuidv4 } from 'uuid'
import { Workflow, WorkflowStep, WorkflowStats, Identifier } from './types'

export interface LiteflowConfig {
  client: 'sqlite3' | 'pg' | 'mysql' | 'mysql2'
  connection: string | {
    host?: string
    port?: number
    user?: string
    password?: string
    database?: string
    filename?: string
  }
  useNullAsDefault?: boolean
}

/**
 * WorkflowInstance: A wrapper around a workflow ID that provides instance methods
 */
export class WorkflowInstance {
  constructor(
    private workflowId: string,
    private liteflow: Liteflow
  ) {}

  /**
   * Get the workflow ID
   */
  get id(): string {
    return this.workflowId
  }

  /**
   * Add a step to this workflow
   */
  addStep(step: string, data: any) {
    return this.liteflow.addStep(this.workflowId, step, data)
  }

  /**
   * Mark this workflow as completed
   */
  complete() {
    return this.liteflow.completeWorkflow(this.workflowId)
  }

  /**
   * Mark this workflow as failed
   */
  fail(reason?: string) {
    return this.liteflow.failWorkflow(this.workflowId, reason)
  }

  /**
   * Get all steps for this workflow
   */
  getSteps(): Promise<WorkflowStep[]> {
    return this.liteflow.getSteps(this.workflowId)
  }

  /**
   * Add multiple steps to this workflow in a single batch operation
   */
  addSteps(steps: Array<{ step: string, data: any }>): Promise<void> {
    return this.liteflow.addSteps(this.workflowId, steps)
  }

  /**
   * Delete this workflow
   */
  delete(): Promise<boolean> {
    return this.liteflow.deleteWorkflow(this.workflowId)
  }

  /**
   * Convert to string (returns workflow ID)
   * This enables backward compatibility when used as a string
   */
  toString(): string {
    return this.workflowId
  }

  /**
   * Return the workflow ID when converted to JSON
   */
  toJSON(): string {
    return this.workflowId
  }

  /**
   * Return the workflow ID when used as a primitive
   */
  valueOf(): string {
    return this.workflowId
  }
}

/**
 * Liteflow: A lightweight workflow tracker with multi-database support
 */
export class Liteflow {
  db: Knex
  private pendingSteps: Array<{
    id: string
    workflow_id: string
    step: string
    data: string
    created_at: string
  }> = []
  private batchInsertTimer: NodeJS.Timeout | null = null
  private batchInsertDelay: number = 100 // milliseconds

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

  /**
   * Create a new Liteflow instance
   * @param configOrPath - Either a knex configuration object or a path to SQLite database (for backward compatibility)
   * @param options - Optional configuration for batch inserts
   */
  constructor(configOrPath: string | LiteflowConfig, options?: { batchInsertDelay?: number }) {
    if (typeof configOrPath === 'string') {
      // Backward compatibility: if a string is provided, assume it's a SQLite database path
      this.db = knex({
        client: 'sqlite3',
        connection: {
          filename: configOrPath
        },
        useNullAsDefault: true
      })
    } else {
      this.db = knex(configOrPath)
    }

    if (options?.batchInsertDelay !== undefined) {
      this.batchInsertDelay = options.batchInsertDelay
    }
  }

  private async wrap<T>(fn: () => T | Promise<T>, fallback?: T): Promise<T> {
    try {
      return await fn()
    } catch (err) {
      console.error('[Liteflow Error]', err)
      return fallback as T
    }
  }

  /**
   * Flush pending batch inserts immediately
   */
  async flushBatchInserts(): Promise<void> {
    if (this.batchInsertTimer) {
      clearTimeout(this.batchInsertTimer)
      this.batchInsertTimer = null
    }

    if (this.pendingSteps.length === 0) {
      return
    }

    const stepsToInsert = [...this.pendingSteps]
    this.pendingSteps = []

    try {
      await this.db('workflow_step').insert(stepsToInsert)
    } catch (err) {
      console.error('[Liteflow Error] Batch insert failed', err)
    }
  }

  private scheduleBatchInsert() {
    if (this.batchInsertTimer) {
      return
    }

    this.batchInsertTimer = setTimeout(() => {
      this.batchInsertTimer = null
      this.flushBatchInserts().catch(err => {
        console.error('[Liteflow Error] Failed to flush batch inserts', err)
      })
    }, this.batchInsertDelay)
  }

  async init() {
    return this.wrap(async () => {
      const hasWorkflowTable = await this.db.schema.hasTable('workflow')
      if (!hasWorkflowTable) {
        await this.db.schema.createTable('workflow', (table) => {
          table.string('id').primary()
          table.string('name').notNullable()
          table.text('identifiers')
          table.string('status').notNullable().defaultTo('pending')
          table.timestamp('started_at').defaultTo(this.db.fn.now())
          table.timestamp('ended_at')
        })
      }

      const hasStepTable = await this.db.schema.hasTable('workflow_step')
      if (!hasStepTable) {
        await this.db.schema.createTable('workflow_step', (table) => {
          table.string('id').primary()
          table.string('workflow_id').notNullable()
          table.string('step').notNullable()
          table.text('data')
          table.timestamp('created_at').defaultTo(this.db.fn.now())
          table.foreign('workflow_id').references('workflow.id')
        })
      }
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

  startWorkflow(name: string, identifiers: Identifier[]): WorkflowInstance {
    try {
      const id = uuidv4()
      const startedAt = new Date().toISOString()
      
      this.db('workflow').insert({
        id,
        name,
        identifiers: JSON.stringify(identifiers),
        started_at: startedAt
      }).then(() => {
        for (const handler of this.startHandlers) {
          handler({ workflowId: id, name, identifiers, startedAt })
        }
      }).catch(err => {
        console.error('[Liteflow Error] Failed to insert workflow', err)
      })

      return new WorkflowInstance(id, this)
    } catch (err) {
      console.error('[Liteflow Error]', err)
      throw err
    }
  }

  addStep(workflowId: string | WorkflowInstance, step: string, data: any) {
    return this.wrap(() => {
      const id = typeof workflowId === 'string' ? workflowId : workflowId.id
      const createdAt = new Date().toISOString()
      const stepId = uuidv4()

      // Add to pending batch
      this.pendingSteps.push({
        id: stepId,
        workflow_id: id,
        step,
        data: JSON.stringify(data),
        created_at: createdAt
      })

      // Schedule batch insert
      this.scheduleBatchInsert()

      for (const handler of this.stepHandlers) {
        handler({ workflowId: id, step, data, createdAt })
      }
    })
  }

  /**
   * Add multiple steps in a single batch operation
   * This is more efficient than calling addStep multiple times
   */
  async addSteps(workflowId: string | WorkflowInstance, steps: Array<{ step: string, data: any }>): Promise<void> {
    return this.wrap(async () => {
      const id = typeof workflowId === 'string' ? workflowId : workflowId.id
      const createdAt = new Date().toISOString()

      const stepsToInsert = steps.map(({ step, data }) => ({
        id: uuidv4(),
        workflow_id: id,
        step,
        data: JSON.stringify(data),
        created_at: createdAt
      }))

      await this.db('workflow_step').insert(stepsToInsert)

      for (const stepData of stepsToInsert) {
        for (const handler of this.stepHandlers) {
          handler({ 
            workflowId: id, 
            step: stepData.step, 
            data: JSON.parse(stepData.data), 
            createdAt 
          })
        }
      }
    })
  }

  completeWorkflow(workflowId: string | WorkflowInstance) {
    return this.wrap(() => {
      const id = typeof workflowId === 'string' ? workflowId : workflowId.id
      const completedAt = new Date().toISOString()
      
      this.db('workflow')
        .where({ id })
        .update({
          status: 'completed',
          ended_at: completedAt
        })
        .then(() => {
          for (const handler of this.completeHandlers) {
            handler({ workflowId: id, completedAt })
          }
        })
        .catch(err => {
          console.error('[Liteflow Error] Failed to complete workflow', err)
        })
    })
  }

  failWorkflow(workflowId: string | WorkflowInstance, reason?: string) {
    return this.wrap(() => {
      const id = typeof workflowId === 'string' ? workflowId : workflowId.id
      const failedAt = new Date().toISOString()
      
      this.db('workflow')
        .where({ id })
        .update({
          status: 'failed',
          ended_at: failedAt
        })
        .then(() => {
          for (const handler of this.failHandlers) {
            handler({ workflowId: id, failedAt, reason })
          }
        })
        .catch(err => {
          console.error('[Liteflow Error] Failed to fail workflow', err)
        })
    })
  }

  async getWorkflowByIdentifier(key: string, value: string): Promise<Workflow | undefined> {
    return this.wrap(async () => {
      // For SQLite, we use json_each
      // For PostgreSQL, we use jsonb operators
      // For MySQL, we use JSON_CONTAINS
      const clientType = this.db.client.config.client

      if (clientType === 'pg' || clientType === 'postgresql') {
        return await this.db('workflow')
          .whereRaw(`identifiers::jsonb @> ?`, [JSON.stringify([{ key, value }])])
          .first()
      } else if (clientType === 'mysql' || clientType === 'mysql2') {
        return await this.db('workflow')
          .whereRaw(`JSON_CONTAINS(identifiers, ?)`, [JSON.stringify({ key, value })])
          .first()
      } else {
        // SQLite
        return await this.db('workflow')
          .whereRaw(`EXISTS (
            SELECT 1 FROM json_each(workflow.identifiers)
            WHERE json_extract(json_each.value, '$.key') = ? 
            AND json_extract(json_each.value, '$.value') = ?
          )`, [key, value])
          .first()
      }
    })
  }

  async getWorkflows(options: {
    status?: 'pending' | 'completed' | 'failed';
    page?: number;
    pageSize?: number;
    orderBy?: 'started_at' | 'ended_at';
    order?: 'asc' | 'desc';
    identifier?: {
      key: string;
      value: string;
    };
  } = {}): Promise<{ workflows: Workflow[], total: number, page: number, pageSize: number, totalPages: number }> {
    return this.wrap(async () => {
      const {
        status,
        page = 1,
        pageSize = 10,
        orderBy = 'started_at',
        order = 'desc',
        identifier
      } = options;

      const offset = (page - 1) * pageSize;
      const clientType = this.db.client.config.client

      let countQuery = this.db('workflow')
      let dataQuery = this.db('workflow')

      if (status) {
        countQuery = countQuery.where({ status })
        dataQuery = dataQuery.where({ status })
      }

      if (identifier) {
        if (clientType === 'pg' || clientType === 'postgresql') {
          const identifierFilter = (qb: any) => {
            qb.whereRaw(`identifiers::jsonb @> ?`, [JSON.stringify([identifier])])
          }
          countQuery = countQuery.where(identifierFilter)
          dataQuery = dataQuery.where(identifierFilter)
        } else if (clientType === 'mysql' || clientType === 'mysql2') {
          const identifierFilter = (qb: any) => {
            qb.whereRaw(`JSON_CONTAINS(identifiers, ?)`, [JSON.stringify(identifier)])
          }
          countQuery = countQuery.where(identifierFilter)
          dataQuery = dataQuery.where(identifierFilter)
        } else {
          // SQLite
          const identifierFilter = (qb: any) => {
            qb.whereRaw(`EXISTS (
              SELECT 1 FROM json_each(workflow.identifiers)
              WHERE json_extract(json_each.value, '$.key') = ? 
              AND json_extract(json_each.value, '$.value') = ?
            )`, [identifier.key, identifier.value])
          }
          countQuery = countQuery.where(identifierFilter)
          dataQuery = dataQuery.where(identifierFilter)
        }
      }

      const countResult = await countQuery.count('* as total').first()
      const total = countResult?.total || 0

      const workflows = await dataQuery
        .orderBy(orderBy, order)
        .limit(pageSize)
        .offset(offset) as Workflow[]

      return {
        workflows,
        total: Number(total),
        page,
        pageSize,
        totalPages: Math.ceil(Number(total) / pageSize)
      };
    }, { workflows: [], total: 0, page: 1, pageSize: 10, totalPages: 0 })
  }

  async getSteps(workflowId: string | WorkflowInstance): Promise<WorkflowStep[]> {
    return this.wrap(async () => {
      const id = typeof workflowId === 'string' ? workflowId : workflowId.id
      return await this.db('workflow_step')
        .where({ workflow_id: id })
        .orderBy('created_at', 'asc') as WorkflowStep[]
    }, [] as WorkflowStep[])
  }

  async getStepsByIdentifier(key: string, value: string): Promise<WorkflowStep[]> {
    return this.wrap(async () => {
      const clientType = this.db.client.config.client

      if (clientType === 'pg' || clientType === 'postgresql') {
        return await this.db('workflow_step as ws')
          .join('workflow as w', 'w.id', 'ws.workflow_id')
          .whereRaw(`w.identifiers::jsonb @> ?`, [JSON.stringify([{ key, value }])])
          .orderBy('ws.created_at', 'asc')
          .select('ws.*') as WorkflowStep[]
      } else if (clientType === 'mysql' || clientType === 'mysql2') {
        return await this.db('workflow_step as ws')
          .join('workflow as w', 'w.id', 'ws.workflow_id')
          .whereRaw(`JSON_CONTAINS(w.identifiers, ?)`, [JSON.stringify({ key, value })])
          .orderBy('ws.created_at', 'asc')
          .select('ws.*') as WorkflowStep[]
      } else {
        // SQLite
        return await this.db('workflow_step as ws')
          .join('workflow as w', 'w.id', 'ws.workflow_id')
          .whereRaw(`EXISTS (
            SELECT 1 FROM json_each(w.identifiers)
            WHERE json_extract(json_each.value, '$.key') = ? 
            AND json_extract(json_each.value, '$.value') = ?
          )`, [key, value])
          .orderBy('ws.created_at', 'asc')
          .select('ws.*') as WorkflowStep[]
      }
    }, [] as WorkflowStep[])
  }

  async attachIdentifier(existingKey: string, existingValue: string, newIdentifier: Identifier): Promise<boolean> {
    return this.wrap(async () => {
      const workflow = await this.getWorkflowByIdentifier(existingKey, existingValue)
      if (!workflow) return false

      if (!newIdentifier || typeof newIdentifier !== 'object' || !newIdentifier.key || !newIdentifier.value) {
        return false
      }

      const currentIdentifiers = JSON.parse(workflow.identifiers || '[]')
      const exists = currentIdentifiers.find((i: Identifier) => i.key === newIdentifier.key && i.value === newIdentifier.value)
      if (exists) return false

      currentIdentifiers.push(newIdentifier)
      await this.db('workflow')
        .where({ id: workflow.id })
        .update({ identifiers: JSON.stringify(currentIdentifiers) })
      return true
    }, false)
  }

  async getWorkflowStats(): Promise<WorkflowStats> {
    return this.wrap(async () => {
      const result = await this.db('workflow')
        .select(
          this.db.raw('COUNT(*) as total'),
          this.db.raw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as completed', ['completed']),
          this.db.raw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as pending', ['pending'])
        )
        .first()

      // Calculate average steps per workflow
      const workflowsWithSteps = await this.db('workflow_step')
        .select('workflow_id')
        .count('* as step_count')
        .groupBy('workflow_id')
      
      const avgSteps = workflowsWithSteps.length > 0
        ? workflowsWithSteps.reduce((sum, w: any) => sum + Number(w.step_count), 0) / workflowsWithSteps.length
        : 0

      return {
        total: Number(result.total) || 0,
        completed: Number(result.completed) || 0,
        pending: Number(result.pending) || 0,
        avgSteps: Math.round(avgSteps * 100) / 100
      }
    }, { total: 0, completed: 0, pending: 0, avgSteps: 0 })
  }

  async getMostFrequentSteps(limit: number = 5): Promise<{ step: string, count: number }[]> {
    return this.wrap(async () => {
      const results = await this.db('workflow_step')
        .select('step')
        .count('* as count')
        .groupBy('step')
        .orderBy('count', 'desc')
        .limit(limit)
      
      return results.map(r => ({ step: String(r.step), count: Number(r.count) }))
    }, [] as { step: string, count: number }[])
  }

  async getAverageStepDuration(): Promise<{ workflow_id: string, total_duration: number, step_count: number }[]> {
    return this.wrap(async () => {
      // This is database-specific - for simplicity, we'll return step counts per workflow
      const results = await this.db('workflow_step')
        .select('workflow_id')
        .count('* as step_count')
        .groupBy('workflow_id')
      
      return results.map(r => ({
        workflow_id: String(r.workflow_id),
        total_duration: 0, // Duration calculation would require timestamp parsing
        step_count: Number(r.step_count)
      }))
    }, [] as { workflow_id: string, total_duration: number, step_count: number }[])
  }

  async deleteWorkflow(workflowId: string | WorkflowInstance): Promise<boolean> {
    return this.wrap(async () => {
      const id = typeof workflowId === 'string' ? workflowId : workflowId.id
      const workflow = await this.db('workflow').where({ id }).first()
      
      if (!workflow) {
        return false
      }

      await this.db.transaction(async (trx) => {
        await trx('workflow_step').where({ workflow_id: id }).delete()
        await trx('workflow').where({ id }).delete()
      })

      return true
    }, false)
  }

  async deleteAllWorkflows(): Promise<boolean> {
    return this.wrap(async () => {
      await this.db.transaction(async (trx) => {
        await trx('workflow_step').delete()
        await trx('workflow').delete()
      })
      return true
    }, false)
  }

  /**
   * Close the database connection and flush any pending batch inserts
   */
  async destroy(): Promise<void> {
    await this.flushBatchInserts()
    await this.db.destroy()
  }
}
