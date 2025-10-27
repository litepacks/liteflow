import { Liteflow } from '../index'
import * as path from 'path'
import * as fs from 'fs'
import { execSync } from 'child_process'

describe('CLI', () => {
  const testDbPath = path.join(__dirname, 'cli-test.db')
  const cliPath = 'node dist/cli.js'
  
  beforeEach(() => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath)
    }
    
    // Create a fresh test database with sample data
    const liteflow = new Liteflow(testDbPath)
    liteflow.init()
    
    const workflow1 = liteflow.startWorkflow('test-workflow-1', [
      { key: 'testId', value: '1' }
    ])
    workflow1.addStep('step1', { data: 'test' })
    workflow1.complete()
    
    const workflow2 = liteflow.startWorkflow('test-workflow-2', [
      { key: 'testId', value: '2' }
    ])
    workflow2.addStep('step1', { data: 'test' })
    // Leave this one pending
  })
  
  afterEach(() => {
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath)
    }
  })

  it('should display help information', () => {
    const output = execSync(`${cliPath} --help`).toString()
    expect(output).toContain('CLI tool for tracking workflow statistics')
    expect(output).toContain('stats')
  })

  it('should display stats command help', () => {
    const output = execSync(`${cliPath} stats --help`).toString()
    expect(output).toContain('Display general workflow statistics')
    expect(output).toContain('--db')
    expect(output).toContain('--watch')
    expect(output).toContain('--status')
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
