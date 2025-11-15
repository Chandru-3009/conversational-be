import { ObjectId } from "mongodb";
import { IIntentBuilderAgent } from "../models/IntentBuilderAgent";
import { IIntentBuilderSection } from "../models/IntentBuilderSection";
import { IIntentBuilderIntent } from "../models/IntentBuilderIntent";
import { Field } from "../types/index";

interface LegacyAgent {
  _id: {
    $oid: string;
  };
  name: string;
  about: string;
  mode: ("text" | "audio")[];
  sections: LegacySection[];
  createdAt: string;
  updatedAt: string;
}

interface LegacySection {
  id: number;
  name: string;
  about: string;
  guidelines?: string;
  introduction?: LegacyIntent[];
  intents: LegacyIntent[];
}

interface LegacyIntent {
  id: number;
  intent: string;
  isMandatory: boolean;
  retryLimit?: number;
  fieldsToExtract: LegacyField[] | null;
  context?: string;
}

interface LegacyField {
  name: string;
  type: "string" | "number" | "boolean" | "array";
  description: string;
  example: string | number | object;
  validation?: string;
}

export class AgentTransformationService {
  /**
   * Transform current agent format to legacy format
   */
  static transformToLegacyFormat(
    agent: IIntentBuilderAgent,
    sections: (IIntentBuilderSection & { intents: IIntentBuilderIntent[] })[]
  ): LegacyAgent {
    return {
      _id: {
        $oid: agent._id?.toString() || new ObjectId().toString()
      },
      name: agent.name,
      about: agent.about,
      mode: agent.mode,
      sections: sections.map((section, index) => this.transformSection(section, index + 1)),
      createdAt: agent.createdAt.toISOString(),
      updatedAt: agent.updatedAt.toISOString()
    };
  }

  /**
   * Transform section to legacy format
   */
  private static transformSection(
    section: IIntentBuilderSection & { intents: IIntentBuilderIntent[] },
    sectionId: number
  ): LegacySection {
    // Sort intents by order and id
    const sortedIntents = section.intents.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.id - b.id;
    });

    return {
      id: sectionId,
      name: this.generateSectionSlug(section.name),
      about: section.about,
      guidelines: "make it fun and engaging", // Default guideline
      intents: sortedIntents.map(intent => this.transformIntent(intent))
    };
  }

  /**
   * Transform intent to legacy format
   */
  private static transformIntent(intent: IIntentBuilderIntent): LegacyIntent {
    return {
      id: this.generateLegacyIntentId(intent.id, intent.sectionId.toString()),
      intent: intent.intent,
      isMandatory: intent.isMandatory,
      retryLimit: intent.isMandatory ? 3 : 2, // Default retry limits
      fieldsToExtract: this.transformFieldsToExtract(intent.fieldsToExtract)
    };
  }

  /**
   * Transform fields to legacy format
   */
  private static transformFieldsToExtract(fields: Field[]): LegacyField[] | null {
    if (!fields || fields.length === 0) return null;

    return fields.map(field => this.transformField(field));
  }

  /**
   * Transform individual field to legacy format
   */
  private static transformField(field: Field): LegacyField {
    // Handle special food items field transformation
    if (field.name === "food_items" || field.name === "items") {
      return {
        name: "items",
        type: "array",
        description: "List of food items consumed with quantities",
        example: [
          {
            name: "chicken pepperoni pizza",
            quantity: "3 slices"
          },
          {
            name: "salad", 
            quantity: "1 bowl"
          },
          {
            name: "coke",
            quantity: "1 can (350 ml)"
          }
        ],
        validation: field.validation
      };
    }

    // Parse example to correct type
    let parsedExample: string | number | object = field.example;
    try {
      if (field.type === "number") {
        parsedExample = parseFloat(field.example);
      } else if (field.type === "boolean") {
        parsedExample = field.example.toLowerCase() === "true" ? "true" : "false";
      } else if (field.example.startsWith("{") || field.example.startsWith("[")) {
        parsedExample = JSON.parse(field.example);
      }
    } catch (e) {
      // Keep original example if parsing fails
      parsedExample = field.example;
    }

    return {
      name: field.name,
      type: field.type === "boolean" ? "string" : field.type, // Convert boolean to string for legacy compatibility
      description: field.description,
      example: parsedExample,
      validation: field.validation
    };
  }

  /**
   * Generate section slug from name
   */
  private static generateSectionSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  }

  /**
   * Generate legacy intent ID based on section and intent
   */
  private static generateLegacyIntentId(intentId: number, sectionId: string): number {
    // Generate a unique ID based on section and intent
    // Using a simple formula: section_index * 1000 + intent_id
    const sectionHash = this.hashString(sectionId) % 10; // Get single digit from section ID
    return (sectionHash * 1000) + intentId;
  }

  /**
   * Simple hash function for string
   */
  private static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Validate transformed agent matches legacy format structure
   */
  static validateLegacyFormat(legacyAgent: LegacyAgent): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate required fields
    if (!legacyAgent._id || !legacyAgent._id.$oid) {
      errors.push("Missing required field: _id.$oid");
    }
    if (!legacyAgent.name) {
      errors.push("Missing required field: name");
    }
    if (!legacyAgent.about) {
      errors.push("Missing required field: about");
    }
    if (!Array.isArray(legacyAgent.mode)) {
      errors.push("Missing or invalid field: mode (must be array)");
    }
    if (!Array.isArray(legacyAgent.sections)) {
      errors.push("Missing or invalid field: sections (must be array)");
    }

    // Validate sections
    legacyAgent.sections?.forEach((section, index) => {
      if (typeof section.id !== "number") {
        errors.push(`Section ${index}: missing or invalid id`);
      }
      if (!section.name) {
        errors.push(`Section ${index}: missing name`);
      }
      if (!section.about) {
        errors.push(`Section ${index}: missing about`);
      }
      if (!Array.isArray(section.intents)) {
        errors.push(`Section ${index}: missing or invalid intents array`);
      }

      // Validate intents
      section.intents?.forEach((intent, intentIndex) => {
        if (typeof intent.id !== "number") {
          errors.push(`Section ${index}, Intent ${intentIndex}: missing or invalid id`);
        }
        if (!intent.intent) {
          errors.push(`Section ${index}, Intent ${intentIndex}: missing intent`);
        }
        if (typeof intent.isMandatory !== "boolean") {
          errors.push(`Section ${index}, Intent ${intentIndex}: missing or invalid isMandatory`);
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}