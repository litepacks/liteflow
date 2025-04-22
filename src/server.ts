import express from 'express';
import auth from 'basic-auth';
import { Liteflow } from './index';
import { join } from 'path';

const app = express();
app.use(express.json());

// Basic auth middleware
const basicAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const credentials = auth(req);
  
  if (!credentials || 
      credentials.name !== process.env.AUTH_USERNAME || 
      credentials.pass !== process.env.AUTH_PASSWORD) {
    res.set('WWW-Authenticate', 'Basic realm="Liteflow API"');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};

// Liteflow instance
const liteflow = new Liteflow(join(__dirname, '..', 'data', 'workflows.db'));
liteflow.init();

// Routes
app.get('/workflows', basicAuth, (req, res) => {
  try {
    const workflows = liteflow.getWorkflows({
      status: req.query.status as any,
      page: Number(req.query.page) || 1,
      pageSize: Number(req.query.pageSize) || 10,
      orderBy: req.query.orderBy as any,
      order: req.query.order as any
    });
    res.json(workflows);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/workflows', basicAuth, (req, res) => {
  try {
    const { name, identifiers } = req.body;
    if (!name || !identifiers) {
      return res.status(400).json({ error: 'Name and identifiers are required' });
    }
    
    const workflowId = liteflow.startWorkflow(name, identifiers);
    res.status(201).json({ id: workflowId });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/workflows/:id/steps', basicAuth, (req, res) => {
  try {
    const { step, data } = req.body;
    if (!step) {
      return res.status(400).json({ error: 'Step name is required' });
    }
    
    liteflow.addStep(req.params.id, step, data);
    res.status(201).json({ message: 'Step added successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/workflows/:id/complete', basicAuth, (req, res) => {
  try {
    liteflow.completeWorkflow(req.params.id);
    res.json({ message: 'Workflow completed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/workflows/:id/fail', basicAuth, (req, res) => {
  try {
    liteflow.failWorkflow(req.params.id, req.body.reason);
    res.json({ message: 'Workflow marked as failed' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/workflows/:id', basicAuth, (req, res) => {
  try {
    const result = liteflow.deleteWorkflow(req.params.id);
    if (result) {
      res.json({ message: 'Workflow deleted successfully' });
    } else {
      res.status(404).json({ error: 'Workflow not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Stats endpoint
app.get('/stats', basicAuth, (req, res) => {
  try {
    const stats = liteflow.getWorkflowStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 