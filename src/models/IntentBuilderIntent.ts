import { ObjectId } from "mongodb";
import { getDatabase } from "../config/database";
import { IntentBuilderIntent, CreateIntentRequest, UpdateIntentRequest } from "../types/intentBuilder";
import { Config } from "../config/config";

export interface IIntentBuilderIntent extends IntentBuilderIntent {
  _id?: ObjectId;
}

export class IntentBuilderIntentModel {
  private static collection = () =>
    getDatabase(Config.DATABASE_NAME).collection<IIntentBuilderIntent>("intent_builder_intents");

  // Create new intent
  static async create(
    sectionId: string,
    intentData: CreateIntentRequest
  ): Promise<IIntentBuilderIntent> {
    const now = new Date();
    
    // Get the next ID for this section
    const nextId = await this.getNextIntentId(sectionId);
    
    const newIntent: IIntentBuilderIntent = {
      sectionId: new ObjectId(sectionId),
      id: nextId,
      intent: intentData.intent,
      isMandatory: intentData.isMandatory,
      fieldsToExtract: intentData.fieldsToExtract,
      order: intentData.order || 0,
      createdAt: now,
      updatedAt: now
    };

    const result = await this.collection().insertOne(newIntent);
    newIntent._id = result.insertedId;
    return newIntent;
  }

  // Find intent by ID
  static async findById(id: string): Promise<IIntentBuilderIntent | null> {
    try {
      return await this.collection().findOne({ _id: new ObjectId(id) });
    } catch (error) {
      console.error("Error finding intent builder intent by ID:", error);
      return null;
    }
  }

  // Find intent by section ID and intent ID
  static async findBySectionAndIntentId(
    sectionId: string,
    intentId: number
  ): Promise<IIntentBuilderIntent | null> {
    return await this.collection().findOne({
      sectionId: new ObjectId(sectionId),
      id: intentId
    });
  }

  // Find intents by section ID
  static async findBySectionId(sectionId: string): Promise<IIntentBuilderIntent[]> {
    return await this.collection()
      .find({ sectionId: new ObjectId(sectionId) })
      .sort({ order: 1, createdAt: 1 })
      .toArray();
  }

  // Update intent
  static async update(
    id: string,
    updateData: UpdateIntentRequest
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

  // Update intent by section ID and intent ID
  static async updateBySectionAndIntentId(
    sectionId: string,
    intentId: number,
    updateData: UpdateIntentRequest
  ): Promise<boolean> {
    const result = await this.collection().updateOne(
      { 
        sectionId: new ObjectId(sectionId),
        id: intentId
      },
      {
        $set: {
          ...updateData,
          updatedAt: new Date(),
        },
      }
    );
    return result.modifiedCount > 0;
  }

  // Delete intent
  static async delete(id: string): Promise<boolean> {
    const result = await this.collection().deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  // Delete intent by section ID and intent ID
  static async deleteBySectionAndIntentId(
    sectionId: string,
    intentId: number
  ): Promise<boolean> {
    const result = await this.collection().deleteOne({
      sectionId: new ObjectId(sectionId),
      id: intentId
    });
    return result.deletedCount > 0;
  }

  // Delete intents by section ID
  static async deleteBySectionId(sectionId: string): Promise<boolean> {
    const result = await this.collection().deleteMany({ sectionId: new ObjectId(sectionId) });
    return result.deletedCount > 0;
  }

  // Reorder intents in section
  static async reorderIntents(
    sectionId: string,
    intentIds: number[]
  ): Promise<boolean> {
    const bulkOps = intentIds.map((intentId, index) => ({
      updateOne: {
        filter: { 
          sectionId: new ObjectId(sectionId),
          id: intentId
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

  // Get next intent ID for a section
  private static async getNextIntentId(sectionId: string): Promise<number> {
    const lastIntent = await this.collection()
      .findOne(
        { sectionId: new ObjectId(sectionId) },
        { sort: { id: -1 } }
      );
    
    return lastIntent ? lastIntent.id + 1 : 1;
  }

  // Count intents by section ID
  static async countBySectionId(sectionId: string): Promise<number> {
    return await this.collection().countDocuments({ sectionId: new ObjectId(sectionId) });
  }

  // Validate intent data
  static validateIntentData(intentData: CreateIntentRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!intentData.intent || intentData.intent.trim().length === 0) {
      errors.push("Intent question is required");
    } else if (intentData.intent.length > 500) {
      errors.push("Intent question must be 500 characters or less");
    }

    if (!Array.isArray(intentData.fieldsToExtract) || intentData.fieldsToExtract.length === 0) {
      errors.push("Fields to extract is required");
    }

    if (typeof intentData.isMandatory !== 'boolean') {
      errors.push("isMandatory must be a boolean value");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Create indexes
  static async createIndexes(): Promise<void> {
    await this.collection().createIndex({ sectionId: 1 });
    await this.collection().createIndex({ id: 1 });
    await this.collection().createIndex({ order: 1 });
    await this.collection().createIndex({ createdAt: -1 });
    await this.collection().createIndex({ sectionId: 1, id: 1 }, { unique: true });
  }
} 