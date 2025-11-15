import { ObjectId } from "mongodb";
import { getDatabase } from "../config/database";

export interface IUserPreferences {
  preferredGreeting?: "formal" | "casual" | "friendly";
  timezone?: string;
  dietaryRestrictions?: string[];
  goals?: string[];
}

export interface IUserStats {
  totalSessions: number;
  totalMeals: number;
  streakDays: number;
  lastActive: Date;
}

export interface IUser {
  _id?: ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  preferences: IUserPreferences;
  stats: IUserStats;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserCreate {
  firstName: string;
  lastName: string;
  email: string;
  preferences?: IUserPreferences;
}

export class UserModel {
  private static collection = () => getDatabase().collection<IUser>("users");

  static async create(userData: IUserCreate): Promise<IUser> {
    const now = new Date();
    const user: IUser = {
      ...userData,
      preferences: userData.preferences || {
        preferredGreeting: "friendly",
        timezone: "UTC",
        dietaryRestrictions: [],
        goals: [],
      },
      stats: {
        totalSessions: 0,
        totalMeals: 0,
        streakDays: 0,
        lastActive: now,
      },
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.collection().insertOne(user);
    return { ...user, _id: result.insertedId };
  }

  static async findByEmail(email: string): Promise<IUser | null> {
    return await this.collection().findOne({ email: email.toLowerCase() });
  }

  static async findById(id: string): Promise<IUser | null> {
    return await this.collection().findOne({ _id: new ObjectId(id) });
  }

  static async update(
    id: string,
    updateData: Partial<IUserCreate>
  ): Promise<boolean> {
    const updateObj: any = {
      updatedAt: new Date(),
    };

    if (updateData.firstName !== undefined)
      updateObj.firstName = updateData.firstName;
    if (updateData.lastName !== undefined)
      updateObj.lastName = updateData.lastName;
    if (updateData.email !== undefined) updateObj.email = updateData.email;
    if (updateData.preferences !== undefined)
      updateObj.preferences = updateData.preferences;

    const result = await this.collection().updateOne(
      { _id: new ObjectId(id) },
      { $set: updateObj }
    );
    return result.modifiedCount > 0;
  }

  static async updateStats(
    userId: string,
    stats: Partial<IUserStats>
  ): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user) return false;

    const updatedStats: IUserStats = {
      totalSessions: stats.totalSessions ?? user.stats.totalSessions,
      totalMeals: stats.totalMeals ?? user.stats.totalMeals,
      streakDays: stats.streakDays ?? user.stats.streakDays,
      lastActive: stats.lastActive ?? user.stats.lastActive,
    };

    const result = await this.collection().updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          stats: updatedStats,
          updatedAt: new Date(),
        },
      }
    );
    return result.modifiedCount > 0;
  }

  static async updateLastActive(userId: string): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user) return false;

    const updatedStats: IUserStats = {
      ...user.stats,
      lastActive: new Date(),
    };

    return await this.updateStats(userId, updatedStats);
  }

  static async incrementSessionCount(userId: string): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user) return false;

    const updatedStats: IUserStats = {
      ...user.stats,
      totalSessions: user.stats.totalSessions + 1,
      lastActive: new Date(),
    };

    return await this.updateStats(userId, updatedStats);
  }

  static async incrementMealCount(userId: string): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user) return false;

    const updatedStats: IUserStats = {
      ...user.stats,
      totalMeals: user.stats.totalMeals + 1,
      lastActive: new Date(),
    };

    return await this.updateStats(userId, updatedStats);
  }

  static async delete(id: string): Promise<boolean> {
    const result = await this.collection().deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  static async list(limit: number = 10, skip: number = 0): Promise<IUser[]> {
    return await this.collection()
      .find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  }

  // Create indexes
  static async createIndexes(): Promise<void> {
    await this.collection().createIndex({ email: 1 }, { unique: true });
    await this.collection().createIndex({ "stats.lastActive": -1 });
  }
}
