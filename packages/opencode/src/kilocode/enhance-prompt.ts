// kilocode_change - new file
import { Provider } from "@/provider/provider"
import { LLM } from "@/session/llm"
import { Agent } from "@/agent/agent"
import { Log } from "@/util/log"

const log = Log.create({ service: "enhance-prompt" })

const DEFAULT_TEMPLATE = `Generate an enhanced version of this prompt (reply with only the enhanced prompt - no conversation, explanations, lead-in, bullet points, placeholders, or surrounding quotes):

\${userInput}`

export function buildMessages(text: string, template?: string) {
  const prompt = (template ?? DEFAULT_TEMPLATE).replace("${userInput}", text)
  return [{ role: "user" as const, content: prompt }]
}

export function clean(text: string) {
  let result = text.trim()
  if (result.startsWith("```")) {
    const first = result.indexOf("\n")
    if (first !== -1) result = result.slice(first + 1)
  }
  if (result.endsWith("```")) result = result.slice(0, -3)
  result = result.trim()
  if ((result.startsWith('"') && result.endsWith('"')) || (result.startsWith("'") && result.endsWith("'"))) {
    result = result.slice(1, -1)
  }
  return result.trim()
}

export async function enhancePrompt(text: string, template?: string): Promise<string> {
  log.info("enhancing", { length: text.length })

  const defaultModel = await Provider.defaultModel()
  const model =
    (await Provider.getSmallModel(defaultModel.providerID)) ??
    (await Provider.getModel(defaultModel.providerID, defaultModel.modelID))

  const agent: Agent.Info = {
    name: "enhance-prompt",
    mode: "primary",
    hidden: true,
    options: {},
    permission: [],
    prompt: "",
    temperature: 0.7,
  }

  const stream = await LLM.stream({
    agent,
    user: {
      id: "enhance-prompt",
      sessionID: "enhance-prompt",
      role: "user",
      model: {
        providerID: model.providerID,
        modelID: model.id,
      },
      time: {
        created: Date.now(),
        completed: Date.now(),
      },
    } as any,
    tools: {},
    model,
    small: true,
    messages: buildMessages(text, template),
    abort: new AbortController().signal,
    sessionID: "enhance-prompt",
    system: [],
    retries: 3,
  })

  const result = await stream.text
  log.info("enhanced", { length: result.length })

  return clean(result)
}
