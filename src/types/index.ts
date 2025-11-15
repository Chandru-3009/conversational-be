import { Buffer } from "buffer";
import { ObjectId } from "mongodb";

export interface User {
  _id?: ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  _id?: ObjectId;
  userId: string;
  sessionId: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  type: "user" | "ai";
  content: string;
  timestamp: Date;
  audioUrl?: string;
}

export interface FoodEntry {
  _id?: ObjectId;
  userId: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  foods: FoodItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface FoodItem {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface AudioChunk {
  sessionId: string;
  data: Buffer;
  timestamp: number;
}

export interface ProcessingState {
  isProcessing: boolean;
  lastProcessed: number;
  buffer: Buffer;
  queue: Buffer[];
}

export interface WebSocketMessage {
  type: 'audio' | 'text' | 'status' | 'error' | 'realtime_session_request' | 'realtime_session_response' | 'tts_request' | 'test' | 'client_ready_request' | 'client_ready_response' | 'conversation_completed' | 'user_message' | 'ai_response' | 'conversation_summary_request' | 'conversation_summary_response';
  sessionId: string;
  data: any;
  timestamp: number;
  messageType?: string;
  messageData?: any;
}

export interface STTResponse {
  text: string;
  confidence: number;
}

export interface TTSResponse {
  audio: string; // base64 encoded
  duration: number;
}

export interface AIResponse {
  text: string;
  shouldEndSession: boolean;
  mealCompleted?: boolean;
}

export interface SessionData {
  sessionId: string;
  userId?: string;
  conversation: Conversation;
  processingState: ProcessingState;
  lastActivity: number;
}



export interface Agent {
  _id?: ObjectId;
  name: string;
  about: string;
  mode: ("text" | "audio")[];
  tone: string;
  personality: string;
  gender: "male" | "female";
  sections: Array<Section>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Section {
  _id?: ObjectId;
  name: string;
  about: string;
  introduction: Intent[]; // usually has one warm-up intent
  intents: Intent[];
}

export interface Intent {
  id: number;
  intent: string;
  isMandatory: boolean;
  retryLimit: number;
  fieldsToExtract: Field[];
}

export interface Field {
  name: string;             // field name (e.g., "name", "age")
  type: "string" | "number" | "boolean"; // data type
  description: string;      // what this field captures
  example: string;
  validation?: string;      // any rule or regex description
}


