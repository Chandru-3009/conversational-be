import { ObjectId } from "mongodb";
import { getDatabase } from "../config/database";

export interface IMessage {
  type: "user" | "ai";
  content: string;
  timestamp: Date;
  audioUrl?: string;
  metadata?: {
    confidence?: number;
    processingTime?: number;
    mealContext?: string;
    sentiment?: "positive" | "neutral" | "negative";
  };
}

export interface IConversation {
  _id?: ObjectId;
  userId: string;
  sessionId: string;
  messages: IMessage[];
  summary?: {
    mealType?: "breakfast" | "lunch" | "dinner" | "snack";
    foodsLogged: string[];
    totalCalories?: number;
    completionStatus: "incomplete" | "complete" | "abandoned";
    isCompleteMeal?: boolean; // New property to track if meal is complete
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IConversationCreate {
  userId: string;
  sessionId: string;
  messages?: IMessage[];
  summary?: IConversation["summary"];
}

export class ConversationModel {
  private static collection = () =>
    getDatabase().collection<IConversation>("conversations");

  static async create(
    conversationData: IConversationCreate
  ): Promise<IConversation> {
    const now = new Date();
    const conversation: IConversation = {
      ...conversationData,
      messages: conversationData.messages || [],
      summary: conversationData.summary || {
        foodsLogged: [],
        completionStatus: "incomplete",
      },
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.collection().insertOne(conversation);
    return { ...conversation, _id: result.insertedId };
  }

  static async findById(id: string): Promise<IConversation | null> {
    return await this.collection().findOne({ _id: new ObjectId(id) });
  }

  static async findBySessionId(
    sessionId: string
  ): Promise<IConversation | null> {
    return await this.collection().findOne({ sessionId });
  }

  static async findByUserId(
    userId: string,
    limit: number = 10,
    skip: number = 0
  ): Promise<IConversation[]> {
    return await this.collection()
      .find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  }

  static async addMessage(
    sessionId: string,
    message: IMessage
  ): Promise<boolean> {
    const result = await this.collection().updateOne(
      { sessionId },
      {
        $push: { messages: message },
        $set: { updatedAt: new Date() },
      }
    );
    return result.modifiedCount > 0;
  }

  static async update(
    sessionId: string,
    updateData: Partial<IConversation>
  ): Promise<boolean> {
    const result = await this.collection().updateOne(
      { sessionId },
      {
        $set: {
          ...updateData,
          updatedAt: new Date(),
        },
      }
    );
    return result.modifiedCount > 0;
  }

  static async updateSummary(
    sessionId: string,
    summary: Partial<IConversation["summary"]>
  ): Promise<boolean> {
    const conversation = await this.findBySessionId(sessionId);
    if (!conversation) return false;

    const updatedSummary: IConversation["summary"] = {
      foodsLogged:
        summary?.foodsLogged ?? conversation.summary?.foodsLogged ?? [],
      completionStatus:
        summary?.completionStatus ??
        conversation.summary?.completionStatus ??
        "incomplete",
      isCompleteMeal:
        summary?.isCompleteMeal ??
        conversation.summary?.isCompleteMeal ??
        false,
    };

    // Only add optional properties if they are defined
    if (
      summary?.mealType !== undefined ||
      conversation.summary?.mealType !== undefined
    ) {
      const mealType = summary?.mealType ?? conversation.summary?.mealType;
      if (mealType !== undefined) {
        updatedSummary.mealType = mealType;
      }
    }
    if (
      summary?.totalCalories !== undefined ||
      conversation.summary?.totalCalories !== undefined
    ) {
      const totalCalories =
        summary?.totalCalories ?? conversation.summary?.totalCalories;
      if (totalCalories !== undefined) {
        updatedSummary.totalCalories = totalCalories;
      }
    }

    const result = await this.collection().updateOne(
      { sessionId },
      {
        $set: {
          summary: updatedSummary,
          updatedAt: new Date(),
        },
      }
    );
    return result.modifiedCount > 0;
  }

  static async getRecentConversations(
    userId: string,
    limit: number = 5
  ): Promise<IConversation[]> {
    return await this.collection()
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  static async getCompletedConversations(
    userId: string,
    limit: number = 10
  ): Promise<IConversation[]> {
    return await this.collection()
      .find({
        userId,
        "summary.completionStatus": "complete",
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  static async getTodayConversations(userId: string): Promise<IConversation[]> {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    return await this.collection()
      .find({
        userId,
        createdAt: {
          $gte: startOfDay,
          $lt: endOfDay,
        },
      })
      .sort({ createdAt: -1 })
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

  static async list(
    limit: number = 10,
    skip: number = 0
  ): Promise<IConversation[]> {
    return await this.collection()
      .find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  }

  // Create indexes
  static async createIndexes(): Promise<void> {
    await this.collection().createIndex({ userId: 1, createdAt: -1 });
    await this.collection().createIndex({ sessionId: 1 }, { unique: true });
    await this.collection().createIndex({ "summary.completionStatus": 1 });
    await this.collection().createIndex({ "summary.mealType": 1 });
  }
}
