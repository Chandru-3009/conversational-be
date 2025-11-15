import { ObjectId } from 'mongodb';
import { getDatabase } from '../config/database';

export interface IFoodItem {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface IFoodEntry {
  _id?: ObjectId;
  userId: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foods: IFoodItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFoodEntryCreate {
  userId: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foods: IFoodItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  date?: Date;
}

export class FoodEntryModel {
  private static collection = () => getDatabase().collection<IFoodEntry>('foodEntries');

  static async create(foodEntryData: IFoodEntryCreate): Promise<IFoodEntry> {
    const now = new Date();
    const foodEntry: IFoodEntry = {
      ...foodEntryData,
      date: foodEntryData.date || now,
      createdAt: now,
      updatedAt: now
    };

    const result = await this.collection().insertOne(foodEntry);
    return { ...foodEntry, _id: result.insertedId };
  }

  static async findById(id: string): Promise<IFoodEntry | null> {
    return await this.collection().findOne({ _id: new ObjectId(id) });
  }

  static async findByUserId(userId: string, limit: number = 10, skip: number = 0): Promise<IFoodEntry[]> {
    return await this.collection()
      .find({ userId })
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  }

  static async findByUserIdAndDate(userId: string, date: Date): Promise<IFoodEntry[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await this.collection()
      .find({
        userId,
        date: { $gte: startOfDay, $lte: endOfDay }
      })
      .sort({ date: -1 })
      .toArray();
  }

  static async findByUserIdAndMealType(userId: string, mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack', limit: number = 10, skip: number = 0): Promise<IFoodEntry[]> {
    return await this.collection()
      .find({ userId, mealType })
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  }

  static async update(id: string, updateData: Partial<IFoodEntryCreate>): Promise<boolean> {
    const result = await this.collection().updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          ...updateData, 
          updatedAt: new Date() 
        } 
      }
    );
    return result.modifiedCount > 0;
  }

  static async delete(id: string): Promise<boolean> {
    const result = await this.collection().deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  static async deleteByUserId(userId: string): Promise<number> {
    const result = await this.collection().deleteMany({ userId });
    return result.deletedCount;
  }

  static async list(limit: number = 10, skip: number = 0): Promise<IFoodEntry[]> {
    return await this.collection()
      .find({})
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  }

  // Aggregation methods
  static async getNutritionSummary(userId: string, startDate: Date, endDate: Date): Promise<any> {
    return await this.collection().aggregate([
      {
        $match: {
          userId,
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalCalories: { $sum: '$totalCalories' },
          totalProtein: { $sum: '$totalProtein' },
          totalCarbs: { $sum: '$totalCarbs' },
          totalFat: { $sum: '$totalFat' },
          entryCount: { $sum: 1 }
        }
      }
    ]).toArray();
  }

  // Create indexes
  static async createIndexes(): Promise<void> {
    await this.collection().createIndex({ userId: 1, date: -1 });
    await this.collection().createIndex({ userId: 1, mealType: 1, date: -1 });
  }

  // Count methods
  static async countByUserId(userId: string): Promise<number> {
    return await this.collection().countDocuments({ userId });
  }

  // Get last meal for a user
  static async getLastMeal(userId: string): Promise<IFoodEntry | null> {
    return await this.collection()
      .find({ userId })
      .sort({ date: -1 })
      .limit(1)
      .next();
  }

  // Get recent meals for a user
  static async getRecentMeals(userId: string, limit: number = 30): Promise<IFoodEntry[]> {
    return await this.collection()
      .find({ userId })
      .sort({ date: -1 })
      .limit(limit)
      .toArray();
  }
} 