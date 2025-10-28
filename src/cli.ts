#!/usr/bin/env node
import { Command } from 'commander'
import chalk from 'chalk'
import Table from 'cli-table3'
import { Liteflow } from './index'
import * as path from 'path'

const program = new Command()

program
  .name('liteflow')
  .description('CLI tool for tracking workflow statistics')
  .version('1.0.13')

program
  .command('stats')
  .description('Display general workflow statistics')
  .option('-d, --db <path>', 'Path to database file', './liteflow.db')
  .option('-w, --watch', 'Enable real-time monitoring (refresh every 2 seconds)')
  .option('-i, --interval <seconds>', 'Refresh interval for watch mode (in seconds)', '2')
  .option('-s, --status <status>', 'Filter by status (pending, completed, failed)')
  .option('-k, --key <key>', 'Filter by identifier key')
  .option('-v, --value <value>', 'Filter by identifier value')
  .option('--verbose', 'Show detailed information including workflows and steps')
  .action(async (options) => {
    const dbPath = path.resolve(options.db)
    
    const displayStats = async () => {
      try {
        const liteflow = new Liteflow(dbPath)
        await liteflow.init()

        // Clear console in watch mode
        if (options.watch) {
          console.clear()
        }

        console.log(chalk.bold.cyan('\n📊 Liteflow Statistics Dashboard\n'))
        console.log(chalk.gray(`Database: ${dbPath}`))
        console.log(chalk.gray(`Time: ${new Date().toLocaleString()}\n`))

        // Get general statistics
        const stats = await liteflow.getWorkflowStats()
        
        // Create general stats table
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

        // Get workflows with filters
        const workflowOptions: any = {
          pageSize: options.verbose ? 100 : 10,
          page: 1
        }

        if (options.status) {
          workflowOptions.status = options.status
        }

        if (options.key && options.value) {
          workflowOptions.identifier = {
            key: options.key,
            value: options.value
          }
        }

        const { workflows, total } = await liteflow.getWorkflows(workflowOptions)

        // Display filtered workflows if verbose or filters are applied
        if (options.verbose || options.status || (options.key && options.value)) {
          console.log(chalk.bold.cyan(`📋 Workflows ${options.status ? `(${options.status})` : ''}`))
          console.log(chalk.gray(`Showing ${workflows.length} of ${total} workflows\n`))

          if (workflows.length > 0) {
            const workflowTable = new Table({
              head: [
                chalk.bold('Name'),
                chalk.bold('Status'),
                chalk.bold('Started'),
                chalk.bold('Duration')
              ],
              colWidths: [20, 12, 20, 15]
            })

            workflows.forEach(workflow => {
              const status = workflow.status === 'completed' 
                ? chalk.green('✓ completed')
                : workflow.status === 'pending'
                ? chalk.yellow('⧗ pending')
                : chalk.red('✗ failed')

              const started = new Date(workflow.started_at).toLocaleString()
              const duration = workflow.ended_at
                ? `${Math.round((new Date(workflow.ended_at).getTime() - new Date(workflow.started_at).getTime()) / 1000)}s`
                : '-'

              workflowTable.push([
                workflow.name.substring(0, 18),
                status,
                started.substring(0, 18),
                duration
              ])
            })

            console.log(workflowTable.toString())
            console.log()
          }
        }

        // Show most frequent steps
        const frequentSteps = await liteflow.getMostFrequentSteps(5)
        if (frequentSteps.length > 0) {
          console.log(chalk.bold.cyan('🔥 Most Frequent Steps\n'))
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

        if (options.watch) {
          console.log(chalk.gray(`\nRefreshing in ${options.interval} seconds... (Press Ctrl+C to stop)`))
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

program.parse(process.argv)
