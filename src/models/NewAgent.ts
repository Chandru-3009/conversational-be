import { ObjectId } from "mongodb";
import { getDatabase } from "../config/database";
import { Agent, Section, Intent, Field } from "../types";
import { Config } from "../config/config";

export interface IAgent extends Agent {
  _id?: ObjectId;
}

export interface IAgentCreate {
  name: string;
  about: string;
  mode: ("text" | "audio")[];
  tone: string;
  personality: string;
  gender: "male" | "female";
  sections: Array<Section>;
}

// Database document interfaces
interface IAgentDoc {
  _id: ObjectId;
  name: string;
  about: string;
  mode: ("text" | "audio")[];
  tone?: string;
  personality?: string;
  gender?: "male" | "female";
  status?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ISectionDoc {
  _id: ObjectId;
  agentId: ObjectId;
  name: string;
  about: string;
  order: number;
  guidelines?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface IIntentDoc {
  _id: ObjectId;
  sectionId: ObjectId;
  id: number;
  intent: string;
  isMandatory: boolean;
  retryLimit?: number;
  fieldsToExtract?: Field[];
  context?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export class NewAgentModel {
  // Get collection references
  private static agentCollection = () =>
    getDatabase(Config.DATABASE_NAME).collection<IAgentDoc>("intent_builder_agents");
  
  private static sectionCollection = () =>
    getDatabase(Config.DATABASE_NAME).collection<ISectionDoc>("intent_builder_sections");
  
  private static intentCollection = () =>
    getDatabase(Config.DATABASE_NAME).collection<IIntentDoc>("intent_builder_intents");

  /**
   * Find agent by ID and return in the old format structure
   */
  static async findById(id: string): Promise<IAgent | null> {
    try {
      const agentDoc = await this.agentCollection().findOne({ 
        _id: new ObjectId(id) 
      });
      
      if (!agentDoc) return null;

      return await this.buildCompleteAgent(agentDoc);
    } catch (error) {
      console.error("Error finding agent by ID:", error);
      return null;
    }
  }

  /**
   * Find agent by name and return in the old format structure
   */
  static async findByName(name: string): Promise<IAgent | null> {
    const agentDoc = await this.agentCollection().findOne({ name });
    
    if (!agentDoc) return null;

    return await this.buildCompleteAgent(agentDoc);
  }

  /**
   * Find agents by gender
   */
  static async findByGender(gender: "male" | "female"): Promise<IAgent[]> {
    const agentDocs = await this.agentCollection()
      .find({ gender })
      .sort({ createdAt: -1 })
      .toArray();

    const agents: IAgent[] = [];
    for (const agentDoc of agentDocs) {
      const completeAgent = await this.buildCompleteAgent(agentDoc);
      if (completeAgent) agents.push(completeAgent);
    }

    return agents;
  }

  /**
   * Build complete agent structure from separate collections
   */
  private static async buildCompleteAgent(agentDoc: IAgentDoc): Promise<IAgent | null> {
    try {
      // Fetch all sections for this agent
      const sections = await this.sectionCollection()
        .find({ agentId: agentDoc._id })
        .sort({ order: 1 })
        .toArray();

      // Build sections with intents
      const completeSections: Section[] = [];
      
      for (const sectionDoc of sections) {
        // Fetch all intents for this section
        const intents = await this.intentCollection()
          .find({ sectionId: sectionDoc._id })
          .sort({ order: 1, id: 1 })
          .toArray();

        // Map intents to the expected format
        const sectionIntents: Intent[] = intents.map(intentDoc => ({
          id: intentDoc.id,
          intent: intentDoc.intent,
          isMandatory: intentDoc.isMandatory,
          retryLimit: intentDoc.retryLimit || 3,
          fieldsToExtract: intentDoc.fieldsToExtract || [],
          context: intentDoc.context
        }));

        // Check if there's an introduction intent (usually the first one)
        const introductionIntent = sectionIntents.find(i => 
          i.intent.toLowerCase().includes('introduction') || 
          i.id === 1000 // or whatever ID pattern you use for intro
        );

        const section: Section = {
          name: sectionDoc.name,
          about: sectionDoc.about,
          introduction: introductionIntent ? [introductionIntent] : undefined,
          intents: sectionIntents.filter(i => i !== introductionIntent) // Exclude intro from main intents
        } as Section;

        completeSections.push(section);
      }

      // Build the complete agent object in the old format
      const completeAgent: IAgent = {
        _id: agentDoc._id,
        name: agentDoc.name,
        about: agentDoc.about,
        mode: agentDoc.mode,
        sections: completeSections,
        createdAt: agentDoc.createdAt,
        updatedAt: agentDoc.updatedAt,
        tone: agentDoc.tone,
        personality: agentDoc.personality,
        gender: agentDoc.gender
      };

      return completeAgent;
    } catch (error) {
      console.error("Error building complete agent:", error);
      return null;
    }
  }

  /**
   * Update agent (only updates agent-level data)
   */
  static async update(
    id: string,
    updateData: Partial<IAgentDoc>
  ): Promise<boolean> {
    const result = await this.agentCollection().updateOne(
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

  /**
   * Delete agent and all related sections and intents
   */
  static async delete(id: string): Promise<boolean> {
    const agentId = new ObjectId(id);
    
    // First, get all sections for this agent
    const sections = await this.sectionCollection()
      .find({ agentId })
      .toArray();
    
    // Delete all intents for each section
    for (const section of sections) {
      await this.intentCollection().deleteMany({ 
        sectionId: section._id 
      });
    }
    
    // Delete all sections for this agent
    await this.sectionCollection().deleteMany({ agentId });
    
    // Finally, delete the agent
    const result = await this.agentCollection().deleteOne({ 
      _id: agentId 
    });
    
    return result.deletedCount > 0;
  }

  /**
   * List agents with complete structure
   */
  static async list(limit: number = 10, skip: number = 0): Promise<IAgent[]> {
    const agentDocs = await this.agentCollection()
      .find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const agents: IAgent[] = [];
    for (const agentDoc of agentDocs) {
      const completeAgent = await this.buildCompleteAgent(agentDoc);
      if (completeAgent) agents.push(completeAgent);
    }

    return agents;
  }

  /**
   * Count total agents
   */
  static async count(): Promise<number> {
    return await this.agentCollection().countDocuments();
  }

  /**
   * Create indexes for better performance
   */
  static async createIndexes(): Promise<void> {
    // Agent indexes
    await this.agentCollection().createIndex({ name: 1 }, { unique: true });
    await this.agentCollection().createIndex({ gender: 1 });
    await this.agentCollection().createIndex({ createdAt: -1 });
    
    // Section indexes
    await this.sectionCollection().createIndex({ agentId: 1 });
    await this.sectionCollection().createIndex({ agentId: 1, order: 1 });
    
    // Intent indexes
    await this.intentCollection().createIndex({ sectionId: 1 });
    await this.intentCollection().createIndex({ sectionId: 1, order: 1 });
    await this.intentCollection().createIndex({ sectionId: 1, id: 1 });
  }

  /**
   * Get formatted agent (alias for findById to maintain compatibility)
   */
  static async getFormattedAgent(id: string): Promise<Agent | null> {
    return await this.findById(id);
  }

  // Additional helper methods for working with sections and intents

  /**
   * Add a new section to an agent
   */
  static async addSection(
    agentId: string,
    sectionData: Omit<ISectionDoc, '_id' | 'agentId' | 'createdAt' | 'updatedAt'>
  ): Promise<ObjectId | null> {
    const result = await this.sectionCollection().insertOne({
      _id: new ObjectId(), // Add this line to generate a new ObjectId
      ...sectionData,
      agentId: new ObjectId(agentId),
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return result.insertedId;
  }

  /**
   * Add a new intent to a section
   */
  static async addIntent(
    sectionId: string,
    intentData: Omit<IIntentDoc, '_id' | 'sectionId' | 'createdAt' | 'updatedAt'>
  ): Promise<ObjectId | null> {
    const result = await this.intentCollection().insertOne({
      _id: new ObjectId(), // Add this line to generate a new ObjectId
      ...intentData,
      sectionId: new ObjectId(sectionId),
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return result.insertedId;
  }

  /**
   * Update a section
   */
  static async updateSection(
    sectionId: string,
    updateData: Partial<Omit<ISectionDoc, '_id' | 'agentId'>>
  ): Promise<boolean> {
    const result = await this.sectionCollection().updateOne(
      { _id: new ObjectId(sectionId) },
      {
        $set: {
          ...updateData,
          updatedAt: new Date()
        }
      }
    );
    
    return result.modifiedCount > 0;
  }

  /**
   * Update an intent
   */
  static async updateIntent(
    intentId: string,
    updateData: Partial<Omit<IIntentDoc, '_id' | 'sectionId'>>
  ): Promise<boolean> {
    const result = await this.intentCollection().updateOne(
      { _id: new ObjectId(intentId) },
      {
        $set: {
          ...updateData,
          updatedAt: new Date()
        }
      }
    );
    
    return result.modifiedCount > 0;
  }

  /**
   * Delete a section and all its intents
   */
  static async deleteSection(sectionId: string): Promise<boolean> {
    const sectionObjectId = new ObjectId(sectionId);
    
    // Delete all intents for this section
    await this.intentCollection().deleteMany({ 
      sectionId: sectionObjectId 
    });
    
    // Delete the section
    const result = await this.sectionCollection().deleteOne({ 
      _id: sectionObjectId 
    });
    
    return result.deletedCount > 0;
  }

  /**
   * Delete an intent
   */
  static async deleteIntent(intentId: string): Promise<boolean> {
    const result = await this.intentCollection().deleteOne({ 
      _id: new ObjectId(intentId) 
    });
    
    return result.deletedCount > 0;
  }

  /**
   * Get all sections for an agent
   */
  static async getSectionsByAgentId(agentId: string): Promise<ISectionDoc[]> {
    return await this.sectionCollection()
      .find({ agentId: new ObjectId(agentId) })
      .sort({ order: 1 })
      .toArray();
  }

  /**
   * Get all intents for a section
   */
  static async getIntentsBySectionId(sectionId: string): Promise<IIntentDoc[]> {
    return await this.intentCollection()
      .find({ sectionId: new ObjectId(sectionId) })
      .sort({ order: 1, id: 1 })
      .toArray();
  }
}