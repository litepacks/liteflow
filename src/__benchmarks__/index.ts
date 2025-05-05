import { Suite } from 'benchmark';
import { Liteflow } from '../index';
import { join } from 'path';
import { unlinkSync } from 'fs';

const suite = new Suite();
const dbPath = join(__dirname, 'benchmark.db');
let liteflow: Liteflow;

// Büyük JSON verisi oluştur
const generateLargeJson = (size: number) => {
  const data: any = {
    metadata: {
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    },
    items: []
  };

  for (let i = 0; i < size; i++) {
    data.items.push({
      id: i,
      name: `Item ${i}`,
      description: `This is a detailed description for item ${i}`,
      attributes: {
        color: ['red', 'blue', 'green'][i % 3],
        size: ['small', 'medium', 'large'][i % 3],
        weight: Math.random() * 100,
        tags: Array(5).fill(0).map((_, j) => `tag${j}`),
        properties: {
          isActive: i % 2 === 0,
          priority: i % 5,
          coordinates: {
            x: Math.random() * 1000,
            y: Math.random() * 1000,
            z: Math.random() * 1000
          }
        }
      },
      history: Array(10).fill(0).map((_, j) => ({
        timestamp: new Date(Date.now() - j * 1000).toISOString(),
        action: ['created', 'updated', 'deleted'][j % 3],
        user: `user${j}`
      }))
    });
  }

  return data;
};

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
  // Yüksek boyutlu JSON testleri
  .add('addStep with 1KB JSON', () => {
    const workflowId = liteflow.startWorkflow('benchmark-workflow', [
      { key: 'test', value: '123' }
    ]);
    const largeData = generateLargeJson(10); // ~1KB
    liteflow.addStep(workflowId, 'large-data-step', largeData);
  })
  .add('addStep with 10KB JSON', () => {
    const workflowId = liteflow.startWorkflow('benchmark-workflow', [
      { key: 'test', value: '123' }
    ]);
    const largeData = generateLargeJson(100); // ~10KB
    liteflow.addStep(workflowId, 'large-data-step', largeData);
  })
  .add('addStep with 100KB JSON', () => {
    const workflowId = liteflow.startWorkflow('benchmark-workflow', [
      { key: 'test', value: '123' }
    ]);
    const largeData = generateLargeJson(1000); // ~100KB
    liteflow.addStep(workflowId, 'large-data-step', largeData);
  })
  .add('addStep with 1MB JSON', () => {
    const workflowId = liteflow.startWorkflow('benchmark-workflow', [
      { key: 'test', value: '123' }
    ]);
    const largeData = generateLargeJson(10000); // ~1MB
    liteflow.addStep(workflowId, 'large-data-step', largeData);
  })
  .add('getSteps with large JSON', () => {
    const workflowId = liteflow.startWorkflow('benchmark-workflow', [
      { key: 'test', value: '123' }
    ]);
    const largeData = generateLargeJson(1000); // ~100KB
    liteflow.addStep(workflowId, 'large-data-step', largeData);
    liteflow.getSteps(workflowId);
  })
  .on('cycle', (event: any) => {
    console.log(String(event.target));
  })
  .on('complete', function(this: any) {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  })
  .run({ async: true }); 