import { Router } from 'express';
import { IntentBuilderAgentModel } from '../models/IntentBuilderAgent';
import { IntentBuilderSectionModel } from '../models/IntentBuilderSection';
import { IntentBuilderIntentModel } from '../models/IntentBuilderIntent';
import { 
  validateCreateAgent, 
  validateUpdateAgent, 
  validateCreateSection, 
  validateUpdateSection, 
  validateCreateIntent, 
  validateUpdateIntent 
} from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { AgentModel } from '../models/Agent'; // Added import for AgentModel
import { NewToOldFormatService } from '../services/newToOldFormatService';
import { CompleteIntentBuilderAgentModel } from '../models/CompleteIntentBuilderAgent';
import { CompiledAgentService } from '../services/compiledAgentService';

const router = Router();

// ===== AGENT ROUTES =====

// Create new agent
router.post('/agents', validateCreateAgent, asyncHandler(async (req, res) => {
  const agent = await IntentBuilderAgentModel.create(req.body);
  // Auto-compile snapshot for external consumers
  try {
    await CompiledAgentService.compileAndUpsert(agent._id?.toString() || '');
  } catch (e) {
    console.warn('Compile failed after agent create:', e);
  }
  res.status(201).json({
    success: true,
    data: {
      id: agent._id?.toString(),
      name: agent.name,
      about: agent.about,
      createdAt: agent.createdAt
    }
  });
}));

// Get all agents with pagination
router.get('/agents', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as "draft" | "active" | "archived" | undefined;
  
  const result = await IntentBuilderAgentModel.list(page, limit, status);
  
  res.json({
    success: true,
    data: {
      agents: result.agents.map(agent => ({
        id: agent._id?.toString(),
        name: agent.name,
        about: agent.about,
        createdAt: agent.createdAt
      })),
      total: result.total,
      page: result.page,
      totalPages: Math.ceil(result.total / limit)
    }
  });
}));

// Get specific agent
router.get('/agents/:id', asyncHandler(async (req, res) => {
  const frontendAgent = await IntentBuilderAgentModel.getCompleteAgentForFrontend(req.params.id);
  if (!frontendAgent) {
    return res.status(404).json({
      error: 'Agent not found',
      details: 'The requested agent does not exist',
      timestamp: new Date().toISOString()
    });
  }
  
  res.json({
    success: true,
    data: frontendAgent
  });
}));

// Update agent
router.put('/agents/:id', validateUpdateAgent, asyncHandler(async (req, res) => {
  const success = await IntentBuilderAgentModel.update(req.params.id, req.body);
  if (!success) {
    return res.status(404).json({
      error: 'Agent not found',
      details: 'The requested agent does not exist',
      timestamp: new Date().toISOString()
    });
  }
  
  // Get the updated agent
  const updatedAgent = await IntentBuilderAgentModel.findById(req.params.id);
  if (!updatedAgent) {
    return res.status(404).json({
      error: 'Agent not found',
      details: 'The requested agent does not exist',
      timestamp: new Date().toISOString()
    });
  }
  // Auto-compile snapshot
  try {
    await CompiledAgentService.compileAndUpsert(req.params.id);
  } catch (e) {
    console.warn('Compile failed after agent update:', e);
  }
  
  res.json({
    success: true,
    data: {
      id: updatedAgent._id?.toString(),
      name: updatedAgent.name,
      about: updatedAgent.about,
      updatedAt: updatedAgent.updatedAt
    }
  });
}));

// Delete agent
router.delete('/agents/:id', asyncHandler(async (req, res) => {
  // Delete associated sections and intents first
  const sections = await IntentBuilderSectionModel.findByAgentId(req.params.id);
  
  // Delete intents for each section
  for (const section of sections) {
    await IntentBuilderIntentModel.deleteBySectionId(section._id?.toString() || '');
  }
  
  // Delete sections
  await IntentBuilderSectionModel.deleteByAgentId(req.params.id);
  
  // Delete the agent
  const deleted = await IntentBuilderAgentModel.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({
      error: 'Agent not found',
      details: 'The requested agent does not exist',
      timestamp: new Date().toISOString()
    });
  }
  // Remove compiled snapshot too
  try {
    await CompleteIntentBuilderAgentModel.deleteByAgentId(req.params.id);
  } catch (e) {
    console.warn('Failed to delete compiled snapshot after agent delete:', e);
  }
  
  res.json({
    success: true,
    message: 'Agent and all associated data deleted successfully'
  });
}));

// Deploy agent
router.post('/agents/:id/deploy', asyncHandler(async (req, res) => {
  // Validate agent for deployment
  const validation = await IntentBuilderAgentModel.validateForDeployment(req.params.id);
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'Deployment validation failed',
      details: validation.errors.join(', '),
      timestamp: new Date().toISOString()
    });
  }
  
  // Update agent status to active
  const success = await IntentBuilderAgentModel.updateStatus(req.params.id, "active", new Date());
  if (!success) {
    return res.status(404).json({
      error: 'Agent not found',
      details: 'The requested agent does not exist',
      timestamp: new Date().toISOString()
    });
  }
  
  // Get the deployed agent
  const deployedAgent = await IntentBuilderAgentModel.findById(req.params.id);
  if (!deployedAgent) {
    return res.status(404).json({
      error: 'Agent not found',
      details: 'The requested agent does not exist',
      timestamp: new Date().toISOString()
    });
  }
  
  res.json({
    success: true,
    data: {
      agentId: deployedAgent._id?.toString(),
      status: deployedAgent.status,
      deployedAt: deployedAgent.deployedAt,
      message: 'Agent deployed successfully'
    }
  });
}));

// ===== COMPILED (OLD FORMAT) AGENT ROUTES =====

// Compile and upsert a complete old-format agent into its own collection
router.post('/agents/:id/compile', asyncHandler(async (req, res) => {
  const completeAgent = await IntentBuilderAgentModel.getCompleteAgentForFrontend(req.params.id);
  if (!completeAgent) {
    return res.status(404).json({
      error: 'Agent not found',
      details: 'The requested agent does not exist',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const transformed = NewToOldFormatService.transform(completeAgent as any);
    const saved = await CompleteIntentBuilderAgentModel.upsert(
      (completeAgent as any)._id?.$oid || (completeAgent as any)._id || req.params.id,
      transformed as any,
      transformed.name
    );
    return res.status(201).json({
      success: true,
      data: {
        id: saved._id?.toString(),
        agentId: saved.agentId.toString(),
        name: saved.name,
        updatedAt: saved.updatedAt
      }
    });
  } catch (e: any) {
    return res.status(400).json({
      error: 'Compilation failed',
      details: e?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}));

// Retrieve compiled old-format agent by builder agent id
router.get('/agents/:id/compiled', asyncHandler(async (req, res) => {
  const compiled = await CompleteIntentBuilderAgentModel.findByAgentId(req.params.id);
  if (!compiled) {
    return res.status(404).json({
      error: 'Not found',
      details: 'No compiled agent found. Compile first using POST /api/agents/:id/compile',
      timestamp: new Date().toISOString()
    });
  }
  return res.json({ success: true, data: compiled.data });
}));

// Get specific agent in normalized format (for builder interface)
router.get('/agents/:id/normalized', asyncHandler(async (req, res) => {
  const completeAgent = await IntentBuilderAgentModel.getCompleteAgent(req.params.id);
  if (!completeAgent) {
    return res.status(404).json({
      error: 'Agent not found',
      details: 'The requested agent does not exist',
      timestamp: new Date().toISOString()
    });
  }
  
  res.json({
    success: true,
    data: {
      id: completeAgent.agent._id?.toString(),
      name: completeAgent.agent.name,
      about: completeAgent.agent.about,
      mode: completeAgent.agent.mode,
      tone: completeAgent.agent.tone,
      personality: completeAgent.agent.personality,
      gender: completeAgent.agent.gender,
      status: completeAgent.agent.status,
      sections: completeAgent.sections,
      createdAt: completeAgent.agent.createdAt,
      updatedAt: completeAgent.agent.updatedAt,
      deployedAt: completeAgent.agent.deployedAt
    }
  });
}));

// Get specific agent in strict old-format (id string, no context in intents, dedup introduction)
router.get('/agents/:id/old-format', asyncHandler(async (req, res) => {
  const completeAgent = await IntentBuilderAgentModel.getCompleteAgentForFrontend(req.params.id);
  if (!completeAgent) {
    return res.status(404).json({
      error: 'Agent not found',
      details: 'The requested agent does not exist',
      timestamp: new Date().toISOString()
    });
  }

  try {
    // completeAgent already resembles legacy from builder route; enforce requested target structure
    const transformed = NewToOldFormatService.transform(completeAgent as any);
    return res.json({ success: true, data: transformed });
  } catch (e: any) {
    return res.status(400).json({
      error: 'Transformation failed',
      details: e?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}));

// Transform arbitrary posted new-format JSON payload to old format
router.post('/legacy/transform', asyncHandler(async (req, res) => {
  try {
    const payload = (req.body && typeof req.body === 'object' && 'data' in req.body) ? (req.body as any).data : req.body;
    const transformed = NewToOldFormatService.transform(payload);
    return res.json({ success: true, data: transformed });
  } catch (e: any) {
    return res.status(400).json({
      error: 'Invalid input',
      details: e?.message || 'Failed to transform payload',
      timestamp: new Date().toISOString()
    });
  }
}));

// Get voice config for agent
router.get('/agents/:id/voice-config', asyncHandler(async (req, res) => {
  const completeAgent = await IntentBuilderAgentModel.getCompleteAgent(req.params.id);
  if (!completeAgent) {
    return res.status(404).json({
      error: 'Agent not found',
      details: 'The requested agent does not exist',
      timestamp: new Date().toISOString()
    });
  }
  
  res.json({
    success: true,
    data: {
      agentId: completeAgent.agent._id?.toString(),
      name: completeAgent.agent.name,
      about: completeAgent.agent.about,
      sections: completeAgent.sections,
      status: completeAgent.agent.status
    }
  });
}));

// Get all active agents
router.get('/agents/active', asyncHandler(async (req, res) => {
  const activeAgents = await IntentBuilderAgentModel.findActive();
  
  res.json({
    success: true,
    data: {
      agents: activeAgents.map(agent => ({
        id: agent._id?.toString(),
        name: agent.name,
        about: agent.about,
        status: agent.status,
        deployedAt: agent.deployedAt
      }))
    }
  });
}));

// ===== SECTION ROUTES =====

// Create new section
router.post('/agents/:agentId/sections', validateCreateSection, asyncHandler(async (req, res) => {
  const section = await IntentBuilderSectionModel.create(req.params.agentId, req.body);
  // Auto-compile snapshot
  try {
    await CompiledAgentService.compileAndUpsert(req.params.agentId);
  } catch (e) {
    console.warn('Compile failed after section create:', e);
  }
  
  res.status(201).json({
    success: true,
    data: {
      id: section._id?.toString(),
      name: section.name,
      about: section.about,
      order: section.order,
      createdAt: section.createdAt
    }
  });
}));

// Get all sections for an agent
router.get('/agents/:agentId/sections', asyncHandler(async (req, res) => {
  const sections = await IntentBuilderSectionModel.findByAgentId(req.params.agentId);
  
  res.json({
    success: true,
    data: {
      sections: sections.map(section => ({
        id: section._id?.toString(),
        name: section.name,
        about: section.about,
        order: section.order,
        createdAt: section.createdAt
      }))
    }
  });
}));

// Update section
router.put('/agents/:agentId/sections/:sectionId', validateUpdateSection, asyncHandler(async (req, res) => {
  const success = await IntentBuilderSectionModel.update(req.params.sectionId, req.body);
  if (!success) {
    return res.status(404).json({
      error: 'Section not found',
      details: 'The requested section does not exist',
      timestamp: new Date().toISOString()
    });
  }
  
  // Get the updated section
  const updatedSection = await IntentBuilderSectionModel.findById(req.params.sectionId);
  if (!updatedSection) {
    return res.status(404).json({
      error: 'Section not found',
      details: 'The requested section does not exist',
      timestamp: new Date().toISOString()
    });
  }
  // Auto-compile snapshot
  try {
    await CompiledAgentService.compileAndUpsert(req.params.agentId);
  } catch (e) {
    console.warn('Compile failed after section update:', e);
  }
  
  res.json({
    success: true,
    data: {
      id: updatedSection._id?.toString(),
      name: updatedSection.name,
      about: updatedSection.about,
      order: updatedSection.order,
      updatedAt: updatedSection.updatedAt
    }
  });
}));

// Delete section
router.delete('/agents/:agentId/sections/:sectionId', asyncHandler(async (req, res) => {
  // Delete associated intents first
  await IntentBuilderIntentModel.deleteBySectionId(req.params.sectionId);
  
  // Delete the section
  const deleted = await IntentBuilderSectionModel.delete(req.params.sectionId);
  if (!deleted) {
    return res.status(404).json({
      error: 'Section not found',
      details: 'The requested section does not exist',
      timestamp: new Date().toISOString()
    });
  }
  // Auto-compile snapshot
  try {
    await CompiledAgentService.compileAndUpsert(req.params.agentId);
  } catch (e) {
    console.warn('Compile failed after section delete:', e);
  }
  
  res.json({
    success: true,
    message: 'Section and all associated intents deleted successfully'
  });
}));

// ===== INTENT ROUTES =====

// Create new intent
router.post('/agents/:agentId/sections/:sectionId/intents', validateCreateIntent, asyncHandler(async (req, res) => {
  const intent = await IntentBuilderIntentModel.create(req.params.sectionId, req.body);
  // Auto-compile snapshot
  try {
    await CompiledAgentService.compileAndUpsert(req.params.agentId);
  } catch (e) {
    console.warn('Compile failed after intent create:', e);
  }
  
  res.status(201).json({
    success: true,
    data: {
      id: intent._id?.toString(),
      intentId: intent.id,
      intent: intent.intent,
      isMandatory: intent.isMandatory,
      fieldsToExtract: intent.fieldsToExtract,
      order: intent.order,
      createdAt: intent.createdAt
    }
  });
}));

// Get all intents for a section
router.get('/agents/:agentId/sections/:sectionId/intents', asyncHandler(async (req, res) => {
  const intents = await IntentBuilderIntentModel.findBySectionId(req.params.sectionId);
  
  res.json({
    success: true,
    data: {
      intents: intents.map(intent => ({
        id: intent._id?.toString(),
        intentId: intent.id,
        intent: intent.intent,
        isMandatory: intent.isMandatory,
        fieldsToExtract: intent.fieldsToExtract,
        order: intent.order,
        createdAt: intent.createdAt
      }))
    }
  });
}));

// Update intent
router.put('/agents/:agentId/sections/:sectionId/intents/:intentId', validateUpdateIntent, asyncHandler(async (req, res) => {
  const success = await IntentBuilderIntentModel.update(req.params.intentId, req.body);
  if (!success) {
    return res.status(404).json({
      error: 'Intent not found',
      details: 'The requested intent does not exist',
      timestamp: new Date().toISOString()
    });
  }
  
  // Get the updated intent
  const updatedIntent = await IntentBuilderIntentModel.findById(req.params.intentId);
  if (!updatedIntent) {
    return res.status(404).json({
      error: 'Intent not found',
      details: 'The requested intent does not exist',
      timestamp: new Date().toISOString()
    });
  }
  // Auto-compile snapshot
  try {
    await CompiledAgentService.compileAndUpsert(req.params.agentId);
  } catch (e) {
    console.warn('Compile failed after intent update:', e);
  }
  
  res.json({
    success: true,
    data: {
      id: updatedIntent._id?.toString(),
      intentId: updatedIntent.id,
      intent: updatedIntent.intent,
      isMandatory: updatedIntent.isMandatory,
      fieldsToExtract: updatedIntent.fieldsToExtract,
      order: updatedIntent.order,
      updatedAt: updatedIntent.updatedAt
    }
  });
}));

// Delete intent
router.delete('/agents/:agentId/sections/:sectionId/intents/:intentId', asyncHandler(async (req, res) => {
  const deleted = await IntentBuilderIntentModel.delete(req.params.intentId);
  if (!deleted) {
    return res.status(404).json({
      error: 'Intent not found',
      details: 'The requested intent does not exist',
      timestamp: new Date().toISOString()
    });
  }
  // Auto-compile snapshot
  try {
    await CompiledAgentService.compileAndUpsert(req.params.agentId);
  } catch (e) {
    console.warn('Compile failed after intent delete:', e);
  }
  
  res.json({
    success: true,
    message: 'Intent deleted successfully'
  });
}));

// ===== LEGACY AGENT COLLECTION ROUTES =====

// Get all agents from legacy agent collection
router.get('/legacy/agents', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;
  
  const agents = await AgentModel.list(limit, skip);
  const total = await AgentModel.count();
  
  res.json({
    success: true,
    data: {
      agents: agents.map(agent => ({
        id: agent._id?.toString(),
        name: agent.name,
        about: agent.about,
        mode: agent.mode,
        tone: agent.tone,
        personality: agent.personality,
        gender: agent.gender,
        sections: agent.sections,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    }
  });
}));

// Get specific agent from legacy agent collection
router.get('/legacy/agents/:id', asyncHandler(async (req, res) => {
  const agent = await AgentModel.getFormattedAgent(req.params.id);
  if (!agent) {
    return res.status(404).json({
      error: 'Agent not found',
      details: 'The requested agent does not exist in legacy collection',
      timestamp: new Date().toISOString()
    });
  }
  
  res.json({
    success: true,
    data: {
      id: agent._id?.toString(),
      name: agent.name,
      about: agent.about,
      mode: agent.mode,
      tone: agent.tone,
      personality: agent.personality,
      gender: agent.gender,
      sections: agent.sections,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt
    }
  });
}));

// Get agent by name from legacy agent collection
router.get('/legacy/agents/name/:name', asyncHandler(async (req, res) => {
  const agent = await AgentModel.findByName(req.params.name);
  if (!agent) {
    return res.status(404).json({
      error: 'Agent not found',
      details: 'The requested agent does not exist in legacy collection',
      timestamp: new Date().toISOString()
    });
  }
  
  res.json({
    success: true,
    data: {
      id: agent._id?.toString(),
      name: agent.name,
      about: agent.about,
      mode: agent.mode,
      tone: agent.tone,
      personality: agent.personality,
      gender: agent.gender,
      sections: agent.sections,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt
    }
  });
}));

// Get agents by gender from legacy agent collection
router.get('/legacy/agents/gender/:gender', asyncHandler(async (req, res) => {
  const gender = req.params.gender as "male" | "female";
  if (!["male", "female"].includes(gender)) {
    return res.status(400).json({
      error: 'Invalid gender',
      details: 'Gender must be either "male" or "female"',
      timestamp: new Date().toISOString()
    });
  }
  
  const agents = await AgentModel.findByGender(gender);
  
  res.json({
    success: true,
    data: {
      agents: agents.map(agent => ({
        id: agent._id?.toString(),
        name: agent.name,
        about: agent.about,
        mode: agent.mode,
        tone: agent.tone,
        personality: agent.personality,
        gender: agent.gender,
        sections: agent.sections,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt
      }))
    }
  });
}));

// Get total count of agents in legacy collection
router.get('/legacy/agents/count', asyncHandler(async (req, res) => {
  const count = await AgentModel.count();
  
  res.json({
    success: true,
    data: {
      totalAgents: count
    }
  });
}));

export default router; 