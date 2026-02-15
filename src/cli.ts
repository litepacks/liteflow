#!/usr/bin/env node
import { Command } from 'commander'
import chalk from 'chalk'
import Table from 'cli-table3'
import { Liteflow } from './index'
import { GetWorkflowsOptions } from './types'
import * as path from 'path'

const program = new Command()

program
  .name('liteflow')
  .description('CLI tool for tracking workflow statistics')
  .version('1.0.13')

/**
 * Build filter options from CLI options
 */
function buildFilterOptions(options: any): GetWorkflowsOptions {
  const filterOptions: GetWorkflowsOptions = {
    pageSize: options.verbose ? 100 : 10,
    page: 1
  }

  if (options.status) {
    filterOptions.status = options.status
  }

  if (options.key && options.value) {
    filterOptions.identifier = {
      key: options.key,
      value: options.value
    }
  }

  if (options.name) {
    filterOptions.name = options.name
  }

  if (options.startDate) {
    filterOptions.startDate = new Date(options.startDate).toISOString()
  }

  if (options.endDate) {
    filterOptions.endDate = new Date(options.endDate).toISOString()
  }

  if (options.step) {
    filterOptions.step = options.step
  }

  return filterOptions
}

/**
 * Display active filters
 */
function displayActiveFilters(options: any) {
  const filters: string[] = []

  if (options.status) filters.push(`status=${options.status}`)
  if (options.key && options.value) filters.push(`identifier=${options.key}:${options.value}`)
  if (options.name) filters.push(`name~${options.name}`)
  if (options.startDate) filters.push(`from=${options.startDate}`)
  if (options.endDate) filters.push(`to=${options.endDate}`)
  if (options.step) filters.push(`step=${options.step}`)

  if (filters.length > 0) {
    console.log(chalk.magenta(`Filters: ${filters.join(' | ')}\n`))
  }
}

/**
 * Format duration from milliseconds
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${Math.round(ms / 1000)}s`
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`
  return `${Math.round(ms / 3600000)}h`
}

/**
 * Check if any filter is applied
 */
function hasFilters(options: any): boolean {
  return !!(options.status || (options.key && options.value) || options.name || options.startDate || options.endDate || options.step)
}

// Common filter options shared between commands
function addFilterOptions(cmd: Command): Command {
  return cmd
    .option('-d, --db <path>', 'Path to database file', './liteflow.db')
    .option('-s, --status <status>', 'Filter by status (pending, completed, failed)')
    .option('-k, --key <key>', 'Filter by identifier key')
    .option('-v, --value <value>', 'Filter by identifier value')
    .option('-n, --name <pattern>', 'Filter by workflow name (partial match)')
    .option('--start-date <date>', 'Filter workflows started after this date (ISO 8601)')
    .option('--end-date <date>', 'Filter workflows started before this date (ISO 8601)')
    .option('--step <step-name>', 'Filter workflows containing this step')
    .option('--verbose', 'Show detailed information including workflows and steps')
}

/**
 * Display general stats table
 */
async function displayGeneralStats(liteflow: Liteflow) {
  const stats = await liteflow.getWorkflowStats()

  const generalTable = new Table({
    head: [chalk.bold('Metric'), chalk.bold('Value')],
    colWidths: [30, 20]
  })

  generalTable.push(
    ['Total Workflows', chalk.cyan(stats.total.toString())],
    ['Completed', chalk.green(stats.completed.toString())],
    ['Pending', chalk.yellow(stats.pending.toString())],
    ['Failed', chalk.red((stats.total - stats.completed - stats.pending).toString())],
    ['Avg Steps per Workflow', chalk.blue(stats.avgSteps.toString())]
  )

  console.log(generalTable.toString())
  console.log()

  return stats
}

/**
 * Display workflow list
 */
async function displayWorkflows(liteflow: Liteflow, options: any, filterOptions: GetWorkflowsOptions) {
  const { workflows, total } = await liteflow.getWorkflows(filterOptions)

  if (options.verbose || hasFilters(options)) {
    console.log(chalk.bold.cyan(`Workflows ${options.status ? `(${options.status})` : ''}`))
    console.log(chalk.gray(`Showing ${workflows.length} of ${total} workflows\n`))

    if (workflows.length > 0) {
      const workflowTable = new Table({
        head: [
          chalk.bold('Name'),
          chalk.bold('Status'),
          chalk.bold('Started'),
          chalk.bold('Duration')
        ],
        colWidths: [25, 14, 22, 15]
      })

      workflows.forEach(workflow => {
        const status = workflow.status === 'completed'
          ? chalk.green('completed')
          : workflow.status === 'pending'
          ? chalk.yellow('pending')
          : chalk.red('failed')

        const started = new Date(workflow.started_at).toLocaleString()
        const duration = workflow.ended_at
          ? formatDuration(new Date(workflow.ended_at).getTime() - new Date(workflow.started_at).getTime())
          : chalk.gray('-')

        workflowTable.push([
          workflow.name.substring(0, 23),
          status,
          started.substring(0, 20),
          duration
        ])
      })

      console.log(workflowTable.toString())
      console.log()
    }
  }

  return { workflows, total }
}

/**
 * Display most frequent steps
 */
async function displayFrequentSteps(liteflow: Liteflow) {
  const frequentSteps = await liteflow.getMostFrequentSteps(5)
  if (frequentSteps.length > 0) {
    console.log(chalk.bold.cyan('Most Frequent Steps\n'))
    const stepsTable = new Table({
      head: [chalk.bold('Step'), chalk.bold('Count')],
      colWidths: [40, 15]
    })

    frequentSteps.forEach(step => {
      stepsTable.push([step.step, chalk.cyan(step.count.toString())])
    })

    console.log(stepsTable.toString())
    console.log()
  }
}

// ==================== STATS COMMAND ====================
const statsCmd = program
  .command('stats')
  .description('Display general workflow statistics')

addFilterOptions(statsCmd)
  .option('-w, --watch', 'Enable real-time monitoring (refresh every 2 seconds)')
  .option('-i, --interval <seconds>', 'Refresh interval for watch mode (in seconds)', '2')
  .action(async (options) => {
    const dbPath = path.resolve(options.db)

    let previousStats: any = null

    const displayStats = async () => {
      try {
        const liteflow = new Liteflow(dbPath)
        await liteflow.init()

        // Clear console in watch mode
        if (options.watch) {
          console.clear()
        }

        console.log(chalk.bold.cyan('\nLiteflow Statistics Dashboard\n'))
        console.log(chalk.gray(`Database: ${dbPath}`))
        console.log(chalk.gray(`Time: ${new Date().toLocaleString()}\n`))

        // Display active filters
        displayActiveFilters(options)

        // Get and display general statistics
        const stats = await liteflow.getWorkflowStats()

        const generalTable = new Table({
          head: [chalk.bold('Metric'), chalk.bold('Value'), chalk.bold('Change')],
          colWidths: [30, 20, 15]
        })

        const diffStr = (current: number, previous: number | undefined) => {
          if (previous === undefined || previous === null) return chalk.gray('-')
          const diff = current - previous
          if (diff === 0) return chalk.gray('=')
          if (diff > 0) return chalk.green(`+${diff}`)
          return chalk.red(`${diff}`)
        }

        const failed = stats.total - stats.completed - stats.pending
        const prevFailed = previousStats ? previousStats.total - previousStats.completed - previousStats.pending : undefined

        generalTable.push(
          ['Total Workflows', chalk.cyan(stats.total.toString()), diffStr(stats.total, previousStats?.total)],
          ['Completed', chalk.green(stats.completed.toString()), diffStr(stats.completed, previousStats?.completed)],
          ['Pending', chalk.yellow(stats.pending.toString()), diffStr(stats.pending, previousStats?.pending)],
          ['Failed', chalk.red(failed.toString()), diffStr(failed, prevFailed)],
          ['Avg Steps per Workflow', chalk.blue(stats.avgSteps.toString()), previousStats ? diffStr(stats.avgSteps, previousStats.avgSteps) : chalk.gray('-')]
        )

        console.log(generalTable.toString())
        console.log()

        previousStats = { ...stats }

        // Display workflows with filters
        const filterOptions = buildFilterOptions(options)
        await displayWorkflows(liteflow, options, filterOptions)

        // Show most frequent steps
        await displayFrequentSteps(liteflow)

        if (options.watch) {
          console.log(chalk.gray(`Refreshing in ${options.interval} seconds... (Press Ctrl+C to stop)`))
        }

        await liteflow.destroy()

      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error)
        if (!options.watch) {
          process.exit(1)
        }
      }
    }

    // Initial display
    await displayStats()

    // Watch mode
    if (options.watch) {
      const interval = parseInt(options.interval) * 1000
      setInterval(async () => await displayStats(), interval)
    }
  })

// ==================== LIST COMMAND ====================
const listCmd = program
  .command('list')
  .description('List workflows with filtering and pagination')

addFilterOptions(listCmd)
  .option('-p, --page <number>', 'Page number', '1')
  .option('--page-size <number>', 'Number of items per page', '20')
  .option('--order-by <field>', 'Order by field (started_at, ended_at)', 'started_at')
  .option('--order <direction>', 'Sort direction (asc, desc)', 'desc')
  .action(async (options) => {
    const dbPath = path.resolve(options.db)

    try {
      const liteflow = new Liteflow(dbPath)
      await liteflow.init()

      console.log(chalk.bold.cyan('\nLiteflow Workflow List\n'))
      console.log(chalk.gray(`Database: ${dbPath}\n`))

      // Display active filters
      displayActiveFilters(options)

      const filterOptions: GetWorkflowsOptions = {
        ...buildFilterOptions(options),
        page: parseInt(options.page),
        pageSize: parseInt(options.pageSize),
        orderBy: options.orderBy,
        order: options.order
      }

      // Force verbose to show list
      options.verbose = true
      const { workflows, total } = await displayWorkflows(liteflow, options, filterOptions)

      // Pagination info
      const totalPages = Math.ceil(total / parseInt(options.pageSize))
      console.log(chalk.gray(`Page ${options.page} of ${totalPages} (${total} total workflows)`))

      await liteflow.destroy()

    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

// ==================== WATCH COMMAND ====================
const watchCmd = program
  .command('watch')
  .description('Real-time monitoring of workflow changes')

addFilterOptions(watchCmd)
  .option('-i, --interval <seconds>', 'Refresh interval in seconds', '2')
  .action(async (options) => {
    const dbPath = path.resolve(options.db)

    let previousStats: any = null
    let previousWorkflowCount = 0
    let cycleCount = 0

    const displayWatch = async () => {
      try {
        const liteflow = new Liteflow(dbPath)
        await liteflow.init()

        console.clear()
        cycleCount++

        console.log(chalk.bold.cyan('\nLiteflow Real-Time Monitor\n'))
        console.log(chalk.gray(`Database: ${dbPath}`))
        console.log(chalk.gray(`Time: ${new Date().toLocaleString()}`))
        console.log(chalk.gray(`Refresh: every ${options.interval}s | Cycle: #${cycleCount}\n`))

        // Display active filters
        displayActiveFilters(options)

        // Get stats
        const stats = await liteflow.getWorkflowStats()

        const generalTable = new Table({
          head: [chalk.bold('Metric'), chalk.bold('Value'), chalk.bold('Change')],
          colWidths: [30, 20, 15]
        })

        const diffStr = (current: number, previous: number | undefined) => {
          if (previous === undefined || previous === null) return chalk.gray('-')
          const diff = current - previous
          if (diff === 0) return chalk.gray('=')
          if (diff > 0) return chalk.green(`+${diff}`)
          return chalk.red(`${diff}`)
        }

        const failed = stats.total - stats.completed - stats.pending
        const prevFailed = previousStats ? previousStats.total - previousStats.completed - previousStats.pending : undefined

        generalTable.push(
          ['Total Workflows', chalk.cyan(stats.total.toString()), diffStr(stats.total, previousStats?.total)],
          ['Completed', chalk.green(stats.completed.toString()), diffStr(stats.completed, previousStats?.completed)],
          ['Pending', chalk.yellow(stats.pending.toString()), diffStr(stats.pending, previousStats?.pending)],
          ['Failed', chalk.red(failed.toString()), diffStr(failed, prevFailed)],
          ['Avg Steps', chalk.blue(stats.avgSteps.toString()), previousStats ? diffStr(stats.avgSteps, previousStats.avgSteps) : chalk.gray('-')]
        )

        console.log(generalTable.toString())
        console.log()

        // Show recent workflows
        const filterOptions: GetWorkflowsOptions = {
          ...buildFilterOptions(options),
          pageSize: 10,
          page: 1
        }

        const { workflows, total } = await liteflow.getWorkflows(filterOptions)

        // Detect new workflows
        if (previousWorkflowCount > 0 && total > previousWorkflowCount) {
          const newCount = total - previousWorkflowCount
          console.log(chalk.green.bold(`  +${newCount} new workflow(s) detected!\n`))
        }
        previousWorkflowCount = total

        console.log(chalk.bold.cyan(`Recent Workflows (${total} total)\n`))

        if (workflows.length > 0) {
          const workflowTable = new Table({
            head: [
              chalk.bold('Name'),
              chalk.bold('Status'),
              chalk.bold('Started'),
              chalk.bold('Duration')
            ],
            colWidths: [25, 14, 22, 15]
          })

          workflows.forEach(workflow => {
            const status = workflow.status === 'completed'
              ? chalk.green('completed')
              : workflow.status === 'pending'
              ? chalk.yellow('pending')
              : chalk.red('failed')

            const started = new Date(workflow.started_at).toLocaleString()
            const duration = workflow.ended_at
              ? formatDuration(new Date(workflow.ended_at).getTime() - new Date(workflow.started_at).getTime())
              : chalk.gray('-')

            workflowTable.push([
              workflow.name.substring(0, 23),
              status,
              started.substring(0, 20),
              duration
            ])
          })

          console.log(workflowTable.toString())
          console.log()
        }

        // Show most frequent steps
        await displayFrequentSteps(liteflow)

        previousStats = { ...stats }

        console.log(chalk.gray(`Press Ctrl+C to stop monitoring`))

        await liteflow.destroy()

      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error)
      }
    }

    // Initial display
    await displayWatch()

    // Continuous monitoring
    const interval = parseInt(options.interval) * 1000
    setInterval(async () => await displayWatch(), interval)
  })

program.parse(process.argv)
