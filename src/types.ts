export interface Workflow {
  id: string;
  name: string;
  identifiers: string;
  status: 'pending' | 'completed' | 'failed';
  started_at: string;
  ended_at?: string;
}

export interface WorkflowStep {
  id: string;
  workflow_id: string;
  step: string;
  data: string;
  created_at: string;
}

export interface WorkflowStats {
  total: number;
  completed: number;
  pending: number;
  avgSteps: number;
}

export interface Identifier {
  key: string;
  value: string;
} 