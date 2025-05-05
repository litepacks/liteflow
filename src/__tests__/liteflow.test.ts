import { Liteflow } from '../index';
import { join } from 'path';
import { unlinkSync } from 'fs';
import Database from 'better-sqlite3';

describe('Liteflow', () => {
  let liteflow: Liteflow;
  const dbPath = join(__dirname, 'test.db');

  beforeEach(() => {
    try {
      unlinkSync(dbPath);
    } catch (error) {
      // Test database might already be deleted
    }
    liteflow = new Liteflow(dbPath);
    liteflow.init();
  });

  afterEach(() => {
    try {
      unlinkSync(dbPath);
    } catch (error) {
      // Test database might already be deleted
    }
  });

  describe('startWorkflow', () => {
    it('should start a new workflow', () => {
      const workflowId = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: '123' }
      ]);
      expect(workflowId).toBeDefined();
    });

    it('should start a workflow with multiple identifiers', () => {
      const workflowId = liteflow.startWorkflow('test-workflow', [
        { key: 'test1', value: '123' },
        { key: 'test2', value: '456' }
      ]);
      expect(workflowId).toBeDefined();
    });

    it('should handle empty identifiers array', () => {
      const workflowId = liteflow.startWorkflow('test-workflow', []);
      expect(workflowId).toBeDefined();
    });

    it('should handle null identifiers', () => {
      const workflowId = liteflow.startWorkflow('test-workflow', null as any);
      expect(workflowId).toBeDefined();
    });

    it('should handle undefined identifiers', () => {
      const workflowId = liteflow.startWorkflow('test-workflow', undefined as any);
      expect(workflowId).toBeDefined();
    });

    it('should handle invalid identifier format', () => {
      const workflowId = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: 123 } as any
      ]);
      expect(workflowId).toBeDefined();
    });
  });

  describe('addStep', () => {
    it('should add a step to a workflow', () => {
      const workflowId = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: '123' }
      ]);
      liteflow.addStep(workflowId, 'test-step', { data: 'test' });
      const steps = liteflow.getSteps(workflowId);
      expect(steps).toHaveLength(1);
      expect(steps[0].step).toBe('test-step');
    });

    it('should add multiple steps to a workflow', () => {
      const workflowId = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: '123' }
      ]);
      liteflow.addStep(workflowId, 'step1', { data: 'test1' });
      liteflow.addStep(workflowId, 'step2', { data: 'test2' });
      const steps = liteflow.getSteps(workflowId);
      expect(steps).toHaveLength(2);
    });

    it('should handle empty data object', () => {
      const workflowId = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: '123' }
      ]);
      liteflow.addStep(workflowId, 'test-step', {});
      const steps = liteflow.getSteps(workflowId);
      expect(steps).toHaveLength(1);
    });

    it('should handle null data', () => {
      const workflowId = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: '123' }
      ]);
      liteflow.addStep(workflowId, 'test-step', null as any);
      const steps = liteflow.getSteps(workflowId);
      expect(steps).toHaveLength(1);
    });

    it('should handle undefined data', () => {
      const workflowId = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: '123' }
      ]);
      liteflow.addStep(workflowId, 'test-step', undefined as any);
      const steps = liteflow.getSteps(workflowId);
      expect(steps).toHaveLength(1);
    });

    it('should handle non-existent workflow', () => {
      const result = liteflow.addStep('non-existent', 'test-step', { data: 'test' });
      expect(result).toBeUndefined();
    });

    it('should handle invalid step name', () => {
      const workflowId = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: '123' }
      ]);
      const result = liteflow.addStep(workflowId, null as any, { data: 'test' });
      expect(result).toBeUndefined();
    });

    describe('dynamic data types', () => {
      it('should handle numeric data', () => {
        const workflowId = liteflow.startWorkflow('test-workflow', [
          { key: 'test', value: '123' }
        ]);
        liteflow.addStep(workflowId, 'numeric-step', { count: 123, price: 99.99 });
        const steps = liteflow.getSteps(workflowId);
        expect(steps).toHaveLength(1);
        const data = JSON.parse(steps[0].data);
        expect(data.count).toBe(123);
        expect(data.price).toBe(99.99);
      });

      it('should handle complex objects', () => {
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
        const steps = liteflow.getSteps(workflowId);
        expect(steps).toHaveLength(1);
        const data = JSON.parse(steps[0].data);
        expect(data.user.id).toBe(1);
        expect(data.user.name).toBe('Ahmet');
        expect(data.user.preferences).toEqual(['dark', 'compact']);
        expect(data.settings.notifications).toBe(true);
      });

      it('should handle arrays', () => {
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
        const steps = liteflow.getSteps(workflowId);
        expect(steps).toHaveLength(1);
        const data = JSON.parse(steps[0].data);
        expect(data.items).toEqual([1, 2, 3]);
        expect(data.users).toHaveLength(2);
        expect(data.users[0].name).toBe('Ahmet');
      });

      it('should handle boolean values', () => {
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
        const steps = liteflow.getSteps(workflowId);
        expect(steps).toHaveLength(1);
        const data = JSON.parse(steps[0].data);
        expect(data.isActive).toBe(true);
        expect(data.settings.notifications).toBe(false);
        expect(data.settings.darkMode).toBe(true);
      });

      it('should handle mixed data types', () => {
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
        const steps = liteflow.getSteps(workflowId);
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
    it('should find a workflow by identifier', () => {
      const workflowId = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: '123' }
      ]);
      const workflow = liteflow.getWorkflowByIdentifier('test', '123');
      expect(workflow).toBeDefined();
      expect(workflow?.id).toBe(workflowId);
    });

    it('should return undefined for non-existent identifier', () => {
      const workflow = liteflow.getWorkflowByIdentifier('nonexistent', '123');
      expect(workflow).toBeUndefined();
    });
  });

  describe('getSteps', () => {
    it('should return empty array for workflow with no steps', () => {
      const workflowId = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: '123' }
      ]);
      const steps = liteflow.getSteps(workflowId);
      expect(steps).toHaveLength(0);
    });

    it('should return all steps for a workflow', () => {
      const workflowId = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: '123' }
      ]);
      liteflow.addStep(workflowId, 'step1', { data: 'test1' });
      liteflow.addStep(workflowId, 'step2', { data: 'test2' });
      const steps = liteflow.getSteps(workflowId);
      expect(steps).toHaveLength(2);
      expect(steps[0].step).toBe('step1');
      expect(steps[1].step).toBe('step2');
    });
  });

  describe('completeWorkflow', () => {
    it('should mark a workflow as completed', () => {
      const workflowId = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: '123' }
      ]);
      liteflow.completeWorkflow(workflowId);
      const workflow = liteflow.getWorkflowByIdentifier('test', '123');
      expect(workflow?.status).toBe('completed');
    });
  });

  describe('getWorkflowStats', () => {
    it('should return correct stats for empty database', () => {
      const stats = liteflow.getWorkflowStats();
      expect(stats.total).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.avgSteps).toBe(0);
    });

    it('should return correct stats for workflows', () => {
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

      const stats = liteflow.getWorkflowStats();
      expect(stats.total).toBe(2);
      expect(stats.completed).toBe(1);
      expect(stats.pending).toBe(1);
      expect(stats.avgSteps).toBe(1.5);
    });

    it('should handle database errors gracefully', () => {
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
    it('should attach a new identifier to an existing workflow', () => {
      const workflowId = liteflow.startWorkflow('test-workflow', [
        { key: 'test1', value: '123' }
      ]);
      const result = liteflow.attachIdentifier('test1', '123', { key: 'test2', value: '456' });
      expect(result).toBe(true);
      const workflow = liteflow.getWorkflowByIdentifier('test2', '456');
      expect(workflow?.id).toBe(workflowId);
    });

    it('should not attach duplicate identifier', () => {
      const workflowId = liteflow.startWorkflow('test-workflow', [
        { key: 'test1', value: '123' }
      ]);
      liteflow.attachIdentifier('test1', '123', { key: 'test2', value: '456' });
      const result = liteflow.attachIdentifier('test1', '123', { key: 'test2', value: '456' });
      expect(result).toBe(false);
    });

    it('should handle non-existent workflow', () => {
      const result = liteflow.attachIdentifier('nonexistent', '123', { key: 'test2', value: '456' });
      expect(result).toBe(false);
    });

    it('should handle empty identifiers', () => {
      const workflowId = liteflow.startWorkflow('test-workflow', []);
      const result = liteflow.attachIdentifier('', '', { key: 'test2', value: '456' });
      expect(result).toBe(false);
    });

    it('should handle null identifiers', () => {
      const workflowId = liteflow.startWorkflow('test-workflow', []);
      const result = liteflow.attachIdentifier(null as any, null as any, { key: 'test2', value: '456' });
      expect(result).toBe(false);
    });

    it('should handle undefined identifiers', () => {
      const workflowId = liteflow.startWorkflow('test-workflow', []);
      const result = liteflow.attachIdentifier(undefined as any, undefined as any, { key: 'test2', value: '456' });
      expect(result).toBe(false);
    });

    it('should handle invalid new identifier', () => {
      const workflowId = liteflow.startWorkflow('test-workflow', [
        { key: 'test1', value: '123' }
      ]);
      const result = liteflow.attachIdentifier('test1', '123', null as any);
      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', () => {
      // Create error with invalid query
      const result = liteflow.attachIdentifier(null as any, null as any, null as any);
      expect(result).toBe(false);
    });
  });

  describe('getMostFrequentSteps', () => {
    it('should return empty array for no steps', () => {
      const steps = liteflow.getMostFrequentSteps();
      expect(steps).toHaveLength(0);
    });

    it('should return most frequent steps', () => {
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

      const steps = liteflow.getMostFrequentSteps(2);
      expect(steps).toHaveLength(2);
      expect(steps[0].step).toBe('step1');
      expect(steps[0].count).toBe(3);
      expect(steps[1].step).toBe('step2');
      expect(steps[1].count).toBe(2);
    });

    it('should handle database errors gracefully', () => {
      // Create error with invalid query
      const result = liteflow.getMostFrequentSteps(-1);
      expect(result).toEqual([]);
    });
  });

  describe('getAverageStepDuration', () => {
    it('should return empty array for no steps', () => {
      const durations = liteflow.getAverageStepDuration();
      expect(durations).toHaveLength(0);
    });

    it('should calculate average step duration', () => {
      const workflowId = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: '123' }
      ]);
      liteflow.addStep(workflowId, 'step1', { data: 'test1' });
      liteflow.addStep(workflowId, 'step2', { data: 'test2' });
      liteflow.addStep(workflowId, 'step3', { data: 'test3' });

      const durations = liteflow.getAverageStepDuration();
      expect(durations).toHaveLength(1);
      expect(durations[0].workflow_id).toBe(workflowId);
      expect(durations[0].step_count).toBe(3);
    });

    it('should handle database errors gracefully', () => {
      // Create error with invalid query
      const result = liteflow.getAverageStepDuration();
      expect(result).toEqual([]);
    });
  });

  describe('getStepsByIdentifier', () => {
    it('should return empty array for non-existent identifier', () => {
      const steps = liteflow.getStepsByIdentifier('nonexistent', '123');
      expect(steps).toHaveLength(0);
    });

    it('should return all steps for a workflow with given identifier', () => {
      const workflowId = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: '123' }
      ]);
      liteflow.addStep(workflowId, 'step1', { data: 'test1' });
      liteflow.addStep(workflowId, 'step2', { data: 'test2' });

      const steps = liteflow.getStepsByIdentifier('test', '123');
      expect(steps).toHaveLength(2);
      expect(steps[0].step).toBe('step1');
      expect(steps[1].step).toBe('step2');
    });

    it('should return steps from multiple workflows with same identifier', () => {
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

      const steps = liteflow.getStepsByIdentifier('test', '123');
      expect(steps).toHaveLength(3);
      expect(steps.map(s => s.step)).toEqual(['step1', 'step2', 'step3']);
    });

    it('should return steps ordered by creation time', () => {
      const workflowId = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: '123' }
      ]);
      
      // Add steps at different times
      liteflow.addStep(workflowId, 'step2', { data: 'test2' });
      liteflow.addStep(workflowId, 'step1', { data: 'test1' });
      liteflow.addStep(workflowId, 'step3', { data: 'test3' });

      const steps = liteflow.getStepsByIdentifier('test', '123');
      expect(steps).toHaveLength(3);
      expect(steps.map(s => s.step)).toEqual(['step2', 'step1', 'step3']);
    });

    it('should handle database errors gracefully', () => {
      // Create error with invalid query
      const result = liteflow.getStepsByIdentifier(null as any, null as any);
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

    it('should return all workflows with pagination info by default', () => {
      const result = liteflow.getWorkflows();
      expect(result.workflows).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('should filter workflows by status', () => {
      const completed = liteflow.getWorkflows({ status: 'completed' });
      expect(completed.workflows).toHaveLength(1);
      expect(completed.workflows[0].status).toBe('completed');
      expect(completed.total).toBe(1);

      const pending = liteflow.getWorkflows({ status: 'pending' });
      expect(pending.workflows).toHaveLength(1);
      expect(pending.workflows[0].status).toBe('pending');
      expect(pending.total).toBe(1);

      const failed = liteflow.getWorkflows({ status: 'failed' });
      expect(failed.workflows).toHaveLength(1);
      expect(failed.workflows[0].status).toBe('failed');
      expect(failed.total).toBe(1);
    });

    it('should support pagination', () => {
      // Add more test data
      for (let i = 4; i <= 15; i++) {
        const workflowId = liteflow.startWorkflow(`test-workflow-${i}`, [
          { key: 'test', value: i.toString() }
        ]);
        liteflow.addStep(workflowId, 'step1', { data: `test${i}` });
      }

      const firstPage = liteflow.getWorkflows({ page: 1, pageSize: 5 });
      expect(firstPage.workflows).toHaveLength(5);
      expect(firstPage.total).toBe(15);
      expect(firstPage.page).toBe(1);
      expect(firstPage.pageSize).toBe(5);
      expect(firstPage.totalPages).toBe(3);

      const secondPage = liteflow.getWorkflows({ page: 2, pageSize: 5 });
      expect(secondPage.workflows).toHaveLength(5);
      expect(secondPage.page).toBe(2);

      const lastPage = liteflow.getWorkflows({ page: 3, pageSize: 5 });
      expect(lastPage.workflows).toHaveLength(5);
      expect(lastPage.page).toBe(3);
    });

    it('should order results by started_at', () => {
      const result = liteflow.getWorkflows({ orderBy: 'started_at', order: 'asc' });
      expect(result.workflows[0].name).toBe('test-workflow-1');
      expect(result.workflows[2].name).toBe('test-workflow-3');
    });

    it('should handle empty database', () => {
      // Clear existing database
      try {
        unlinkSync(dbPath);
      } catch (error) {
        // Test database might already be deleted
      }
      liteflow = new Liteflow(dbPath);
      liteflow.init();

      const result = liteflow.getWorkflows();
      expect(result.workflows).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should filter workflows by identifier key and value', () => {
      // Get workflow with test1:123 identifier
      const result1 = liteflow.getWorkflows({
        identifier: { key: 'test1', value: '123' }
      });
      expect(result1.workflows).toHaveLength(1);
      expect(result1.workflows[0].name).toBe('test-workflow-1');
      expect(result1.total).toBe(1);

      // Get workflow with test1:789 identifier
      const result2 = liteflow.getWorkflows({
        identifier: { key: 'test1', value: '789' }
      });
      expect(result2.workflows).toHaveLength(1);
      expect(result2.workflows[0].name).toBe('test-workflow-3');
      expect(result2.total).toBe(1);

      // Get workflow with test2:456 identifier
      const result3 = liteflow.getWorkflows({
        identifier: { key: 'test2', value: '456' }
      });
      expect(result3.workflows).toHaveLength(1);
      expect(result3.workflows[0].name).toBe('test-workflow-2');
      expect(result3.total).toBe(1);

      // Should return empty result for non-existent identifier
      const result4 = liteflow.getWorkflows({
        identifier: { key: 'nonexistent', value: '123' }
      });
      expect(result4.workflows).toHaveLength(0);
      expect(result4.total).toBe(0);
    });

    it('should combine identifier filter with status filter', () => {
      // Get workflows with test1 key and completed status
      const result1 = liteflow.getWorkflows({
        identifier: { key: 'test1', value: '123' },
        status: 'completed'
      });
      expect(result1.workflows).toHaveLength(1);
      expect(result1.workflows[0].name).toBe('test-workflow-1');
      expect(result1.total).toBe(1);

      // Get workflows with test1 key and failed status
      const result2 = liteflow.getWorkflows({
        identifier: { key: 'test1', value: '789' },
        status: 'failed'
      });
      expect(result2.workflows).toHaveLength(1);
      expect(result2.workflows[0].name).toBe('test-workflow-3');
      expect(result2.total).toBe(1);

      // Get workflows with test1 key and pending status
      const result3 = liteflow.getWorkflows({
        identifier: { key: 'test1', value: '123' },
        status: 'pending'
      });
      expect(result3.workflows).toHaveLength(0);
      expect(result3.total).toBe(0);
    });

    it('should handle database errors gracefully', () => {
      // Create error with invalid query
      const result = liteflow.getWorkflows({ orderBy: 'invalid_column' as any });
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
    it('should delete a workflow and its steps', () => {
      // Create test workflow
      const workflowId = liteflow.startWorkflow('test-workflow', [
        { key: 'test', value: '123' }
      ]);
      liteflow.addStep(workflowId, 'step1', { data: 'test1' });
      liteflow.addStep(workflowId, 'step2', { data: 'test2' });

      // Delete workflow
      const result = liteflow.deleteWorkflow(workflowId);
      expect(result).toBe(true);

      // Check if workflow is deleted
      const workflow = liteflow.getWorkflowByIdentifier('test', '123');
      expect(workflow).toBeUndefined();

      // Check if steps are deleted
      const steps = liteflow.getSteps(workflowId);
      expect(steps).toHaveLength(0);
    });

    it('should return false for non-existent workflow', () => {
      const result = liteflow.deleteWorkflow('non-existent-id');
      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', () => {
      // Try to delete with invalid workflow ID
      const result = liteflow.deleteWorkflow(null as any);
      expect(result).toBe(false);
    });

    it('should maintain data integrity after deletion', () => {
      // Create two workflows
      const workflowId1 = liteflow.startWorkflow('workflow-1', [
        { key: 'test1', value: '123' }
      ]);
      const workflowId2 = liteflow.startWorkflow('workflow-2', [
        { key: 'test2', value: '456' }
      ]);

      // Add steps to both workflows
      liteflow.addStep(workflowId1, 'step1', { data: 'test1' });
      liteflow.addStep(workflowId2, 'step1', { data: 'test2' });

      // Delete first workflow
      liteflow.deleteWorkflow(workflowId1);

      // Check if second workflow and its steps still exist
      const workflow2 = liteflow.getWorkflowByIdentifier('test2', '456');
      expect(workflow2).toBeDefined();
      expect(workflow2?.id).toBe(workflowId2);

      const steps2 = liteflow.getSteps(workflowId2);
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

    it('should delete all workflows and their steps', () => {
      // Delete all workflows
      const result = liteflow.deleteAllWorkflows();
      expect(result).toBe(true);

      // Check if workflows are deleted
      const workflows = liteflow.getWorkflows();
      expect(workflows.workflows).toHaveLength(0);
      expect(workflows.total).toBe(0);

      // Check if steps are deleted
      const stats = liteflow.getWorkflowStats();
      expect(stats.avgSteps).toBe(0);
    });

    it('should handle empty database', () => {
      // First delete all data
      liteflow.deleteAllWorkflows();

      // Try to delete again on empty database
      const result = liteflow.deleteAllWorkflows();
      expect(result).toBe(true);

      // Check if database is still empty
      const workflows = liteflow.getWorkflows();
      expect(workflows.workflows).toHaveLength(0);
      expect(workflows.total).toBe(0);
    });

    it('should maintain data integrity after deletion', () => {
      // Delete all workflows
      liteflow.deleteAllWorkflows();

      // Create new workflow
      const newWorkflowId = liteflow.startWorkflow('new-workflow', [
        { key: 'test', value: '123' }
      ]);
      liteflow.addStep(newWorkflowId, 'step1', { data: 'test' });

      // Check if new workflow is created correctly
      const workflows = liteflow.getWorkflows();
      expect(workflows.workflows).toHaveLength(1);
      expect(workflows.workflows[0].name).toBe('new-workflow');

      const steps = liteflow.getSteps(newWorkflowId);
      expect(steps).toHaveLength(1);
      expect(steps[0].step).toBe('step1');
    });

    it('should handle database errors gracefully', () => {
      // Break database connection
      liteflow.db.close();
      
      // Try to delete
      const result = liteflow.deleteAllWorkflows();
      expect(result).toBe(false);

      // Restart database
      liteflow.db = new Database(dbPath);
      liteflow.init();
    });
  });
}); 