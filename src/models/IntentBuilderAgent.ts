import { ObjectId } from "mongodb";
import { getDatabase } from "../config/database";
import { IntentBuilderAgent, CreateAgentRequest, UpdateAgentRequest } from "../types/intentBuilder";
import { IntentBuilderSectionModel } from "./IntentBuilderSection";
import { IntentBuilderIntentModel } from "./IntentBuilderIntent";
import { Config } from "../config/config";

export interface IIntentBuilderAgent extends IntentBuilderAgent {
  _id?: ObjectId;
}

export class IntentBuilderAgentModel {
  private static collection = () =>
    getDatabase(Config.DATABASE_NAME).collection<IIntentBuilderAgent>("intent_builder_agents");

  // Create new agent
  static async create(agentData: CreateAgentRequest): Promise<IIntentBuilderAgent> {
    const now = new Date();
    const newAgent: IIntentBuilderAgent = {
      name: agentData.name,
      about: agentData.about,
      mode: agentData.mode || ["text"],
      tone: agentData.tone || "friendly",
      personality: agentData.personality || "helpful",
      gender: agentData.gender || "female",
      status: "draft",
      createdAt: now,
      updatedAt: now
    };

    console.log("--->newAgent", newAgent);

    const result = await this.collection().insertOne(newAgent);
    newAgent._id = result.insertedId;
    return newAgent;
  }

  // Find agent by ID
  static async findById(id: string): Promise<IIntentBuilderAgent | null> {
    try {
      return await this.collection().findOne({ _id: new ObjectId(id) });
    } catch (error) {
      console.error("Error finding intent builder agent by ID:", error);
      return null;
    }
  }

  // Find all agents
  static async findAll(): Promise<IIntentBuilderAgent[]> {
    return await this.collection()
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
  }

  // Update agent
  static async update(
    id: string,
    updateData: UpdateAgentRequest
  ): Promise<boolean> {
    const result = await this.collection().updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...updateData,
          updatedAt: new Date(),
        },
      }
    );
    return result.modifiedCount > 0;
  }

  // Delete agent
  static async delete(id: string): Promise<boolean> {
    const result = await this.collection().deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  // Deploy agent
  static async deploy(id: string): Promise<boolean> {
    const result = await this.collection().updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: "active",
          deployedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );
    return result.modifiedCount > 0;
  }

  // Archive agent
  static async archive(id: string): Promise<boolean> {
    const result = await this.collection().updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: "archived",
          updatedAt: new Date(),
        },
      }
    );
    return result.modifiedCount > 0;
  }

  // Count agents
  static async count(): Promise<number> {
    return await this.collection().countDocuments({});
  }

  // List agents with pagination and filtering
  static async list(
    page: number = 1,
    limit: number = 10,
    status?: "draft" | "active" | "archived"
  ): Promise<{ agents: IIntentBuilderAgent[]; total: number; page: number }> {
    const skip = (page - 1) * limit;
    
    // Build filter
    const filter: any = {};
    if (status) {
      filter.status = status;
    }
    
    // Get agents with pagination
    const agents = await this.collection()
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    
    // Get total count
    const total = await this.collection().countDocuments(filter);
    
    return {
      agents,
      total,
      page
    };
  }

  // Get complete agent with sections and intents for frontend
  static async getCompleteAgentForFrontend(agentId: string): Promise<any> {
    const agent = await this.findById(agentId);
    if (!agent) return null;

    // Get sections for this agent
    const sections = await IntentBuilderSectionModel.findByAgentId(agentId);
    
    // Get intents for each section
   // In IntentBuilderAgentModel.getCompleteAgentForFrontend()
const sectionsWithIntents = await Promise.all(
  sections.map(async (section, index) => {
    const intents = await IntentBuilderIntentModel.findBySectionId(section._id?.toString() || '');
    
    const transformedIntents = intents.map((intent, intentIndex) => {
      const baseIntent = {
        id: intent._id?.toString(),  // ✅ Use actual MongoDB ObjectId
        intent: intent.intent,
        isMandatory: intent.isMandatory,
        retryLimit: intent.isMandatory ? 3 : 2,
        context: section.about
      };

      // Check if intent has fields to extract, regardless of position
      const hasFieldsToExtract = intent.fieldsToExtract && intent.fieldsToExtract.length > 0;
      
      return {
        ...baseIntent,
        fieldsToExtract: hasFieldsToExtract ? intent.fieldsToExtract : null
      };
    });

    return {
      id: section._id?.toString(),
      name: section.name,
      about: section.about,
      guidelines: "make it fun and engaging",
      introduction: [],
      intents: transformedIntents
    };
  })
);

    return {
      _id: {
        "$oid": agent._id?.toString()
      },
      name: agent.name,
      about: agent.about,
      mode: agent.mode,
      sections: sectionsWithIntents,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt
    };
  }

  // Validate agent for deployment
  static async validateForDeployment(agentId: string): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    const agent = await this.findById(agentId);
    if (!agent) {
      errors.push("Agent not found");
      return { isValid: false, errors };
    }

    // Check if agent has required fields
    if (!agent.name || agent.name.trim() === '') {
      errors.push("Agent name is required");
    }
    if (!agent.about || agent.about.trim() === '') {
      errors.push("Agent description is required");
    }

    // Check if agent has sections
    const sections = await IntentBuilderSectionModel.findByAgentId(agentId);
    if (sections.length === 0) {
      errors.push("Agent must have at least one section");
    }

    // Check if sections have intents
    for (const section of sections) {
      const intents = await IntentBuilderIntentModel.findBySectionId(section._id?.toString() || '');
      if (intents.length === 0) {
        errors.push(`Section "${section.name}" must have at least one intent`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Get complete agent (alias for getCompleteAgentForFrontend)
  static async getCompleteAgent(agentId: string): Promise<any> {
    return await this.getCompleteAgentForFrontend(agentId);
  }

  // Find active agents
  static async findActive(): Promise<IIntentBuilderAgent[]> {
    return await this.collection()
      .find({ status: "active" })
      .sort({ createdAt: -1 })
      .toArray();
  }

  // Update agent status
  static async updateStatus(agentId: string, status: string, deployedAt?: Date): Promise<boolean> {
    const updateData: any = {
      status,
      updatedAt: new Date()
    };
    
    if (deployedAt) {
      updateData.deployedAt = deployedAt;
    }

    const result = await this.collection().updateOne(
      { _id: new ObjectId(agentId) },
      { $set: updateData }
    );
    return result.modifiedCount > 0;
  }

  // Create indexes
  static async createIndexes(): Promise<void> {
    await this.collection().createIndex({ status: 1 });
    await this.collection().createIndex({ createdAt: -1 });
    await this.collection().createIndex({ deployedAt: -1 });
  }
} 