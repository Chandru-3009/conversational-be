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
  chatSections: Array<Section>;
}

export class AgentModel {
  private static collection = () =>
    getDatabase(Config.DATABASE_NAME).collection<IAgent>("agent");

  static async findById(id: string): Promise<IAgent | null> {
    try {
      return await this.collection().findOne({ _id: new ObjectId(id) });
    } catch (error) {
      console.error("Error finding agent by ID:", error);
      return null;
    }
  }

  static async findByName(name: string): Promise<IAgent | null> {
    return await this.collection().findOne({ name });
  }

  static async findByGender(gender: "male" | "female"): Promise<IAgent[]> {
    return await this.collection()
      .find({ gender })
      .sort({ createdAt: -1 })
      .toArray();
  }

  static async update(
    id: string,
    updateData: Partial<IAgent>
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

  static async delete(id: string): Promise<boolean> {
    const result = await this.collection().deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  static async list(limit: number = 10, skip: number = 0): Promise<IAgent[]> {
    return await this.collection()
      .find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  }

  static async count(): Promise<number> {
    return await this.collection().countDocuments();
  }

  // Create indexes
  static async createIndexes(): Promise<void> {
    await this.collection().createIndex({ name: 1 }, { unique: true });
    await this.collection().createIndex({ gender: 1 });
    await this.collection().createIndex({ createdAt: -1 });
  }

  // Get agent from database (no formatting needed)
  static async getFormattedAgent(id: string): Promise<Agent | null> {
    const agent = await this.findById(id);
    if (!agent) return null;

    return agent as Agent;
  }
} 