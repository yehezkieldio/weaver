/**
 * @fileoverview LLM-as-a-User Simulator
 *
 * WHY LLM-as-a-User:
 * - Similar to LLM-as-a-Judge pattern used in RAGAS evaluation
 * - Enables scalable, automated user simulation
 * - Generates realistic, context-aware user messages
 * - Simulates different personas with distinct communication styles
 * - Can generate follow-up questions based on assistant responses
 *
 * This approach allows testing multi-turn conversations without manual scripting
 * of every possible conversation path, while maintaining persona consistency.
 */

import { generateText } from "ai";
import { JUDGE_MODEL } from "@/lib/ai";
import type { ConversationTurn, UserPersona, UserSimulatorConfig } from "./types";

/**
 * Generate a user message based on persona, goal, and conversation history
 *
 * Uses LLM to simulate realistic user behavior:
 * - Maintains persona characteristics (knowledge level, style)
 * - Follows conversation context
 * - Generates natural follow-up questions
 * - Decides when task is complete
 */
export async function generateUserMessage(config: UserSimulatorConfig): Promise<{
	message: string;
	taskComplete: boolean;
	reasoning: string;
}> {
	const {
		persona,
		conversationHistory,
		currentGoal,
		satisfactionThreshold = 0.8,
		temperature = 0.7,
	} = config;

	// Build conversation history string
	const historyText = conversationHistory
		.map((turn) => `${turn.role === "user" ? "User" : "Assistant"}: ${turn.content}`)
		.join("\n");

	const prompt = `You are simulating a user with the following characteristics:

**Persona**: ${persona.name}
**Background**: ${persona.background}
**Knowledge Level**: ${persona.knowledgeLevel}
**Communication Style**: ${persona.communicationStyle}
**Language**: ${persona.language}

**Current Goal**: ${currentGoal}

**Conversation History**:
${historyText || "(No history yet - this is the first message)"}

**Task**: Generate the next user message in this conversation.

**Instructions**:
1. Stay in character - use the communication style and knowledge level of this persona
2. If this is the first message, ask an initial question related to the goal
3. If there's conversation history:
   - Consider what the assistant said
   - Generate a relevant follow-up question OR clarification
   - Reference previous context naturally (e.g., "Okay, you mentioned X earlier...")
4. Decide if the goal has been sufficiently achieved
5. Use ${persona.language === "id" ? "Indonesian (Bahasa Indonesia)" : "English"} language
6. Keep messages concise and natural (1-3 sentences)

**Output Format** (JSON):
{
  "message": "The user's message in ${persona.language === "id" ? "Indonesian" : "English"}",
  "taskComplete": true/false,
  "reasoning": "Why you generated this message or why the task is/isn't complete",
  "satisfactionLevel": 0.0 to 1.0 (how satisfied the user is with information received)
}

Generate the response:`;

	try {
		const { text } = await generateText({
			model: JUDGE_MODEL,
			temperature,
			prompt,
		});

		// Parse JSON response
		const jsonMatch = text.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			throw new Error("Failed to parse JSON from LLM response");
		}

		const parsed = JSON.parse(jsonMatch[0]);
		const satisfactionLevel = parsed.satisfactionLevel || 0;

		return {
			message: parsed.message || "",
			taskComplete: parsed.taskComplete || satisfactionLevel >= satisfactionThreshold,
			reasoning: parsed.reasoning || "",
		};
	} catch (error) {
		console.error("Error generating user message:", error);
		// Fallback: generate a simple clarification question
		return {
			message:
				persona.language === "id"
					? "Bisakah Anda menjelaskan lebih lanjut?"
					: "Could you explain further?",
			taskComplete: false,
			reasoning: "Error occurred, generated fallback message",
		};
	}
}

/**
 * Generate initial user message from a conversation template turn
 */
export function getUserMessageFromTemplate(turn: ConversationTurn): string {
	return turn.userMessage;
}

/**
 * Evaluate if a user message is a follow-up based on context
 */
export async function evaluateFollowUpQuality(
	userMessage: string,
	previousContext: string[],
	requiredContext: string[],
): Promise<{
	isProperFollowUp: boolean;
	contextRetained: boolean;
	missingContext: string[];
}> {
	// Simple keyword-based check (can be enhanced with LLM)
	const messageLower = userMessage.toLowerCase();

	const retainedContext = requiredContext.filter((ctx) => messageLower.includes(ctx.toLowerCase()));

	const contextRetained = retainedContext.length >= Math.ceil(requiredContext.length * 0.5);

	const missingContext = requiredContext.filter((ctx) => !retainedContext.includes(ctx));

	// Check if message references previous conversation
	const followUpIndicators = [
		"tadi",
		"sebelumnya",
		"yang",
		"itu",
		"tersebut",
		"earlier",
		"previously",
		"that",
		"mentioned",
	];
	const hasFollowUpIndicator = followUpIndicators.some((indicator) =>
		messageLower.includes(indicator),
	);

	return {
		isProperFollowUp: hasFollowUpIndicator || contextRetained,
		contextRetained,
		missingContext,
	};
}

/**
 * Generate a follow-up question based on assistant's response
 */
export async function generateFollowUpQuestion(
	assistantResponse: string,
	persona: UserPersona,
	currentGoal: string,
	conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<string> {
	const prompt = `You are ${persona.name} (${persona.description}).
Your goal: ${currentGoal}

The assistant just said:
"${assistantResponse}"

Generate a natural follow-up question in ${persona.language === "id" ? "Indonesian" : "English"} that:
1. References something from the assistant's response
2. Helps achieve your goal
3. Uses ${persona.communicationStyle} communication style
4. Is appropriate for ${persona.knowledgeLevel} knowledge level

Just output the follow-up question, nothing else.`;

	try {
		const { text } = await generateText({
			model: JUDGE_MODEL,
			temperature: 0.7,
			prompt,
		});

		return text.trim();
	} catch (error) {
		console.error("Error generating follow-up:", error);
		// Fallback
		return persona.language === "id"
			? "Bisakah Anda memberikan informasi lebih detail?"
			: "Could you provide more details?";
	}
}

/**
 * Decide if user should continue conversation or end it
 */
export async function shouldContinueConversation(
	conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
	goal: string,
	maxTurns: number,
): Promise<{
	shouldContinue: boolean;
	reason: string;
	goalAchievement: number; // 0-1
}> {
	if (conversationHistory.length >= maxTurns * 2) {
		return {
			shouldContinue: false,
			reason: "Maximum turns reached",
			goalAchievement: 0.5,
		};
	}

	const historyText = conversationHistory
		.map((turn) => `${turn.role === "user" ? "User" : "Assistant"}: ${turn.content}`)
		.join("\n");

	const prompt = `Evaluate if the following conversation has achieved its goal.

**Goal**: ${goal}

**Conversation**:
${historyText}

**Question**: Has the user's goal been sufficiently achieved? 

Consider:
- Has the user received the information they needed?
- Are there obvious gaps in the information provided?
- Would a typical user be satisfied at this point?

**Output Format** (JSON):
{
  "goalAchieved": true/false,
  "goalAchievementScore": 0.0 to 1.0,
  "reason": "Brief explanation"
}`;

	try {
		const { text } = await generateText({
			model: JUDGE_MODEL,
			temperature: 0.3,
			prompt,
		});

		const jsonMatch = text.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			throw new Error("Failed to parse JSON");
		}

		const parsed = JSON.parse(jsonMatch[0]);

		return {
			shouldContinue: !parsed.goalAchieved,
			reason: parsed.reason || "",
			goalAchievement: parsed.goalAchievementScore || 0,
		};
	} catch (error) {
		console.error("Error evaluating conversation completion:", error);
		// Default to continuing if we can't evaluate
		return {
			shouldContinue: conversationHistory.length < maxTurns,
			reason: "Error evaluating, using turn count",
			goalAchievement: 0.5,
		};
	}
}
