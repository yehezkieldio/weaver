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
 *
 * Note: Direct imports are used instead of barrel exports to improve performance.
 * Import specific functions from their respective modules:
 * - conversation-runner: runConversationScenario, runSimulatedUserTests
 * - evaluator: calculateConversationMetrics, evaluateCoherence, etc.
 * - personas: ALL_PERSONAS, NEW_STUDENT_PERSONA, etc.
 * - scenarios: ALL_SCENARIOS, PROGRAM_INFORMATION_SCENARIO, etc.
 * - types: ConversationMetrics, UserPersona, etc.
 * - user-simulator: generateUserMessage, evaluateFollowUpQuality, etc.
 */
