import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Liteflow } from '../index'
import * as path from 'path'
import * as fs from 'fs'
import { execSync } from 'child_process'

describe('CLI', () => {
  const testDbPath = path.join(__dirname, 'cli-test.db')
  const cliPath = 'node dist/cli.js'
  
  beforeEach(async () => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath)
    }
    
    // Create a fresh test database with sample data
    const liteflow = new Liteflow(testDbPath)
    await liteflow.init()
    
    const workflow1 = liteflow.startWorkflow('test-workflow-1', [
      { key: 'testId', value: '1' }
    ])
    workflow1.addStep('step1', { data: 'test' })
    workflow1.addStep('validate-email', { email: 'test@test.com' })
    workflow1.complete()
    
    const workflow2 = liteflow.startWorkflow('test-workflow-2', [
      { key: 'testId', value: '2' }
    ])
    workflow2.addStep('step1', { data: 'test' })
    // Leave this one pending

    const workflow3 = liteflow.startWorkflow('order-process', [
      { key: 'orderId', value: '100' }
    ])
    workflow3.addStep('validate-email', { email: 'order@test.com' })
    workflow3.addStep('charge-payment', { amount: 50 })
    workflow3.fail('Payment failed')
    
    // Wait for all operations to complete
    await liteflow.flushBatchInserts()
    await liteflow.destroy()
  })
  
  afterEach(() => {
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath)
    }
  })

  describe('stats command', () => {
    it('should display help information', () => {
      const output = execSync(`${cliPath} --help`).toString()
      expect(output).toContain('CLI tool for tracking workflow statistics')
      expect(output).toContain('stats')
      expect(output).toContain('list')
      expect(output).toContain('watch')
    })

    it('should display stats command help', () => {
      const output = execSync(`${cliPath} stats --help`).toString()
      expect(output).toContain('Display general workflow statistics')
      expect(output).toContain('--db')
      expect(output).toContain('--watch')
      expect(output).toContain('--status')
      expect(output).toContain('--name')
      expect(output).toContain('--start-date')
      expect(output).toContain('--end-date')
      expect(output).toContain('--step')
    })

    it('should display basic statistics', () => {
      const output = execSync(`${cliPath} stats --db ${testDbPath}`).toString()
      expect(output).toContain('Liteflow Statistics Dashboard')
      expect(output).toContain('Total Workflows')
      expect(output).toContain('Completed')
      expect(output).toContain('Pending')
    })

    it('should filter by status', () => {
      const output = execSync(`${cliPath} stats --db ${testDbPath} --status pending`).toString()
      expect(output).toContain('Liteflow Statistics Dashboard')
      expect(output).toContain('Workflows (pending)')
    })

    it('should show verbose output', () => {
      const output = execSync(`${cliPath} stats --db ${testDbPath} --verbose`).toString()
      expect(output).toContain('Liteflow Statistics Dashboard')
      expect(output).toContain('test-workflow')
      expect(output).toContain('Showing')
    })

    it('should filter by identifier', () => {
      const output = execSync(`${cliPath} stats --db ${testDbPath} --key testId --value 1`).toString()
      expect(output).toContain('Liteflow Statistics Dashboard')
      expect(output).toContain('Showing 1 of 1 workflows')
    })

    it('should handle non-existent database gracefully', () => {
      try {
        execSync(`${cliPath} stats --db /nonexistent/path.db`, { stdio: 'pipe' })
      } catch (error: any) {
        const output = error.stderr?.toString() || error.stdout?.toString() || ''
        expect(output).toContain('Error')
      }
    })
  })

  describe('stats command - new filters', () => {
    it('should filter by workflow name', () => {
      const output = execSync(`${cliPath} stats --db ${testDbPath} --name order --verbose`).toString()
      expect(output).toContain('order-process')
      expect(output).toContain('Showing 1 of 1 workflows')
    })

    it('should filter by workflow name with partial match', () => {
      const output = execSync(`${cliPath} stats --db ${testDbPath} --name test-workflow --verbose`).toString()
      expect(output).toContain('Showing 2 of 2 workflows')
    })

    it('should filter by step name', () => {
      const output = execSync(`${cliPath} stats --db ${testDbPath} --step validate-email --verbose`).toString()
      expect(output).toContain('Showing 2 of 2 workflows')
    })

    it('should filter by step name with single match', () => {
      const output = execSync(`${cliPath} stats --db ${testDbPath} --step charge-payment --verbose`).toString()
      expect(output).toContain('Showing 1 of 1 workflows')
    })

    it('should combine name and status filters', () => {
      const output = execSync(`${cliPath} stats --db ${testDbPath} --name test --status completed --verbose`).toString()
      expect(output).toContain('Showing 1 of 1 workflows')
    })

    it('should show empty result for non-matching filters', () => {
      const output = execSync(`${cliPath} stats --db ${testDbPath} --name nonexistent --verbose`).toString()
      expect(output).toContain('Showing 0 of 0 workflows')
    })

    it('should display active filters', () => {
      const output = execSync(`${cliPath} stats --db ${testDbPath} --name order --status failed`).toString()
      expect(output).toContain('Filters:')
      expect(output).toContain('status=failed')
      expect(output).toContain('name~order')
    })

    it('should filter by start date', () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
      const output = execSync(`${cliPath} stats --db ${testDbPath} --start-date ${yesterday} --verbose`).toString()
      expect(output).toContain('Showing 3 of 3 workflows')
    })

    it('should filter by end date (no results before yesterday)', () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
      const output = execSync(`${cliPath} stats --db ${testDbPath} --end-date ${yesterday} --verbose`).toString()
      expect(output).toContain('Showing 0 of 0 workflows')
    })
  })

  describe('list command', () => {
    it('should display list command help', () => {
      const output = execSync(`${cliPath} list --help`).toString()
      expect(output).toContain('List workflows with filtering and pagination')
      expect(output).toContain('--page')
      expect(output).toContain('--page-size')
      expect(output).toContain('--order-by')
      expect(output).toContain('--order')
    })

    it('should list all workflows', () => {
      const output = execSync(`${cliPath} list --db ${testDbPath}`).toString()
      expect(output).toContain('Liteflow Workflow List')
      expect(output).toContain('3 total workflows')
    })

    it('should list with status filter', () => {
      const output = execSync(`${cliPath} list --db ${testDbPath} --status completed`).toString()
      expect(output).toContain('Showing 1 of 1 workflows')
    })

    it('should list with name filter', () => {
      const output = execSync(`${cliPath} list --db ${testDbPath} --name order`).toString()
      expect(output).toContain('Showing 1 of 1 workflows')
    })

    it('should support pagination', () => {
      const output = execSync(`${cliPath} list --db ${testDbPath} --page-size 2 --page 1`).toString()
      expect(output).toContain('Showing 2 of 3 workflows')
      expect(output).toContain('Page 1 of 2')
    })

    it('should support ascending order', () => {
      const output = execSync(`${cliPath} list --db ${testDbPath} --order asc`).toString()
      expect(output).toContain('Liteflow Workflow List')
    })
  })

  describe('watch command', () => {
    it('should display watch command help', () => {
      const output = execSync(`${cliPath} watch --help`).toString()
      expect(output).toContain('Real-time monitoring of workflow changes')
      expect(output).toContain('--interval')
      expect(output).toContain('--name')
      expect(output).toContain('--step')
    })
  })
})
