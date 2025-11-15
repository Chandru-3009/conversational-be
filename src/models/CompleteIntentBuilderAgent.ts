import { ObjectId } from 'mongodb';
import { getDatabase } from '../config/database';
import { Config } from '../config/config';

export interface ICompleteIntentBuilderAgent {
  _id?: ObjectId;
  agentId: ObjectId;
  name: string;
  data: Record<string, any>; // Old-format agent payload
  createdAt: Date;
  updatedAt: Date;
}

export class CompleteIntentBuilderAgentModel {
  private static collection() {
    return getDatabase(Config.DATABASE_NAME).collection<ICompleteIntentBuilderAgent>('complete_intent_builder_agents');
  }

  static async upsert(agentId: string, data: Record<string, any>, name?: string): Promise<ICompleteIntentBuilderAgent> {
    const now = new Date();
    const filter = { agentId: new ObjectId(agentId) };
    const update = {
      $set: {
        name: name || data?.name || '',
        data,
        updatedAt: now
      },
      $setOnInsert: {
        agentId: new ObjectId(agentId),
        createdAt: now
      }
    };

    await this.collection().updateOne(filter as any, update, { upsert: true });
    const doc = await this.collection().findOne(filter as any);
    if (!doc) throw new Error('Failed to upsert compiled agent');
    return doc;
  }

  static async findByAgentId(agentId: string): Promise<ICompleteIntentBuilderAgent | null> {
    try {
      return await this.collection().findOne({ agentId: new ObjectId(agentId) } as any);
    } catch (err) {
      return null;
    }
  }

  static async deleteByAgentId(agentId: string): Promise<boolean> {
    const result = await this.collection().deleteOne({ agentId: new ObjectId(agentId) } as any);
    return result.deletedCount > 0;
  }

  static async createIndexes(): Promise<void> {
    await this.collection().createIndex({ agentId: 1 }, { unique: true });
    await this.collection().createIndex({ name: 1 });
    await this.collection().createIndex({ updatedAt: -1 });
  }
}


