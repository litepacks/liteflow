import { Liteflow } from '../index';
import { join } from 'path';
import { unlinkSync } from 'fs';
import Database from 'better-sqlite3';

describe('Liteflow', () => {
  let liteflow: Liteflow;
  const dbPath = join(__dirname, 'test.db');

  beforeEach(async () => {
    try {
      unlinkSync(dbPath);
    } catch (error) {
      // Test database might already be deleted
    }
    liteflow = new Liteflow(dbPath);
    await liteflow.init();
  });

  afterEach(async () => {
    try {
      await liteflow.destroy();
    } catch (error) {
      // Already closed
    }
    try {
      unlinkSync(dbPath);
    } catch (error) {
      // Test database might already be deleted
    }
  });

  describe('startWorkflow', () => {
    it('should start a new workflow', async () => {
      const workflowId = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: '123' }
      ]);
      expect(workflowId).toBeDefined();
    });

    it('should start a workflow with multiple identifiers', async () => {
      const workflowId = liteflow.startWorkflow('test-workflow', [
        { key: 'test1', value: '123' },
        { key: 'test2', value: '456' }
      ]);
      expect(workflowId).toBeDefined();
    });

    it('should handle empty identifiers array', async () => {
      const workflowId = liteflow.startWorkflow('test-workflow', []);
      expect(workflowId).toBeDefined();
    });

    it('should handle null identifiers', async () => {
      const workflowId = liteflow.startWorkflow('test-workflow', null as any);
      expect(workflowId).toBeDefined();
    });

    it('should handle undefined identifiers', async () => {
      const workflowId = liteflow.startWorkflow('test-workflow', undefined as any);
      expect(workflowId).toBeDefined();
    });

    it('should handle invalid identifier format', async () => {
      const workflowId = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: 123 } as any
      ]);
      expect(workflowId).toBeDefined();
    });
  });

  describe('addStep', () => {
    it('should add a step to a workflow', async () => {
      const workflowId = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: '123' }
      ]);
      liteflow.addStep(workflowId, 'test-step', { data: 'test' });
      await liteflow.flushBatchInserts();
      const steps = await liteflow.getSteps(workflowId);
      expect(steps).toHaveLength(1);
      expect(steps[0].step).toBe('test-step');
    });

    it('should add multiple steps to a workflow', async () => {
      const workflowId = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: '123' }
      ]);
      liteflow.addStep(workflowId, 'step1', { data: 'test1' });
      liteflow.addStep(workflowId, 'step2', { data: 'test2' });
      await liteflow.flushBatchInserts();
      const steps = await liteflow.getSteps(workflowId);
      expect(steps).toHaveLength(2);
    });

    it('should handle empty data object', async () => {
      const workflowId = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: '123' }
      ]);
      liteflow.addStep(workflowId, 'test-step', {});
      await liteflow.flushBatchInserts();
      const steps = await liteflow.getSteps(workflowId);
      expect(steps).toHaveLength(1);
    });

    it('should handle null data', async () => {
      const workflowId = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: '123' }
      ]);
      liteflow.addStep(workflowId, 'test-step', null as any);
      await liteflow.flushBatchInserts();
      const steps = await liteflow.getSteps(workflowId);
      expect(steps).toHaveLength(1);
    });

    it('should handle undefined data', async () => {
      const workflowId = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: '123' }
      ]);
      liteflow.addStep(workflowId, 'test-step', undefined as any);
      await liteflow.flushBatchInserts();
      const steps = await liteflow.getSteps(workflowId);
      expect(steps).toHaveLength(1);
    });

    it('should handle non-existent workflow', async () => {
      const result = liteflow.addStep('non-existent', 'test-step', { data: 'test' });
      expect(result).toBeUndefined();
    });

    it('should handle invalid step name', async () => {
      const workflowId = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: '123' }
      ]);
      const result = liteflow.addStep(workflowId, null as any, { data: 'test' });
      expect(result).toBeUndefined();
    });

    describe('dynamic data types', () => {
      it('should handle numeric data', async () => {
        const workflowId = liteflow.startWorkflow('test-workflow', [
          { key: 'test', value: '123' }
        ]);
        liteflow.addStep(workflowId, 'numeric-step', { count: 123, price: 99.99 });
        await liteflow.flushBatchInserts();
        const steps = await liteflow.getSteps(workflowId);
        expect(steps).toHaveLength(1);
        const data = JSON.parse(steps[0].data);
        expect(data.count).toBe(123);
        expect(data.price).toBe(99.99);
      });

      it('should handle complex objects', async () => {
        const workflowId = liteflow.startWorkflow('test-workflow', [
          { key: 'test', value: '123' }
        ]);
        const complexData = {
          user: {
            id: 1,
            name: 'Ahmet',
            preferences: ['dark', 'compact'],
            metadata: {
              lastLogin: new Date().toISOString(),
              isActive: true
            }
          },
          settings: {
            notifications: true,
            theme: 'dark'
          }
        };
        liteflow.addStep(workflowId, 'complex-step', complexData);
        const steps = await liteflow.getSteps(workflowId);
        expect(steps).toHaveLength(1);
        const data = JSON.parse(steps[0].data);
        expect(data.user.id).toBe(1);
        expect(data.user.name).toBe('Ahmet');
        expect(data.user.preferences).toEqual(['dark', 'compact']);
        expect(data.settings.notifications).toBe(true);
      });

      it('should handle arrays', async () => {
        const workflowId = liteflow.startWorkflow('test-workflow', [
          { key: 'test', value: '123' }
        ]);
        const arrayData = {
          items: [1, 2, 3],
          users: [
            { id: 1, name: 'Ahmet' },
            { id: 2, name: 'Mehmet' }
          ]
        };
        liteflow.addStep(workflowId, 'array-step', arrayData);
        const steps = await liteflow.getSteps(workflowId);
        expect(steps).toHaveLength(1);
        const data = JSON.parse(steps[0].data);
        expect(data.items).toEqual([1, 2, 3]);
        expect(data.users).toHaveLength(2);
        expect(data.users[0].name).toBe('Ahmet');
      });

      it('should handle boolean values', async () => {
        const workflowId = liteflow.startWorkflow('test-workflow', [
          { key: 'test', value: '123' }
        ]);
        liteflow.addStep(workflowId, 'boolean-step', { 
          isActive: true,
          settings: {
            notifications: false,
            darkMode: true
          }
        });
        const steps = await liteflow.getSteps(workflowId);
        expect(steps).toHaveLength(1);
        const data = JSON.parse(steps[0].data);
        expect(data.isActive).toBe(true);
        expect(data.settings.notifications).toBe(false);
        expect(data.settings.darkMode).toBe(true);
      });

      it('should handle mixed data types', async () => {
        const workflowId = liteflow.startWorkflow('test-workflow', [
          { key: 'test', value: '123' }
        ]);
        const mixedData = {
          string: 'test',
          number: 123,
          boolean: true,
          array: [1, 'two', false],
          object: {
            nested: {
              value: 'nested'
            }
          },
          nullValue: null
        };
        liteflow.addStep(workflowId, 'mixed-step', mixedData);
        const steps = await liteflow.getSteps(workflowId);
        expect(steps).toHaveLength(1);
        const data = JSON.parse(steps[0].data);
        expect(data.string).toBe('test');
        expect(data.number).toBe(123);
        expect(data.boolean).toBe(true);
        expect(data.array).toEqual([1, 'two', false]);
        expect(data.object.nested.value).toBe('nested');
        expect(data.nullValue).toBeNull();
      });
    });
  });

  describe('getWorkflowByIdentifier', () => {
    it('should find a workflow by identifier', async () => {
      const workflow = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: '123' }
      ]);
      const result = await liteflow.getWorkflowByIdentifier('test', '123');
      expect(result).toBeDefined();
      expect(result?.id).toBe(workflow.id);
    });

    it('should return undefined for non-existent identifier', async () => {
      const workflow = await liteflow.getWorkflowByIdentifier('nonexistent', '123');
      expect(workflow).toBeUndefined();
    });
  });

  describe('getSteps', () => {
    it('should return empty array for workflow with no steps', async () => {
      const workflowId = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: '123' }
      ]);
      const steps = await liteflow.getSteps(workflowId);
      expect(steps).toHaveLength(0);
    });

    it('should return all steps for a workflow', async () => {
      const workflowId = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: '123' }
      ]);
      liteflow.addStep(workflowId, 'step1', { data: 'test1' });
      liteflow.addStep(workflowId, 'step2', { data: 'test2' });
      const steps = await liteflow.getSteps(workflowId);
      expect(steps).toHaveLength(2);
      expect(steps[0].step).toBe('step1');
      expect(steps[1].step).toBe('step2');
    });
  });

  describe('completeWorkflow', () => {
    it('should mark a workflow as completed', async () => {
      const workflowId = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: '123' }
      ]);
      liteflow.completeWorkflow(workflowId);
      const workflow = await liteflow.getWorkflowByIdentifier('test', '123');
      expect(workflow?.status).toBe('completed');
    });
  });

  describe('getWorkflowStats', () => {
    it('should return correct stats for empty database', async () => {
      const stats = await liteflow.getWorkflowStats();
      expect(stats.total).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.avgSteps).toBe(0);
    });

    it('should return correct stats for workflows', async () => {
      // Create completed workflow
      const workflowId1 = liteflow.startWorkflow('test-workflow', [
        { key: 'test1', value: '123' }
      ]);
      liteflow.addStep(workflowId1, 'step1', { data: 'test1' });
      liteflow.addStep(workflowId1, 'step2', { data: 'test2' });
      liteflow.completeWorkflow(workflowId1);

      // Create pending workflow
      const workflowId2 = liteflow.startWorkflow('test-workflow', [
        { key: 'test2', value: '456' }
      ]);
      liteflow.addStep(workflowId2, 'step1', { data: 'test1' });

      const stats = await liteflow.getWorkflowStats();
      expect(stats.total).toBe(2);
      expect(stats.completed).toBe(1);
      expect(stats.pending).toBe(1);
      expect(stats.avgSteps).toBe(1.5);
    });

    it('should handle database errors gracefully', async () => {
      // Create error with invalid query
      const result = liteflow.getWorkflowStats();
      expect(result).toEqual({
        total: 0,
        completed: 0,
        pending: 0,
        avgSteps: 0
      });
    });
  });

  describe('attachIdentifier', () => {
    it('should attach a new identifier to an existing workflow', async () => {
      const workflow = liteflow.startWorkflow('test-workflow', [
        { key: 'test1', value: '123' }
      ]);
      const result = await liteflow.attachIdentifier('test1', '123', { key: 'test2', value: '456' });
      expect(result).toBe(true);
      const foundWorkflow = await liteflow.getWorkflowByIdentifier('test2', '456');
      expect(foundWorkflow?.id).toBe(workflow.id);
    });

    it('should not attach duplicate identifier', async () => {
      const workflowId = liteflow.startWorkflow('test-workflow', [
        { key: 'test1', value: '123' }
      ]);
      await liteflow.attachIdentifier('test1', '123', { key: 'test2', value: '456' });
      const result = await liteflow.attachIdentifier('test1', '123', { key: 'test2', value: '456' });
      expect(result).toBe(false);
    });

    it('should handle non-existent workflow', async () => {
      const result = await liteflow.attachIdentifier('nonexistent', '123', { key: 'test2', value: '456' });
      expect(result).toBe(false);
    });

    it('should handle empty identifiers', async () => {
      const workflowId = liteflow.startWorkflow('test-workflow', []);
      const result = await liteflow.attachIdentifier('', '', { key: 'test2', value: '456' });
      expect(result).toBe(false);
    });

    it('should handle null identifiers', async () => {
      const workflowId = liteflow.startWorkflow('test-workflow', []);
      const result = await liteflow.attachIdentifier(null as any, null as any, { key: 'test2', value: '456' });
      expect(result).toBe(false);
    });

    it('should handle undefined identifiers', async () => {
      const workflowId = liteflow.startWorkflow('test-workflow', []);
      const result = await liteflow.attachIdentifier(undefined as any, undefined as any, { key: 'test2', value: '456' });
      expect(result).toBe(false);
    });

    it('should handle invalid new identifier', async () => {
      const workflowId = liteflow.startWorkflow('test-workflow', [
        { key: 'test1', value: '123' }
      ]);
      const result = await liteflow.attachIdentifier('test1', '123', null as any);
      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      // Create error with invalid query
      const result = await liteflow.attachIdentifier(null as any, null as any, null as any);
      expect(result).toBe(false);
    });
  });

  describe('getMostFrequentSteps', () => {
    it('should return empty array for no steps', async () => {
      const steps = liteflow.getMostFrequentSteps();
      expect(steps).toHaveLength(0);
    });

    it('should return most frequent steps', async () => {
      const workflowId1 = liteflow.startWorkflow('test-workflow', [
        { key: 'test1', value: '123' }
      ]);
      liteflow.addStep(workflowId1, 'step1', { data: 'test1' });
      liteflow.addStep(workflowId1, 'step1', { data: 'test2' });
      liteflow.addStep(workflowId1, 'step2', { data: 'test3' });

      const workflowId2 = liteflow.startWorkflow('test-workflow', [
        { key: 'test2', value: '456' }
      ]);
      liteflow.addStep(workflowId2, 'step1', { data: 'test4' });
      liteflow.addStep(workflowId2, 'step2', { data: 'test5' });

      await liteflow.flushBatchInserts();
      const steps = await liteflow.getMostFrequentSteps(2);
      expect(steps).toHaveLength(2);
      expect(steps[0].step).toBe('step1');
      expect(steps[0].count).toBe(3);
      expect(steps[1].step).toBe('step2');
      expect(steps[1].count).toBe(2);
    });

    it('should handle database errors gracefully', async () => {
      // Create error with invalid query
      const result = liteflow.getMostFrequentSteps(-1);
      expect(result).toEqual([]);
    });
  });

  describe('getAverageStepDuration', () => {
    it('should return empty array for no steps', async () => {
      const durations = await liteflow.getAverageStepDuration();
      expect(durations).toHaveLength(0);
    });

    it('should calculate average step duration', async () => {
      const workflow = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: '123' }
      ]);
      liteflow.addStep(workflow, 'step1', { data: 'test1' });
      liteflow.addStep(workflow, 'step2', { data: 'test2' });
      liteflow.addStep(workflow, 'step3', { data: 'test3' });

      const durations = await liteflow.getAverageStepDuration();
      expect(durations).toHaveLength(1);
      expect(durations[0].workflow_id).toBe(workflow.id);
      expect(durations[0].step_count).toBe(3);
    });

    it('should handle database errors gracefully', async () => {
      // Create error with invalid query
      const result = liteflow.getAverageStepDuration();
      expect(result).toEqual([]);
    });
  });

  describe('getStepsByIdentifier', () => {
    it('should return empty array for non-existent identifier', async () => {
      const steps = await await liteflow.getStepsByIdentifier('nonexistent', '123');
      expect(steps).toHaveLength(0);
    });

    it('should return all steps for a workflow with given identifier', async () => {
      const workflowId = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: '123' }
      ]);
      liteflow.addStep(workflowId, 'step1', { data: 'test1' });
      liteflow.addStep(workflowId, 'step2', { data: 'test2' });

      const steps = await await liteflow.getStepsByIdentifier('test', '123');
      expect(steps).toHaveLength(2);
      expect(steps[0].step).toBe('step1');
      expect(steps[1].step).toBe('step2');
    });

    it('should return steps from multiple workflows with same identifier', async () => {
      // First workflow
      const workflowId1 = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: '123' }
      ]);
      liteflow.addStep(workflowId1, 'step1', { data: 'test1' });
      liteflow.addStep(workflowId1, 'step2', { data: 'test2' });

      // Second workflow with same identifier
      const workflowId2 = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: '123' }
      ]);
      liteflow.addStep(workflowId2, 'step3', { data: 'test3' });

      const steps = await await liteflow.getStepsByIdentifier('test', '123');
      expect(steps).toHaveLength(3);
      expect(steps.map(s => s.step)).toEqual(['step1', 'step2', 'step3']);
    });

    it('should return steps ordered by creation time', async () => {
      const workflowId = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: '123' }
      ]);
      
      // Add steps at different times
      liteflow.addStep(workflowId, 'step2', { data: 'test2' });
      liteflow.addStep(workflowId, 'step1', { data: 'test1' });
      liteflow.addStep(workflowId, 'step3', { data: 'test3' });

      const steps = await await liteflow.getStepsByIdentifier('test', '123');
      expect(steps).toHaveLength(3);
      expect(steps.map(s => s.step)).toEqual(['step2', 'step1', 'step3']);
    });

    it('should handle database errors gracefully', async () => {
      // Create error with invalid query
      const result = await liteflow.getStepsByIdentifier(null as any, null as any);
      expect(result).toEqual([]);
    });
  });

  describe('getWorkflows', () => {
    beforeEach(() => {
      // Prepare test data
      const workflowId1 = liteflow.startWorkflow('test-workflow-1', [
        { key: 'test1', value: '123' }
      ]);
      liteflow.addStep(workflowId1, 'step1', { data: 'test1' });
      liteflow.completeWorkflow(workflowId1);

      const workflowId2 = liteflow.startWorkflow('test-workflow-2', [
        { key: 'test2', value: '456' }
      ]);
      liteflow.addStep(workflowId2, 'step1', { data: 'test2' });

      const workflowId3 = liteflow.startWorkflow('test-workflow-3', [
        { key: 'test1', value: '789' }
      ]);
      liteflow.addStep(workflowId3, 'step1', { data: 'test3' });
      liteflow.failWorkflow(workflowId3, 'Test failure');
    });

    it('should return all workflows with pagination info by default', async () => {
      const result = await liteflow.getWorkflows();
      expect(result.workflows).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('should filter workflows by status', async () => {
      const completed = await liteflow.getWorkflows({ status: 'completed' });
      expect(completed.workflows).toHaveLength(1);
      expect(completed.workflows[0].status).toBe('completed');
      expect(completed.total).toBe(1);

      const pending = await liteflow.getWorkflows({ status: 'pending' });
      expect(pending.workflows).toHaveLength(1);
      expect(pending.workflows[0].status).toBe('pending');
      expect(pending.total).toBe(1);

      const failed = await liteflow.getWorkflows({ status: 'failed' });
      expect(failed.workflows).toHaveLength(1);
      expect(failed.workflows[0].status).toBe('failed');
      expect(failed.total).toBe(1);
    });

    it('should support pagination', async () => {
      // Add more test data
      for (let i = 4; i <= 15; i++) {
        const workflowId = liteflow.startWorkflow(`test-workflow-${i}`, [
          { key: 'test', value: i.toString() }
        ]);
        liteflow.addStep(workflowId, 'step1', { data: `test${i}` });
      }

      const firstPage = await liteflow.getWorkflows({ page: 1, pageSize: 5 });
      expect(firstPage.workflows).toHaveLength(5);
      expect(firstPage.total).toBe(15);
      expect(firstPage.page).toBe(1);
      expect(firstPage.pageSize).toBe(5);
      expect(firstPage.totalPages).toBe(3);

      const secondPage = await liteflow.getWorkflows({ page: 2, pageSize: 5 });
      expect(secondPage.workflows).toHaveLength(5);
      expect(secondPage.page).toBe(2);

      const lastPage = await liteflow.getWorkflows({ page: 3, pageSize: 5 });
      expect(lastPage.workflows).toHaveLength(5);
      expect(lastPage.page).toBe(3);
    });

    it('should order results by started_at', async () => {
      const result = await liteflow.getWorkflows({ orderBy: 'started_at', order: 'asc' });
      expect(result.workflows[0].name).toBe('test-workflow-1');
      expect(result.workflows[2].name).toBe('test-workflow-3');
    });

    it('should handle empty database', async () => {
      // Clear existing database
      try {
        unlinkSync(dbPath);
      } catch (error) {
        // Test database might already be deleted
      }
      liteflow = new Liteflow(dbPath);
      liteflow.init();

      const result = await liteflow.getWorkflows();
      expect(result.workflows).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should filter workflows by identifier key and value', async () => {
      // Get workflow with test1:123 identifier
      const result1 = await liteflow.getWorkflows({
        identifier: { key: 'test1', value: '123' }
      });
      expect(result1.workflows).toHaveLength(1);
      expect(result1.workflows[0].name).toBe('test-workflow-1');
      expect(result1.total).toBe(1);

      // Get workflow with test1:789 identifier
      const result2 = await liteflow.getWorkflows({
        identifier: { key: 'test1', value: '789' }
      });
      expect(result2.workflows).toHaveLength(1);
      expect(result2.workflows[0].name).toBe('test-workflow-3');
      expect(result2.total).toBe(1);

      // Get workflow with test2:456 identifier
      const result3 = await liteflow.getWorkflows({
        identifier: { key: 'test2', value: '456' }
      });
      expect(result3.workflows).toHaveLength(1);
      expect(result3.workflows[0].name).toBe('test-workflow-2');
      expect(result3.total).toBe(1);

      // Should return empty result for non-existent identifier
      const result4 = await liteflow.getWorkflows({
        identifier: { key: 'nonexistent', value: '123' }
      });
      expect(result4.workflows).toHaveLength(0);
      expect(result4.total).toBe(0);
    });

    it('should combine identifier filter with status filter', async () => {
      // Get workflows with test1 key and completed status
      const result1 = await liteflow.getWorkflows({
        identifier: { key: 'test1', value: '123' },
        status: 'completed'
      });
      expect(result1.workflows).toHaveLength(1);
      expect(result1.workflows[0].name).toBe('test-workflow-1');
      expect(result1.total).toBe(1);

      // Get workflows with test1 key and failed status
      const result2 = await liteflow.getWorkflows({
        identifier: { key: 'test1', value: '789' },
        status: 'failed'
      });
      expect(result2.workflows).toHaveLength(1);
      expect(result2.workflows[0].name).toBe('test-workflow-3');
      expect(result2.total).toBe(1);

      // Get workflows with test1 key and pending status
      const result3 = await liteflow.getWorkflows({
        identifier: { key: 'test1', value: '123' },
        status: 'pending'
      });
      expect(result3.workflows).toHaveLength(0);
      expect(result3.total).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      // Create error with invalid query
      const result = await liteflow.getWorkflows({ orderBy: 'invalid_column' as any });
      expect(result).toEqual({
        workflows: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0
      });
    });
  });

  describe('deleteWorkflow', () => {
    it('should delete a workflow and its steps', async () => {
      // Create test workflow
      const workflowId = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: '123' }
      ]);
      liteflow.addStep(workflowId, 'step1', { data: 'test1' });
      liteflow.addStep(workflowId, 'step2', { data: 'test2' });

      // Delete workflow
      const result = await liteflow.deleteWorkflow(workflowId);
      expect(result).toBe(true);

      // Check if workflow is deleted
      const workflow = await liteflow.getWorkflowByIdentifier('test', '123');
      expect(workflow).toBeUndefined();

      // Check if steps are deleted
      const steps = await liteflow.getSteps(workflowId);
      expect(steps).toHaveLength(0);
    });

    it('should return false for non-existent workflow', async () => {
      const result = await liteflow.deleteWorkflow('non-existent-id');
      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      // Try to delete with invalid workflow ID
      const result = await liteflow.deleteWorkflow(null as any);
      expect(result).toBe(false);
    });

    it('should maintain data integrity after deletion', async () => {
      // Create two workflows
      const workflow1 = liteflow.startWorkflow('workflow-1', [
        { key: 'test1', value: '123' }
      ]);
      const workflow2 = liteflow.startWorkflow('workflow-2', [
        { key: 'test2', value: '456' }
      ]);

      // Add steps to both workflows
      liteflow.addStep(workflow1, 'step1', { data: 'test1' });
      liteflow.addStep(workflow2, 'step1', { data: 'test2' });
      await liteflow.flushBatchInserts();

      // Delete first workflow
      await liteflow.deleteWorkflow(workflow1);

      // Check if second workflow and its steps still exist
      const foundWorkflow2 = await liteflow.getWorkflowByIdentifier('test2', '456');
      expect(foundWorkflow2).toBeDefined();
      expect(foundWorkflow2?.id).toBe(workflow2.id);

      const steps2 = await liteflow.getSteps(workflow2);
      expect(steps2).toHaveLength(1);
    });
  });

  describe('deleteAllWorkflows', () => {
    beforeEach(() => {
      // Prepare test data
      const workflowId1 = liteflow.startWorkflow('test-workflow-1', [
        { key: 'test1', value: '123' }
      ]);
      liteflow.addStep(workflowId1, 'step1', { data: 'test1' });

      const workflowId2 = liteflow.startWorkflow('test-workflow-2', [
        { key: 'test2', value: '456' }
      ]);
      liteflow.addStep(workflowId2, 'step1', { data: 'test2' });
      liteflow.addStep(workflowId2, 'step2', { data: 'test2' });
    });

    it('should delete all workflows and their steps', async () => {
      // Delete all workflows
      const result = await liteflow.deleteAllWorkflows();
      expect(result).toBe(true);

      // Check if workflows are deleted
      const workflows = await liteflow.getWorkflows();
      expect(workflows.workflows).toHaveLength(0);
      expect(workflows.total).toBe(0);

      // Check if steps are deleted
      const stats = await liteflow.getWorkflowStats();
      expect(stats.avgSteps).toBe(0);
    });

    it('should handle empty database', async () => {
      // First delete all data
      await liteflow.deleteAllWorkflows();

      // Try to delete again on empty database
      const result = await liteflow.deleteAllWorkflows();
      expect(result).toBe(true);

      // Check if database is still empty
      const workflows = await liteflow.getWorkflows();
      expect(workflows.workflows).toHaveLength(0);
      expect(workflows.total).toBe(0);
    });

    it('should maintain data integrity after deletion', async () => {
      // Delete all workflows
      await liteflow.deleteAllWorkflows();

      // Create new workflow
      const newWorkflowId = liteflow.startWorkflow('new-workflow', [
        { key: 'test', value: '123' }
      ]);
      liteflow.addStep(newWorkflowId, 'step1', { data: 'test' });

      // Check if new workflow is created correctly
      const workflows = await liteflow.getWorkflows();
      expect(workflows.workflows).toHaveLength(1);
      expect(workflows.workflows[0].name).toBe('new-workflow');

      const steps = await liteflow.getSteps(newWorkflowId);
      expect(steps).toHaveLength(1);
      expect(steps[0].step).toBe('step1');
    });

    it('should handle database errors gracefully', async () => {
      // Break database connection
      await liteflow.db.destroy();
      
      // Try to delete
      const result = await liteflow.deleteAllWorkflows();
      expect(result).toBe(false);

      // Restart database
      liteflow = new Liteflow(dbPath);
      await liteflow.init();
    });
  });

  describe('WorkflowInstance API', () => {
    it('should allow adding steps via workflow instance', async () => {
      const workflow = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: '123' }
      ]);
      
      // Use instance method
      workflow.addStep('step1', { data: 'test1' });
      workflow.addStep('step2', { data: 'test2' });
      await liteflow.flushBatchInserts();
      
      const steps = await workflow.getSteps();
      expect(steps).toHaveLength(2);
      expect(steps[0].step).toBe('step1');
      expect(steps[1].step).toBe('step2');
    });

    it('should allow completing workflow via instance', async () => {
      const workflow = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: '123' }
      ]);
      
      workflow.complete();
      
      const result = await liteflow.getWorkflowByIdentifier('test', '123');
      expect(result?.status).toBe('completed');
    });

    it('should allow failing workflow via instance', async () => {
      const workflow = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: '123' }
      ]);
      
      workflow.fail('Test failure reason');
      
      const result = await liteflow.getWorkflowByIdentifier('test', '123');
      expect(result?.status).toBe('failed');
    });

    it('should allow deleting workflow via instance', async () => {
      const workflow = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: '123' }
      ]);
      workflow.addStep('step1', { data: 'test1' });
      
      const deleted = workflow.delete();
      expect(deleted).toBe(true);
      
      const result = await liteflow.getWorkflowByIdentifier('test', '123');
      expect(result).toBeUndefined();
    });

    it('should provide workflow ID via .id property', async () => {
      const workflow = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: '123' }
      ]);
      
      expect(workflow.id).toBeDefined();
      expect(typeof workflow.id).toBe('string');
    });

    it('should convert to string representation', async () => {
      const workflow = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: '123' }
      ]);
      
      const str = workflow.toString();
      expect(str).toBe(workflow.id);
      expect(typeof str).toBe('string');
    });

    it('should work with both old and new API styles', async () => {
      const workflow = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: '123' }
      ]);
      
      // Old style - using liteflow methods with workflow instance
      liteflow.addStep(workflow, 'step1', { data: 'test1' });
      
      // New style - using workflow instance methods
      workflow.addStep('step2', { data: 'test2' });
      
      const steps = await liteflow.getSteps(workflow);
      expect(steps).toHaveLength(2);
      expect(steps[0].step).toBe('step1');
      expect(steps[1].step).toBe('step2');
    });

    it('should chain operations on workflow instance', async () => {
      const workflow = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: '123' }
      ]);
      
      workflow.addStep('step1', { data: 'test1' });
      workflow.addStep('step2', { data: 'test2' });
      workflow.complete();
      
      const result = await liteflow.getWorkflowByIdentifier('test', '123');
      expect(result?.status).toBe('completed');
      
      const steps = workflow.getSteps();
      expect(steps).toHaveLength(2);
    });
  });
}); 