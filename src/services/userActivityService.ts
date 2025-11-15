import { IUser } from '../models/User';
import { IFoodEntry } from '../models/FoodEntry';
import { ISession } from '../models/Session';
import { IConversation } from '../models/Conversation';
import { UserModel } from '../models/User';
import { FoodEntryModel } from '../models/FoodEntry';
import { SessionModel } from '../models/Session';
import { ConversationModel } from '../models/Conversation';
import { toZonedTime } from 'date-fns-tz';

export interface UserRecentActivity {
  lastMeal?: IFoodEntry;
  lastSession?: ISession;
  recentConversations: IConversation[];
  streakDays: number;
  totalMeals: number;
  totalSessions: number;
  averageEngagement: number;
  preferredMealTime?: string;
}

export class UserActivityService {
  static async getUserRecentActivity(userId: string): Promise<UserRecentActivity> {
    try {
      const [lastMeal, lastSession, recentConversations, user] = await Promise.all([
        FoodEntryModel.getLastMeal(userId),
        SessionModel.getLastSession(userId),
        ConversationModel.getRecentConversations(userId, 5),
        UserModel.findById(userId)
      ]);

      const streakDays = await this.calculateStreakDays(userId);
      const totalMeals = user?.stats?.totalMeals || 0;
      const totalSessions = user?.stats?.totalSessions || 0;
      const averageEngagement = await this.calculateAverageEngagement(userId);
      const preferredMealTime = await this.getPreferredMealTime(userId);

      const result: UserRecentActivity = {
        recentConversations,
        streakDays,
        totalMeals,
        totalSessions,
        averageEngagement
      };

      // Only add optional properties if they exist
      if (lastMeal) {
        result.lastMeal = lastMeal;
      }
      if (lastSession) {
        result.lastSession = lastSession;
      }
      if (preferredMealTime) {
        result.preferredMealTime = preferredMealTime;
      }

      return result;
    } catch (error) {
      console.error('Error getting user recent activity:', error);
      return {
        recentConversations: [],
        streakDays: 0,
        totalMeals: 0,
        totalSessions: 0,
        averageEngagement: 0
      };
    }
  }

  private static async calculateStreakDays(userId: string): Promise<number> {
    try {
      // Get user to access timezone preference
      const user = await UserModel.findById(userId);
      if (!user) return 0;

      const meals = await FoodEntryModel.getRecentMeals(userId, 30);
      if (meals.length === 0) return 0;

      // Get user's timezone, default to UTC if not set
      const userTimezone = user.preferences?.timezone || 'UTC';

      let streakDays = 0;
      
      // Get current date in user's timezone
      const now = new Date();
      const userNow = toZonedTime(now, userTimezone);
      const today = new Date(userNow.getFullYear(), userNow.getMonth(), userNow.getDate());

      for (let i = 0; i < meals.length; i++) {
        const meal = meals[i];
        if (!meal) continue;
        
        // Convert meal date to user's timezone for comparison
        const mealDate = new Date(meal.date);
        const userMealDate = toZonedTime(mealDate, userTimezone);
        const mealDateNormalized = new Date(userMealDate.getFullYear(), userMealDate.getMonth(), userMealDate.getDate());
        
        // Calculate expected date in user's timezone
        const expectedDate = new Date(today);
        expectedDate.setDate(today.getDate() - i);
        
        if (mealDateNormalized.getTime() === expectedDate.getTime()) {
          streakDays++;
        } else {
          break;
        }
      }

      return streakDays;
    } catch (error) {
      console.error('Error calculating streak days:', error);
      return 0;
    }
  }

  private static async calculateAverageEngagement(userId: string): Promise<number> {
    try {
      const conversations = await ConversationModel.getRecentConversations(userId, 10);
      if (conversations.length === 0) return 0;

      const totalMessages = conversations.reduce((sum, conv) => sum + conv.messages.length, 0);
      return Math.round(totalMessages / conversations.length);
    } catch (error) {
      console.error('Error calculating average engagement:', error);
      return 0;
    }
  }

  private static async getPreferredMealTime(userId: string): Promise<string | undefined> {
    try {
      // Get user to access timezone preference
      const user = await UserModel.findById(userId);
      if (!user) return undefined;

      const meals = await FoodEntryModel.getRecentMeals(userId, 30);
      if (meals.length === 0) return undefined;

      // Get user's timezone, default to UTC if not set
      const userTimezone = user.preferences?.timezone || 'UTC';

      const mealTimes = meals.map((meal: IFoodEntry) => {
        const date = new Date(meal.date);
        // Convert to user's timezone for accurate hour calculation
        const userDate = toZonedTime(date, userTimezone);
        return userDate.getHours();
      });

      const timeCounts: Record<number, number> = {};
      mealTimes.forEach((hour: number) => {
        timeCounts[hour] = (timeCounts[hour] || 0) + 1;
      });

      const preferredHour = Object.entries(timeCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0];

      if (!preferredHour) return undefined;

      const hour = parseInt(preferredHour);
      if (hour < 11) return 'breakfast';
      if (hour < 16) return 'lunch';
      if (hour < 21) return 'dinner';
      return 'snack';
    } catch (error) {
      console.error('Error getting preferred meal time:', error);
      return undefined;
    }
  }

  static async getNextMealSuggestion(userId: string): Promise<string> {
    try {
      // Get user to access timezone preference
      const user = await UserModel.findById(userId);
      if (!user) return 'breakfast';

      const lastMeal = await FoodEntryModel.getLastMeal(userId);
      if (!lastMeal) {
        // Get user's timezone, default to UTC if not set
        const userTimezone = user.preferences?.timezone || 'UTC';
        const now = new Date();
        const userNow = toZonedTime(now, userTimezone);
        const hour = userNow.getHours();
        
        if (hour < 11) return 'breakfast';
        if (hour < 16) return 'lunch';
        if (hour < 21) return 'dinner';
        return 'snack';
      }

      const mealOrder = ['breakfast', 'lunch', 'dinner', 'snack'];
      const currentIndex = mealOrder.indexOf(lastMeal.mealType);
      const nextIndex = (currentIndex + 1) % mealOrder.length;
      return mealOrder[nextIndex] || 'breakfast';
    } catch (error) {
      console.error('Error getting next meal suggestion:', error);
      return 'breakfast';
    }
  }

  static async updateUserStats(userId: string, activity: Partial<UserRecentActivity>): Promise<boolean> {
    try {
      const updates: any = {};

      if (activity.totalMeals !== undefined) {
        updates.totalMeals = activity.totalMeals;
      }
      if (activity.totalSessions !== undefined) {
        updates.totalSessions = activity.totalSessions;
      }
      if (activity.streakDays !== undefined) {
        updates.streakDays = activity.streakDays;
      }

      if (Object.keys(updates).length > 0) {
        return await UserModel.updateStats(userId, updates);
      }

      return true;
    } catch (error) {
      console.error('Error updating user stats:', error);
      return false;
    }
  }

  static async getMealContext(lastMeal?: IFoodEntry, userId?: string): Promise<string> {
    if (!lastMeal) {
      return 'new_user';
    }

    // Get user timezone if userId is provided
    let userTimezone = 'UTC';
    if (userId) {
      try {
        const user = await UserModel.findById(userId);
        userTimezone = user?.preferences?.timezone || 'UTC';
      } catch (error) {
        console.error('Error getting user timezone for meal context:', error);
      }
    }

    const now = new Date();
    const lastMealDate = new Date(lastMeal.date);
    
    // Convert both dates to user's timezone for accurate comparison
    const userNow = toZonedTime(now, userTimezone);
    const userLastMealDate = toZonedTime(lastMealDate, userTimezone);
    
    // Normalize to start of day in user's timezone
    const userNowNormalized = new Date(userNow.getFullYear(), userNow.getMonth(), userNow.getDate());
    const userLastMealNormalized = new Date(userLastMealDate.getFullYear(), userLastMealDate.getMonth(), userLastMealDate.getDate());
    
    const daysSince = Math.floor((userNowNormalized.getTime() - userLastMealNormalized.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSince === 0) {
      // Same day
      return `same_day_${lastMeal.mealType}`;
    } else if (daysSince === 1) {
      // Yesterday
      return `yesterday_${lastMeal.mealType}`;
    } else {
      // Multiple days ago
      return `days_ago_${daysSince}`;
    }
  }

  static async getDaysSinceLastMeal(lastMeal: IFoodEntry, userId?: string): Promise<number> {
    // Get user timezone if userId is provided
    let userTimezone = 'UTC';
    if (userId) {
      try {
        const user = await UserModel.findById(userId);
        userTimezone = user?.preferences?.timezone || 'UTC';
      } catch (error) {
        console.error('Error getting user timezone for days calculation:', error);
      }
    }

    const now = new Date();
    const lastMealDate = new Date(lastMeal.date);
    
    // Convert both dates to user's timezone for accurate comparison
    const userNow = toZonedTime(now, userTimezone);
    const userLastMealDate = toZonedTime(lastMealDate, userTimezone);
    
    // Normalize to start of day in user's timezone
    const userNowNormalized = new Date(userNow.getFullYear(), userNow.getMonth(), userNow.getDate());
    const userLastMealNormalized = new Date(userLastMealDate.getFullYear(), userLastMealDate.getMonth(), userLastMealDate.getDate());
    
    const diffTime = Math.abs(userNowNormalized.getTime() - userLastMealNormalized.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
} 