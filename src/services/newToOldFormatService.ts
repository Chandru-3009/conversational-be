type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
interface JsonObject { [key: string]: JsonValue }
interface JsonArray extends Array<JsonValue> {}

interface NewFormatAgent {
  _id?: { $oid: string } | string;
  id?: string;
  name?: string;
  about?: string;
  mode?: Array<"text" | "audio">;
  sections?: NewFormatSection[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

interface NewFormatSection {
  id?: string | number;
  name?: string;
  about?: string;
  guidelines?: string;
  introduction?: NewFormatIntent[];
  intents?: NewFormatIntent[];
}

interface NewFormatIntent {
  id?: string | number; // In builder it is often a Mongo ObjectId string
  intent?: string;
  isMandatory?: boolean;
  retryLimit?: number;
  context?: string;
  fieldsToExtract?: NewFormatField[] | null;
}

interface NewFormatField {
  name?: string | null;
  type?: string;
  description?: string;
  example?: any;
  validation?: string;
}

interface OldFormatAgent {
  id: string;
  name: string;
  about: string;
  mode: Array<"text" | "audio">;
  sections: OldFormatSection[];
  createdAt: string;
  updatedAt: string;
}

interface OldFormatSection {
  id: string | number;
  name: string;
  about: string;
  guidelines?: string;
  introduction?: OldFormatIntent[];
  intents: OldFormatIntent[];
}

interface OldFormatIntent {
  id: string | number;
  intent: string;
  isMandatory: boolean;
  retryLimit?: number;
  fieldsToExtract: OldFormatField[];
}

interface OldFormatField {
  name: string;
  type?: string;
  description?: string;
  example?: any;
  validation?: string;
}

export class NewToOldFormatService {
  static transform(agentInput: NewFormatAgent): OldFormatAgent {
    const id = this.extractId(agentInput);
    if (!id) throw new Error("Invalid agent payload: missing id/_id.$oid");

    const name = agentInput.name ?? "";
    const about = agentInput.about ?? "";
    const mode = Array.isArray(agentInput.mode) ? (agentInput.mode as Array<"text" | "audio">) : [];

    const sectionsInput = Array.isArray(agentInput.sections) ? agentInput.sections : [];
    const sections = sectionsInput.map(section => this.transformSection(section));

    return {
      id,
      name,
      about,
      mode,
      sections,
      createdAt: this.toIsoString(agentInput.createdAt),
      updatedAt: this.toIsoString(agentInput.updatedAt)
    };
  }

  private static transformSection(section: NewFormatSection): OldFormatSection {
    const sectionId: string | number = section.id ?? "";
    const name = section.name ?? "";
    const about = section.about ?? "";
    const guidelines = section.guidelines;

    const introIntentsRaw = Array.isArray(section.introduction) ? section.introduction : [];
    const intentsRaw = Array.isArray(section.intents) ? section.intents : [];

    const introduction = introIntentsRaw.map(i => this.transformIntent(i));

    // Build a set of IDs from introduction to dedupe from intents
    const introIds = new Set(
      introduction
        .map(i => i.id)
        .filter(id => id !== undefined && id !== null)
        .map(String)
    );

    // Filter intents that are not present in introduction by id
    const intents = intentsRaw
      .filter(i => !introIds.has(String(i.id)))
      .map(i => this.transformIntent(i));

    return {
      id: sectionId,
      name,
      about,
      guidelines,
      introduction,
      intents
    };
  }

  private static transformIntent(intent: NewFormatIntent): OldFormatIntent {
    // Clean fieldsToExtract: remove invalid names and dedupe by name
    const cleanedFields = this.cleanFields(intent.fieldsToExtract);

    return {
      id: intent.id ?? "",
      intent: intent.intent ?? "",
      isMandatory: Boolean(intent.isMandatory),
      retryLimit: typeof intent.retryLimit === "number" ? intent.retryLimit : undefined,
      // Explicitly exclude context field as per requirement
      fieldsToExtract: cleanedFields
    };
  }

  private static cleanFields(fields: NewFormatField[] | null | undefined): OldFormatField[] {
    if (!Array.isArray(fields) || fields.length === 0) return [];

    const seen = new Set<string>();
    const result: OldFormatField[] = [];

    for (const f of fields) {
      const rawName = (f?.name ?? "").toString();
      const name = rawName.trim();
      if (!name || name.toLowerCase() === "null") continue; // drop invalid entries
      if (seen.has(name)) continue; // dedupe by name
      seen.add(name);
      result.push({
        name,
        type: f?.type,
        description: f?.description,
        example: f?.example,
        validation: f?.validation
      });
    }
    return result;
  }

  private static extractId(agent: NewFormatAgent): string | null {
    if (typeof agent.id === "string" && agent.id) return agent.id;
    const possible = agent._id as any;
    if (possible && typeof possible === "object" && typeof possible.$oid === "string") {
      return possible.$oid;
    }
    if (typeof agent._id === "string") return agent._id;
    return null;
  }

  private static toIsoString(dateLike: string | Date | undefined): string {
    if (!dateLike) return new Date().toISOString();
    try {
      if (dateLike instanceof Date) return dateLike.toISOString();
      const d = new Date(dateLike);
      if (isNaN(d.getTime())) return new Date().toISOString();
      return d.toISOString();
    } catch {
      return new Date().toISOString();
    }
  }
}


