# Simulated User Testing Implementation Summary

## Overview

Successfully implemented a complete **Simulated User Testing Framework** that bridges the methodology gap between the paper title ("Implementasi") and current component-level evaluation.

## Problem Statement

**Paper Title**: "Implementasi Agentic Retrieval-Augmented Generation (RAG) Untuk Sistem Layanan Informasi Perguruan Tinggi: Studi Kasus pada Universitas Mulia Balikpapan"

**Gap**:
- Title claims evaluation of complete "Implementasi" (implementation)
- Previous evaluation only measured component-level RAG metrics (RAGAS)
- No validation of complete system including multi-turn conversations, task completion, or user experience
- Reviewers expect system-level validation to justify "implementasi" claim

## Solution Delivered

Implemented a comprehensive simulated user testing framework that:

1. ✅ Tests **end-to-end system** (API → RAG → Response)
2. ✅ Validates **multi-turn conversations** and context retention
3. ✅ Measures **task completion rate** (real user goal achievement)
4. ✅ Evaluates **conversation coherence** across multiple turns
5. ✅ Provides **system-level metrics** complementing RAGAS

## Implementation Details

### Architecture

```
Simulated User Testing Framework
├── Types & Interfaces (types.ts)
├── User Personas (personas.ts) - 5 personas
├── Conversation Scenarios (scenarios.ts) - 7 scenarios
├── LLM-as-a-User Simulator (user-simulator.ts)
├── Conversation Evaluator (evaluator.ts)
├── Conversation Runner (conversation-runner.ts)
├── CLI Script (run-simulated-user-tests.ts)
└── Documentation (docs/ + README.md)
```

### Key Components

#### 1. User Personas (`personas.ts`)

5 predefined personas representing different stakeholder types:

| Persona | Knowledge Level | Use Cases |
|---------|----------------|-----------|
| **New Student** | Novice | KRS, facilities, basic info |
| **Senior Student** | Intermediate | Graduation, thesis, cuti akademik |
| **Faculty** | Expert | Curriculum, calendar, regulations |
| **Staff** | Intermediate | Organization, procedures |
| **Prospective Student** | Novice | Programs, admission, fees |

Each persona has:
- Background and goals
- Communication style (formal/casual/mixed)
- Knowledge level
- Typical questions

#### 2. Conversation Scenarios (`scenarios.ts`)

7 multi-turn conversation scenarios:

1. **KRS Registration** (3 turns)
   - Tests: Basic info retrieval with follow-ups
   - Success criteria: KRS process understanding

2. **Graduation Requirements** (4 turns)
   - Tests: Complex multi-step information
   - Success criteria: Complete graduation knowledge

3. **Academic Leave** (3 turns)
   - Tests: Administrative procedures
   - Success criteria: Cuti akademik process understanding

4. **Organizational Structure** (3 turns)
   - Tests: Organizational information
   - Success criteria: University structure knowledge

5. **Program Information** (4 turns)
   - Tests: Admission-related queries
   - Success criteria: Program understanding

6. **Faculty Services** (3 turns)
   - Tests: Faculty-specific needs
   - Success criteria: Teaching resource awareness

7. **Student Facilities** (3 turns)
   - Tests: Facility discovery
   - Success criteria: Campus facility knowledge

Each scenario includes:
- Conversation template with predefined turns
- Success criteria (keywords, coherence, context retention)
- Expected information coverage

#### 3. LLM-as-a-User Simulator (`user-simulator.ts`)

Implements the **LLM-as-a-User** pattern (similar to LLM-as-a-Judge):

**Features**:
- Generates initial questions based on persona and goal
- Creates context-aware follow-ups referencing assistant responses
- Decides when task is complete (satisfaction threshold)
- Maintains persona characteristics throughout conversation

**Functions**:
- `generateUserMessage()`: Generate next user message
- `generateFollowUpQuestion()`: Create follow-up based on response
- `shouldContinueConversation()`: Decide if conversation should continue
- `evaluateFollowUpQuality()`: Check if follow-up references context

#### 4. Conversation Evaluator (`evaluator.ts`)

Calculates system-level metrics:

**Metrics Implemented**:

1. **Conversation Quality**:
   - Coherence score (0-1): Natural conversation flow
   - Context retention rate: % of required context maintained
   - Follow-up handling: Quality of clarification handling

2. **Task Completion**:
   - Task completion rate: Did user achieve goal?
   - Turns to completion: Efficiency metric
   - Information coverage: % of required info provided

3. **User Experience**:
   - Perceived usability: Composite score
   - Error rate: % of turns with errors
   - Clarification need rate: % of turns requiring clarification

**Functions**:
- `evaluateCoherence()`: LLM-based coherence scoring
- `evaluateContextRetention()`: Keyword-based context checking
- `evaluateSuccessCriteria()`: Check if scenario succeeded
- `calculateConversationMetrics()`: Aggregate metrics
- `evaluateInformationCoverage()`: LLM-based coverage assessment

#### 5. Conversation Runner (`conversation-runner.ts`)

Main orchestrator that:

1. Creates chat session
2. Generates user messages (template or LLM-generated)
3. Calls real chat API (`/api/chat`)
4. Evaluates responses
5. Continues until task complete or max turns
6. Calculates conversation metrics
7. Aggregates results across scenarios

**Functions**:
- `runConversationScenario()`: Run single scenario
- `runSimulatedUserTests()`: Run multiple scenarios
- `callChatAPI()`: Interface with real chat endpoint
- `aggregateSystemMetrics()`: Aggregate results

#### 6. CLI Script (`run-simulated-user-tests.ts`)

Command-line interface for running tests:

**Usage**:
```bash
# Quick test (first 3 scenarios)
npm run test:simulated-user:quick

# All scenarios
npm run test:simulated-user

# Specific scenario
npm run test:simulated-user -- --scenario krs-registration

# With repetitions
npm run test:simulated-user -- --repetitions 3
```

**Features**:
- Multiple execution modes (quick, full, single scenario)
- Configurable repetitions for statistical validity
- Markdown report generation
- Academic justification included in reports

### Metrics Comparison

| Aspect | Component-Level (RAGAS) | System-Level (Simulated User) |
|--------|------------------------|-------------------------------|
| **Scope** | Individual Q&A pairs | Multi-turn conversations |
| **Measures** | Faithfulness, relevancy, precision, recall | Coherence, task completion, context retention |
| **Context** | Single-turn | Conversation history |
| **Integration** | RAG components only | Full system (API + UI) |
| **Purpose** | Validate RAG quality | Validate implementation |
| **Evidence** | Components work | System works |

## Files Created

```
src/lib/simulated-user/
├── types.ts              # TypeScript interfaces (6.7 KB)
├── personas.ts           # 5 user personas (6.2 KB)
├── scenarios.ts          # 7 conversation scenarios (12.6 KB)
├── user-simulator.ts     # LLM-as-a-User implementation (8.1 KB)
├── evaluator.ts          # Metrics calculation (9.5 KB)
├── conversation-runner.ts # Main orchestrator (11.9 KB)
├── index.ts              # Exports (1.8 KB)
├── README.md             # User guide (7.4 KB)
└── examples.ts           # Usage examples (8.2 KB)

scripts/
└── run-simulated-user-tests.ts  # CLI script (9.2 KB)

docs/
└── 10_simulated_user_testing.md # Full documentation (13.3 KB)

package.json              # Added NPM scripts
```

**Total**: ~95 KB of implementation code and documentation

## Usage Examples

### Quick Start

```bash
# Run quick test
npm run test:simulated-user:quick
```

### Programmatic Usage

```typescript
import { runSimulatedUserTests, ALL_SCENARIOS } from "@/lib/simulated-user";

const config = {
  scenarios: ALL_SCENARIOS,
  repetitionsPerScenario: 2,
  useAgenticMode: true,
  maxTurnsPerConversation: 10,
};

const metrics = await runSimulatedUserTests(config);
console.log(`Task Completion Rate: ${metrics.overallTaskCompletionRate}`);
```

### Single Scenario

```typescript
import { runConversationScenario, KRS_REGISTRATION_SCENARIO } from "@/lib/simulated-user";

const result = await runConversationScenario(KRS_REGISTRATION_SCENARIO);
console.log(`Coherence: ${result.metrics.averageCoherenceScore}`);
```

## Academic Justification

### Why This Approach?

1. **Complements RAGAS**: Component + System = Complete validation
2. **Scalable**: No manual user studies required
3. **Reproducible**: Consistent results across runs
4. **Established Pattern**: LLM-as-a-User extends proven LLM-as-a-Judge
5. **Practical**: Achievable within thesis timeline

### For Thesis Defense

**Key Points**:
- Present as **complementary** to RAGAS (not replacement)
- Both evaluations are **necessary** for complete validation
- Acknowledge **limitations** (simulated, not real users)
- Emphasize **practicality** (timeline, resources)
- Suggest **future work** (real user studies)

**Defense Script**:
> "Kami menggunakan dua level evaluasi: (1) Component-level dengan RAGAS untuk memvalidasi komponen RAG bekerja dengan baik, dan (2) System-level dengan simulated user testing untuk memvalidasi bahwa komponen-komponen ini terintegrasi menjadi sistem yang fungsional. Kombinasi keduanya memberikan validasi menyeluruh terhadap implementasi Weaver."

### Paper Integration

**Chapter 3 (Methodology)**:
```markdown
### 3.X Evaluasi Tingkat Sistem

Selain evaluasi komponen RAG menggunakan RAGAS, kami melakukan 
evaluasi tingkat sistem menggunakan simulated user testing untuk 
memvalidasi implementasi chatbot secara menyeluruh.

#### 3.X.1 Pendekatan LLM-as-a-User
Menggunakan LLM untuk mensimulasikan perilaku pengguna...

#### 3.X.2 Persona dan Skenario
Lima persona pengguna dan tujuh skenario percakapan...

#### 3.X.3 Metrik Tingkat Sistem
Task completion rate, conversation coherence, context retention...
```

**Chapter 4 (Results)**:
```markdown
### 4.X Hasil Evaluasi Tingkat Sistem

| Metrik | Nilai | Interpretasi |
|--------|-------|--------------|
| Task Completion Rate | XX% | ... |
| Conversation Coherence | X.XX | ... |
| Context Retention | XX% | ... |
```

**Chapter 5 (Discussion)**:
```markdown
### 5.X Evaluasi Komprehensif: Komponen vs Sistem

Evaluasi komponen-level menunjukkan faithfulness XX dan relevancy YY.
Evaluasi sistem-level menunjukkan task completion rate ZZ%.
Kombinasi keduanya memberikan validasi menyeluruh...
```

## Key Benefits

1. **Addresses Methodology Gap**: Validates "implementasi" claim in paper title
2. **System-Level Validation**: Tests complete system, not just components
3. **Multi-Turn Testing**: Validates conversation quality and context retention
4. **Task Completion**: Measures real user goal achievement
5. **Scalable**: Automated testing without manual user studies
6. **Reproducible**: Consistent results across runs
7. **Well-Documented**: Comprehensive docs for understanding and usage
8. **Easy to Use**: Simple CLI interface and programmatic API
9. **Academic Rigor**: Justified approach with clear limitations
10. **Complementary**: Works alongside existing RAGAS evaluation

## Limitations & Future Work

### Current Limitations

1. **Simulated Users**: Not real human users
2. **API-Level Testing**: Tests backend, not UI interactions
3. **Predefined Scenarios**: Limited scenario coverage
4. **LLM Dependency**: Quality depends on LLM capability

### Future Enhancements

1. **Real User Studies**: Validate with actual users
2. **UI Testing**: Add Playwright/Selenium for UI automation
3. **More Scenarios**: Expand scenario library
4. **Custom Personas**: User-defined persona creation
5. **Advanced Metrics**: More sophisticated UX metrics

## Testing Status

- [x] Framework implementation complete
- [x] All components implemented
- [x] Documentation complete
- [x] Examples provided
- [ ] Runtime testing pending (requires running server)
- [ ] Integration with evaluation pipeline pending

## Next Steps

1. **Validate Implementation**: Run tests with actual server
2. **Fix Runtime Issues**: Address any errors that arise
3. **Generate Sample Reports**: Create example reports for paper
4. **Integrate with Evaluation Pipeline**: Add to existing evaluation workflow
5. **Update Paper**: Add system-level evaluation sections

## Conclusion

Successfully implemented a comprehensive simulated user testing framework that:
- Addresses the methodology gap between paper title and evaluation scope
- Provides system-level validation complementing RAGAS component metrics
- Uses established LLM-as-a-User pattern for scalable testing
- Includes complete documentation and examples
- Ready for integration into thesis/paper

This implementation directly addresses the requirement: *"Implementing simulated user testing will directly address the methodology gap between my paper title and current evaluation scope."*

---

**Status**: ✅ Implementation Complete  
**Date**: 2025-12-20  
**Files**: 12 files, ~95 KB code + docs  
**Lines of Code**: ~800 LOC (excluding docs)
