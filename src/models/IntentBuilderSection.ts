import { ObjectId } from "mongodb";
import { getDatabase } from "../config/database";
import { IntentBuilderSection, CreateSectionRequest, UpdateSectionRequest } from "../types/intentBuilder";
import { Config } from "../config/config";

export interface IIntentBuilderSection extends IntentBuilderSection {
  _id?: ObjectId;
}

export class IntentBuilderSectionModel {
  private static collection = () =>
    getDatabase(Config.DATABASE_NAME).collection<IIntentBuilderSection>("intent_builder_sections");

  // Create new section
  static async create(
    agentId: string,
    sectionData: CreateSectionRequest
  ): Promise<IIntentBuilderSection> {
    const now = new Date();
    const newSection: IIntentBuilderSection = {
      agentId: new ObjectId(agentId),
      name: sectionData.name,
      about: sectionData.about,
      order: sectionData.order || 0,
      createdAt: now,
      updatedAt: now
    };

    const result = await this.collection().insertOne(newSection);
    newSection._id = result.insertedId;
    return newSection;
  }

  // Find section by ID
  static async findById(id: string): Promise<IIntentBuilderSection | null> {
    try {
      return await this.collection().findOne({ _id: new ObjectId(id) });
    } catch (error) {
      console.error("Error finding intent builder section by ID:", error);
      return null;
    }
  }

  // Find sections by agent ID
  static async findByAgentId(agentId: string): Promise<IIntentBuilderSection[]> {
    return await this.collection()
      .find({ agentId: new ObjectId(agentId) })
      .sort({ order: 1, createdAt: 1 })
      .toArray();
  }

  // Update section
  static async update(
    id: string,
    updateData: UpdateSectionRequest
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

  // Delete section
  static async delete(id: string): Promise<boolean> {
    const result = await this.collection().deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  // Delete sections by agent ID
  static async deleteByAgentId(agentId: string): Promise<boolean> {
    const result = await this.collection().deleteMany({ agentId: new ObjectId(agentId) });
    return result.deletedCount > 0;
  }

  // Reorder sections
  static async reorderSections(
    agentId: string,
    sectionIds: string[]
  ): Promise<boolean> {
    const bulkOps = sectionIds.map((sectionId, index) => ({
      updateOne: {
        filter: { 
          _id: new ObjectId(sectionId),
          agentId: new ObjectId(agentId)
        },
        update: { 
          $set: { 
            order: index,
            updatedAt: new Date()
          }
        }
      }
    }));

    const result = await this.collection().bulkWrite(bulkOps);
    return result.modifiedCount > 0;
  }



  // Count sections by agent ID
  static async countByAgentId(agentId: string): Promise<number> {
    return await this.collection().countDocuments({ agentId: new ObjectId(agentId) });
  }

  // Create indexes
  static async createIndexes(): Promise<void> {
    await this.collection().createIndex({ agentId: 1 });
    await this.collection().createIndex({ order: 1 });
    await this.collection().createIndex({ createdAt: -1 });
  }
} 