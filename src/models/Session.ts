import { ObjectId } from 'mongodb';
import { getDatabase } from '../config/database';

export interface ISession {
  _id?: ObjectId;
  sessionId: string;
  userId: string;
  userEmail: string;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'completed' | 'abandoned';
  context?: {
    lastMealType?: string;
    lastMealDate?: Date;
    conversationMood?: 'positive' | 'neutral' | 'negative';
    userEngagement?: number; // 0-10 scale
    mealContext?: string;
    completedFields?: any; // Store completed fields from intent-based conversation
    agentId?: string; // Store agent ID for intent-based conversation
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ISessionCreate {
  sessionId: string;
  userId: string;
  userEmail: string;
  context?: ISession['context'];
}

export class SessionModel {
  private static collection = () => getDatabase().collection<ISession>('sessions');

  static async create(sessionData: ISessionCreate): Promise<ISession> {
    const now = new Date();
    const session: ISession = {
      ...sessionData,
      startTime: now,
      status: 'active',
      context: sessionData.context || {
        userEngagement: 5,
        conversationMood: 'neutral'
      },
      createdAt: now,
      updatedAt: now
    };

    const result = await this.collection().insertOne(session);
    return { ...session, _id: result.insertedId };
  }

  static async findBySessionId(sessionId: string): Promise<ISession | null> {
    return await this.collection().findOne({ sessionId });
  }

  /**
   * Find existing session or create a new one atomically
   * This helps prevent race conditions when multiple connections try to create the same session
   */
  static async findOrCreate(sessionData: ISessionCreate): Promise<ISession> {
    const now = new Date();
    const session: ISession = {
      ...sessionData,
      startTime: now,
      status: 'active',
      context: sessionData.context || {
        userEngagement: 5,
        conversationMood: 'neutral'
      },
      createdAt: now,
      updatedAt: now
    };

    try {
      // Try to insert the session
      const result = await this.collection().insertOne(session);
      return { ...session, _id: result.insertedId };
    } catch (error: any) {
      // If it's a duplicate key error, find the existing session
      if (error.code === 11000 && error.keyPattern?.sessionId) {
        const existingSession = await this.findBySessionId(sessionData.sessionId);
        if (existingSession) {
          return existingSession;
        }
      }
      // Re-throw other errors
      throw error;
    }
  }

  static async findByUserId(userId: string, limit: number = 10, skip: number = 0): Promise<ISession[]> {
    return await this.collection()
      .find({ userId })
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  }

  static async updateContext(sessionId: string, context: Partial<ISession['context']>): Promise<boolean> {
    const session = await this.findBySessionId(sessionId);
    if (!session) return false;

    const updatedContext = {
      ...session.context,
      ...context
    };

    const result = await this.collection().updateOne(
      { sessionId },
      { 
        $set: { 
          context: updatedContext,
          updatedAt: new Date() 
        } 
      }
    );
    return result.modifiedCount > 0;
  }

  static async completeSession(sessionId: string): Promise<boolean> {
    const result = await this.collection().updateOne(
      { sessionId },
      { 
        $set: { 
          status: 'completed',
          endTime: new Date(),
          updatedAt: new Date() 
        } 
      }
    );
    return result.modifiedCount > 0;
  }

  static async abandonSession(sessionId: string): Promise<boolean> {
    const result = await this.collection().updateOne(
      { sessionId },
      { 
        $set: { 
          status: 'abandoned',
          endTime: new Date(),
          updatedAt: new Date() 
        } 
      }
    );
    return result.modifiedCount > 0;
  }

  static async updateUserEngagement(sessionId: string, engagement: number): Promise<boolean> {
    return await this.updateContext(sessionId, { userEngagement: Math.max(0, Math.min(10, engagement)) });
  }

  static async updateConversationMood(sessionId: string, mood: 'positive' | 'neutral' | 'negative'): Promise<boolean> {
    return await this.updateContext(sessionId, { conversationMood: mood });
  }

  static async getActiveSessions(userId: string): Promise<ISession[]> {
    return await this.collection()
      .find({ userId, status: 'active' })
      .sort({ startTime: -1 })
      .toArray();
  }

  static async getRecentSessions(userId: string, limit: number = 5): Promise<ISession[]> {
    return await this.collection()
      .find({ userId })
      .sort({ startTime: -1 })
      .limit(limit)
      .toArray();
  }

  static async delete(id: string): Promise<boolean> {
    const result = await this.collection().deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  static async deleteBySessionId(sessionId: string): Promise<boolean> {
    const result = await this.collection().deleteOne({ sessionId });
    return result.deletedCount > 0;
  }

  static async list(limit: number = 10, skip: number = 0): Promise<ISession[]> {
    return await this.collection()
      .find({})
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  }

  // Create indexes
  static async createIndexes(): Promise<void> {
    await this.collection().createIndex({ sessionId: 1 }, { unique: true });
    await this.collection().createIndex({ userId: 1, startTime: -1 });
    await this.collection().createIndex({ userEmail: 1, startTime: -1 });
    await this.collection().createIndex({ status: 1 });
    await this.collection().createIndex({ startTime: -1 });
  }

  // Count methods
  static async countByUserId(userId: string): Promise<number> {
    return await this.collection().countDocuments({ userId });
  }

  // Get last session for a user
  static async getLastSession(userId: string): Promise<ISession | null> {
    return await this.collection()
      .find({ userId })
      .sort({ startTime: -1 })
      .limit(1)
      .next();
  }
} 