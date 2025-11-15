import { ObjectId } from 'mongodb';
import { getDatabase } from '../config/database';
import { Config } from '../config/config';

export interface CapturedFieldKV {
  key: string;
  value: string;
}

export interface IntentResponseEntry {
  intentId: string;
  fields: CapturedFieldKV[];
}

// Represents a single aggregated document per user+session
export interface IIntentBuilderResponse {
  _id?: ObjectId;
  userId: string;
  sessionId: string;
  conversationId: string; // renamed from agentId
  responses: IntentResponseEntry[];
}

export interface IIntentBuilderResponseCreate {
  userId: string;
  sessionId: string;
  agentId: string; // kept for backward compatibility, mapped to conversationId
  intentId: string;
  intentPrompt: string;
  userTranscript: string;
  fields?: Record<string, string>;
  isCompleted?: boolean;
  // Optional forward-compatibility to pass conversationId directly
  conversationId?: string;
}

export class IntentBuilderResponseModel {
  private static collection = () =>
    getDatabase(Config.DATABASE_NAME).collection<IIntentBuilderResponse>('user_responses');

  static async createOrAppend(payload: IIntentBuilderResponseCreate): Promise<IIntentBuilderResponse> {
    // Aggregate by userId + sessionId (single document per session)
    const filter = { userId: payload.userId, sessionId: payload.sessionId };

    const conversationId = payload.conversationId || payload.agentId || '';

    // Normalize fields to array of key/value pairs
    const fieldsKV: CapturedFieldKV[] = Object.entries(payload.fields || {}).map(([key, value]) => ({
      key,
      value: String(value ?? ''),
    }));

    const responseEntry: IntentResponseEntry = {
      intentId: payload.intentId,
      fields: fieldsKV,
    };

    const update = {
      $setOnInsert: {
        userId: payload.userId,
        sessionId: payload.sessionId,
        conversationId,
      },
      $push: {
        responses: responseEntry,
      },
    } as const;

    // Perform upsert + push, then fetch the latest document
    await this.collection().updateOne(filter, update, { upsert: true });

    // Ensure conversationId is set even if first insert used an empty fallback
    const doc = await this.collection().findOne(filter);
    if (doc && !doc.conversationId && conversationId) {
      await this.collection().updateOne(filter, { $set: { conversationId } });
      doc.conversationId = conversationId;
    }

    if (doc) return doc;
    // This should not happen, but return a minimal constructed doc
    return {
      userId: payload.userId,
      sessionId: payload.sessionId,
      conversationId,
      responses: [responseEntry],
    };
  }

  static async createIndexes(): Promise<void> {
    // Single document per user+session
    await this.collection().createIndex({ userId: 1, sessionId: 1 }, { unique: true });
    await this.collection().createIndex({ conversationId: 1 });
  }
}


