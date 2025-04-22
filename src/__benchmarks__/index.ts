import { Suite } from 'benchmark';
import { Liteflow } from '../index';
import { join } from 'path';
import { unlinkSync } from 'fs';

const suite = new Suite();
const dbPath = join(__dirname, 'benchmark.db');
let liteflow: Liteflow;

// Setup
suite.on('start', () => {
  liteflow = new Liteflow(dbPath);
  liteflow.init();
});

// Cleanup
suite.on('complete', () => {
  try {
    unlinkSync(dbPath);
  } catch (error) {
    // Benchmark database might already be deleted
  }
});

// Add tests
suite
  .add('startWorkflow', () => {
    liteflow.startWorkflow('benchmark-workflow', [
      { key: 'test', value: '123' }
    ]);
  })
  .add('addStep', () => {
    const workflowId = liteflow.startWorkflow('benchmark-workflow', [
      { key: 'test', value: '123' }
    ]);
    liteflow.addStep(workflowId, 'test-step', { data: 'test' });
  })
  .add('getWorkflowByIdentifier', () => {
    const workflowId = liteflow.startWorkflow('benchmark-workflow', [
      { key: 'test', value: '123' }
    ]);
    liteflow.getWorkflowByIdentifier('test', '123');
  })
  .add('getSteps', () => {
    const workflowId = liteflow.startWorkflow('benchmark-workflow', [
      { key: 'test', value: '123' }
    ]);
    liteflow.addStep(workflowId, 'test-step', { data: 'test' });
    liteflow.getSteps(workflowId);
  })
  .add('completeWorkflow', () => {
    const workflowId = liteflow.startWorkflow('benchmark-workflow', [
      { key: 'test', value: '123' }
    ]);
    liteflow.completeWorkflow(workflowId);
  })
  .add('getWorkflowStats', () => {
    const workflowId = liteflow.startWorkflow('benchmark-workflow', [
      { key: 'test', value: '123' }
    ]);
    liteflow.addStep(workflowId, 'test-step', { data: 'test' });
    liteflow.completeWorkflow(workflowId);
    liteflow.getWorkflowStats();
  })
  .on('cycle', (event: any) => {
    console.log(String(event.target));
  })
  .on('complete', function(this: any) {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  })
  .run({ async: true }); 