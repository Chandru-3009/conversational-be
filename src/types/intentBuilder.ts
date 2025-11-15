import { ObjectId } from "mongodb";
import { Field } from "./index";

// Intent Builder Agent - Adapted from existing Agent structure
export interface IntentBuilderAgent {
  _id?: ObjectId;
  name: string;                    // agentName (same as current)
  about: string;                   // objective (same as current)
  mode: ("text" | "audio")[];     // Keep for consistency
  tone: string;                    // Keep for consistency
  personality: string;             // Keep for consistency
  gender: "male" | "female";       // Keep for consistency
  status: "draft" | "active" | "archived"; // NEW: for deployment
  createdAt: Date;
  updatedAt: Date;
  deployedAt?: Date;               // NEW: deployment timestamp
}

// Intent Builder Section - Adapted from existing Section structure
export interface IntentBuilderSection {
  _id?: ObjectId;
  agentId: ObjectId;               // Reference to parent agent
  name: string;                    // Keep same as current
  about: string;                   // intro (same as current)
  order: number;                   // NEW: for ordering
  createdAt: Date;
  updatedAt: Date;
}

// Intent Builder Intent - Adapted from existing Intent structure
export interface IntentBuilderIntent {
  _id?: ObjectId;
  sectionId: ObjectId;             // Reference to parent section
  id: number;                      // Keep same as current
  intent: string;                  // question (same as current)
  isMandatory: boolean;            // Keep same as current
  fieldsToExtract: Field[];        // Array of fields to extract from response
  order: number;                   // NEW: for ordering
  createdAt: Date;
  updatedAt: Date;
}

// API Request/Response Types
export interface CreateAgentRequest {
  name: string;
  about: string;
  mode?: ("text" | "audio")[];
  tone?: string;
  personality?: string;
  gender?: "male" | "female";
}

export interface UpdateAgentRequest {
  name?: string;
  about?: string;
  mode?: ("text" | "audio")[];
  tone?: string;
  personality?: string;
  gender?: "male" | "female";
}

export interface CreateSectionRequest {
  name: string;
  about: string;
  order?: number;
}

export interface UpdateSectionRequest {
  name?: string;
  about?: string;
  order?: number;
}

export interface CreateIntentRequest {
  intent: string;
  fieldsToExtract: Field[];
  isMandatory: boolean;
  order?: number;
}

export interface UpdateIntentRequest {
  intent?: string;
  fieldsToExtract?: Field[];
  isMandatory?: boolean;
  order?: number;
}

// API Response Types
export interface AgentResponse {
  id: string;
  name: string;
  about: string;
  status: string;
  createdAt: Date;
}

export interface AgentListResponse {
  agents: AgentResponse[];
  total: number;
  page: number;
}

export interface DeployAgentResponse {
  agentId: string;
  status: string;
  deployedAt: Date;
  message: string;
}

export interface VoiceConfigResponse {
  agentId: string;
  name: string;
  about: string;
  sections: IntentBuilderSection[];
  status: string;
}

// Validation Types
export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiError {
  error: string;
  details?: string;
  timestamp: string;
} 