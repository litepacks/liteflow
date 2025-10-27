import { Liteflow } from '../index'
import * as path from 'path'
import * as fs from 'fs'

// Create a test database with sample data
const dbPath = path.join(__dirname, '../../test-cli.db')

// Remove existing database if it exists
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath)
}

const liteflow = new Liteflow(dbPath)
liteflow.init()

console.log('Creating sample data...')

// Create some workflows with different statuses
const workflow1 = liteflow.startWorkflow('user-registration', [
  { key: 'userId', value: '1001' }
])
workflow1.addStep('validate-email', { email: 'user1@example.com' })
workflow1.addStep('create-account', { accountId: 'acc-1001' })
workflow1.addStep('send-welcome-email', { sent: true })
workflow1.complete()

const workflow2 = liteflow.startWorkflow('order-processing', [
  { key: 'orderId', value: '2001' }
])
workflow2.addStep('validate-order', { orderId: '2001' })
workflow2.addStep('check-inventory', { available: true })
workflow2.addStep('process-payment', { amount: 99.99 })
workflow2.addStep('ship-order', { trackingNumber: 'TRK-2001' })
workflow2.complete()

const workflow3 = liteflow.startWorkflow('user-registration', [
  { key: 'userId', value: '1002' }
])
workflow3.addStep('validate-email', { email: 'user2@example.com' })
workflow3.addStep('create-account', { accountId: 'acc-1002' })
// This workflow is still pending

const workflow4 = liteflow.startWorkflow('order-processing', [
  { key: 'orderId', value: '2002' }
])
workflow4.addStep('validate-order', { orderId: '2002' })
workflow4.addStep('check-inventory', { available: false })
workflow4.fail('Insufficient inventory')

const workflow5 = liteflow.startWorkflow('data-export', [
  { key: 'exportId', value: '3001' }
])
workflow5.addStep('fetch-data', { rowCount: 1000 })
workflow5.addStep('transform-data', { format: 'csv' })
workflow5.addStep('upload-to-s3', { bucket: 'exports' })
workflow5.complete()

const workflow6 = liteflow.startWorkflow('user-registration', [
  { key: 'userId', value: '1003' }
])
workflow6.addStep('validate-email', { email: 'user3@example.com' })
// Another pending workflow

console.log('Sample data created successfully!')
console.log(`Database location: ${dbPath}`)
console.log('\nYou can now test the CLI with:')
console.log(`  node dist/cli.js stats --db ${dbPath}`)
console.log(`  node dist/cli.js stats --db ${dbPath} --verbose`)
console.log(`  node dist/cli.js stats --db ${dbPath} --status pending`)
console.log(`  node dist/cli.js stats --db ${dbPath} --watch`)
