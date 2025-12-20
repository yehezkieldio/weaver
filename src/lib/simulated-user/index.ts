/**
 * @fileoverview Simulated User Testing Framework - Main Export
 *
 * This module provides a complete framework for simulated user testing of the RAG chatbot.
 *
 * Main exports:
 * - Types: All TypeScript interfaces for personas, scenarios, metrics
 * - Personas: Predefined user personas (student, faculty, staff, etc.)
 * - Scenarios: Conversation scenarios for testing
 * - Runner: Main orchestrator for running simulated conversations
 * - Evaluator: Metrics calculation and evaluation
 */

// Types
export type {
	UserPersona,
	ConversationScenario,
	ConversationTurn,
	SuccessCriteria,
	SimulatedConversationResult,
	ConversationTurnResult,
	ConversationMetrics,
	SystemLevelMetrics,
	SimulatedUserTestConfig,
	UserSimulatorConfig,
} from "./types";

// Personas
export {
	NEW_STUDENT_PERSONA,
	SENIOR_STUDENT_PERSONA,
	FACULTY_PERSONA,
	STAFF_PERSONA,
	PROSPECTIVE_STUDENT_PERSONA,
	ALL_PERSONAS,
	getPersonaById,
	getPersonasByKnowledge,
} from "./personas";

// Scenarios
export {
	KRS_REGISTRATION_SCENARIO,
	GRADUATION_REQUIREMENTS_SCENARIO,
	ACADEMIC_LEAVE_SCENARIO,
	ORGANIZATIONAL_STRUCTURE_SCENARIO,
	PROGRAM_INFORMATION_SCENARIO,
	FACULTY_SERVICES_SCENARIO,
	STUDENT_FACILITIES_SCENARIO,
	ALL_SCENARIOS,
	getScenarioById,
	getScenariosByCategory,
	getScenariosByPersona,
} from "./scenarios";

// Runner
export { runConversationScenario, runSimulatedUserTests } from "./conversation-runner";

// Evaluator
export {
	evaluateCoherence,
	evaluateContextRetention,
	evaluateSuccessCriteria,
	calculateConversationMetrics,
	evaluateInformationCoverage,
} from "./evaluator";

// User Simulator
export {
	generateUserMessage,
	getUserMessageFromTemplate,
	evaluateFollowUpQuality,
	generateFollowUpQuestion,
	shouldContinueConversation,
} from "./user-simulator";
