import { IntentBuilderAgentModel } from "../models/IntentBuilderAgent";
import { CompleteIntentBuilderAgentModel } from "../models/CompleteIntentBuilderAgent";
import { NewToOldFormatService } from "./newToOldFormatService";

export class CompiledAgentService {
  static async compileAndUpsert(agentId: string) {
    const completeAgent = await IntentBuilderAgentModel.getCompleteAgentForFrontend(agentId);
    if (!completeAgent) throw new Error("Agent not found for compilation");

    const transformed = NewToOldFormatService.transform(completeAgent as any);

    return await CompleteIntentBuilderAgentModel.upsert(
      (completeAgent as any)._id?.$oid || (completeAgent as any)._id || agentId,
      transformed as any,
      transformed.name
    );
  }

  static async findCompiled(agentId: string) {
    return await CompleteIntentBuilderAgentModel.findByAgentId(agentId);
  }

  static async deleteCompiled(agentId: string) {
    return await CompleteIntentBuilderAgentModel.deleteByAgentId(agentId);
  }
}


