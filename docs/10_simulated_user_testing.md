# Simulated User Testing Framework

## Overview

The Simulated User Testing Framework provides **system-level evaluation** of the MuliaChat RAG chatbot, complementing existing component-level RAGAS metrics. This addresses the methodology gap between the paper title ("Implementasi") and the evaluation scope.

## Why Simulated User Testing?

### The Methodology Gap

**Paper Title**: *Implementasi Agentic Retrieval-Augmented Generation (RAG) Untuk Sistem Layanan Informasi Perguruan Tinggi: Studi Kasus pada Universitas Mulia Balikpapan*

**Gap Identified**:
- Title claims **"Implementasi"** (implementation/deployment)
- Previous evaluation only measured **component-level RAG metrics** (RAGAS)
- No validation of **complete system** including conversation flow, multi-turn coherence, task completion
- Reviewers expect **system-level validation** to justify "implementasi" claim

### Solution: Simulated User Testing

This framework:
1. ✅ Tests **end-to-end system**: User query → API → RAG Pipeline → Response
2. ✅ Validates **multi-turn conversations** and context retention
3. ✅ Measures **task completion rate** (real user goal achievement)
4. ✅ Evaluates **conversation coherence** across multiple turns
5. ✅ Provides **system-level metrics** that complement RAGAS

## Architecture

### LLM-as-a-User Approach

Similar to the existing **LLM-as-a-Judge** pattern used in RAGAS evaluation:
- **LLM-as-a-Judge**: Evaluates response quality (faithfulness, relevancy)
- **LLM-as-a-User**: Generates realistic user behavior and messages

Benefits:
- Scalable and reproducible
- No manual scripting of every conversation path
- Maintains persona consistency
- Generates context-aware follow-up questions

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                 Simulated User Testing Framework             │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼──────────────────────┐
        ▼                     ▼                      ▼
   ┌─────────┐          ┌──────────┐          ┌──────────┐
   │ Personas│          │Scenarios │          │ Runner   │
   └─────────┘          └──────────┘          └──────────┘
        │                     │                      │
        │                     ▼                      │
        │              ┌──────────────┐              │
        └──────────────► User         ◄──────────────┘
                       │ Simulator    │
                       └──────────────┘
                              │
                              ▼
                       ┌──────────────┐
                       │ Chat API     │
                       │ (Real System)│
                       └──────────────┘
                              │
                              ▼
                       ┌──────────────┐
                       │ Evaluator    │
                       │ (Metrics)    │
                       └──────────────┘
```

### 1. User Personas (`personas.ts`)

Predefined user types based on corpus content:
- **New Student**: Novice, needs basic info (KRS, facilities)
- **Senior Student**: Intermediate, graduating (thesis, yudisium)
- **Faculty**: Expert, teaching needs (curriculum, calendar)
- **Staff**: Administrative info (organizational structure)
- **Prospective Student**: Pre-enrollment (programs, admission)

Each persona has:
- Knowledge level (novice/intermediate/expert)
- Communication style (formal/casual/mixed)
- Typical goals and questions

### 2. Conversation Scenarios (`scenarios.ts`)

Realistic multi-turn conversations:
- **KRS Registration**: New student learns about KRS and SKS limits
- **Graduation Requirements**: Senior student prepares for graduation
- **Academic Leave**: Student inquires about cuti akademik
- **Organizational Structure**: Staff learns about university units
- **Program Information**: Prospective student explores programs
- **Faculty Services**: Faculty member seeks teaching resources
- **Student Facilities**: New student discovers campus facilities

Each scenario includes:
- Conversation template (predefined turns)
- Success criteria (keywords, context retention, coherence)
- Expected information coverage

### 3. User Simulator (`user-simulator.ts`)

LLM-powered user message generation:
- Generates initial questions based on persona and goal
- Creates context-aware follow-ups referencing assistant responses
- Decides when task is complete (satisfaction threshold)
- Maintains persona characteristics throughout conversation

### 4. Conversation Runner (`conversation-runner.ts`)

Main orchestrator:
1. Creates chat session
2. Generates user message (template or LLM-generated)
3. Calls real chat API
4. Evaluates response (coherence, context retention)
5. Continues until task complete or max turns
6. Calculates conversation metrics

### 5. Evaluator (`evaluator.ts`)

Calculates system-level metrics:

**Conversation Quality**:
- Coherence score (0-1): Natural conversation flow
- Context retention rate: % of required context maintained
- Follow-up handling: How well system handles clarifications

**Task Completion**:
- Task completion rate: Did user achieve goal?
- Turns to completion: Efficiency metric
- Information coverage: % of required info provided

**User Experience**:
- Perceived usability: Composite score (coherence + latency + errors)
- Error rate: % of turns with errors
- Clarification need rate: % of turns requiring clarification

## Usage

### Quick Start

```bash
# Run all scenarios (quick mode - first 3)
bun test:simulated-user:quick

# Run all scenarios
bun test:simulated-user

# Run specific scenario
bun test:simulated-user --scenario krs-registration

# Run with multiple repetitions for statistical validity
bun test:simulated-user --repetitions 3

# Run without agentic mode
bun test:simulated-user --no-agentic
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
console.log(`Average Coherence: ${metrics.averageCoherenceScore}`);
console.log(`Average Latency: ${metrics.averageLatencyMs}ms`);
```

### Running Single Scenario

```typescript
import { runConversationScenario, KRS_REGISTRATION_SCENARIO } from "@/lib/simulated-user";

const result = await runConversationScenario(KRS_REGISTRATION_SCENARIO, {
  useAgenticMode: true,
  maxTurns: 10,
  useTemplate: true,
});

console.log(`Task Completed: ${result.taskCompleted}`);
console.log(`Coherence: ${result.metrics.averageCoherenceScore}`);
console.log(`Context Retention: ${result.metrics.contextRetentionRate}`);
```

## Metrics Explained

### System-Level vs Component-Level

| Aspect | Component-Level (RAGAS) | System-Level (Simulated User) |
|--------|-------------------------|-------------------------------|
| **What** | Individual Q&A pairs | Complete conversations |
| **Measures** | Faithfulness, relevancy | Coherence, task completion |
| **Context** | Single-turn | Multi-turn |
| **Integration** | RAG components only | Full system (API + UI) |
| **Purpose** | Validate RAG quality | Validate implementation |

### Key Metrics

#### 1. Task Completion Rate
- **Definition**: % of conversations where user achieved their goal
- **Good**: > 80%
- **Acceptable**: 60-80%
- **Poor**: < 60%

#### 2. Conversation Coherence
- **Definition**: How well responses connect to context
- **Range**: 0.0 - 1.0
- **Good**: > 0.8
- **Acceptable**: 0.6-0.8
- **Poor**: < 0.6

#### 3. Context Retention Rate
- **Definition**: % of required context maintained across turns
- **Range**: 0-100%
- **Good**: > 80%
- **Acceptable**: 60-80%
- **Poor**: < 60%

#### 4. Information Coverage Rate
- **Definition**: % of required information provided
- **Range**: 0-100%
- **Good**: > 80%
- **Acceptable**: 60-80%
- **Poor**: < 60%

#### 5. Latency Metrics
- **Average Latency**: Mean response time
  - Excellent: < 2000ms
  - Acceptable: 2000-4000ms
  - Poor: > 4000ms
- **P95 Latency**: 95th percentile response time
- **P99 Latency**: 99th percentile response time

## Academic Justification

### Addressing the Methodology Gap

This simulated user testing directly addresses reviewer concerns:

1. **"Implementasi" Validation**: Tests complete system, not just components
2. **Conversation Quality**: Measures multi-turn coherence (not in RAGAS)
3. **Task Completion**: Validates real user goal achievement
4. **System Integration**: Tests API, session management, context retention

### Research Precedents

**LLM-as-a-Judge Pattern**:
- RAGAS framework (Shahul et al., 2023): Uses LLM to evaluate responses
- Established in academic literature
- Proven correlation with human judgments

**LLM-as-a-User Extension**:
- Natural extension of LLM-as-a-Judge
- Generates realistic user behavior
- Scalable alternative to human user studies
- Reproducible and controllable

### Complementary Evaluation

**Both evaluations are necessary**:

1. **Component-Level (RAGAS)**:
   - Validates RAG components work correctly
   - Measures: faithfulness, relevancy, precision, recall
   - Evidence: RAG architecture is sound

2. **System-Level (Simulated User)**:
   - Validates components integrate properly
   - Measures: coherence, task completion, UX
   - Evidence: Implementation is functional

3. **Together**:
   - Complete validation of "implementasi"
   - Defensible in academic review
   - Addresses title-evaluation alignment

## Limitations and Future Work

### Current Limitations

1. **No Real Users**: Simulated behavior, not actual user studies
2. **API-Level Testing**: Tests backend, not UI interactions
3. **Predefined Scenarios**: Limited scenario coverage
4. **LLM Dependency**: Quality depends on LLM capability

### Future Enhancements

1. **Human User Studies**: Validate simulated results with real users
2. **UI Testing**: Add Playwright/Selenium for UI automation
3. **More Scenarios**: Expand scenario library
4. **Custom Personas**: Allow user-defined personas
5. **Advanced Metrics**: Add more sophisticated UX metrics

### Academic Position

For thesis defense:
- Present simulated user testing as **complementary** to RAGAS
- Acknowledge it's **not a replacement** for real user studies
- Justify as **practical approach** given timeline and resources
- Emphasize **scalability** and **reproducibility**
- Suggest real user studies as **future work**

## Example Output

```
🎭 Starting scenario: Proses Pengisian KRS
👤 Persona: Mahasiswa Baru
🎯 Goal: Memahami cara mengisi KRS dan batas SKS yang boleh diambil

--- Turn 1 ---
👤 User: Bagaimana cara mengisi KRS?
🤖 Assistant (1234ms): Pengisian KRS dilakukan secara daring...
📊 Coherence: 0.92, Context: ✓

--- Turn 2 ---
👤 User: Berapa maksimal SKS yang bisa diambil?
🤖 Assistant (1567ms): Maksimal SKS bergantung pada IPK...
📊 Coherence: 0.88, Context: ✓

--- Turn 3 ---
👤 User: Kalau IPK saya 3.5, berapa SKS yang boleh saya ambil?
🤖 Assistant (1423ms): Dengan IPK 3.5, Anda dapat mengambil...
📊 Coherence: 0.91, Context: ✓

✅ Template completed successfully

📈 Final Metrics:
   Task Completed: ✅
   Turns: 3
   Avg Coherence: 0.90
   Context Retention: 100%
   Info Coverage: 100%
   Success Criteria Met: ✅
```

## Integration with Existing Evaluation

### Workflow

```
1. Component-Level Evaluation (RAGAS)
   ├─ Run: bun test:ai-models
   ├─ Output: Component metrics (faithfulness, relevancy, etc.)
   └─ Purpose: Validate RAG components

2. System-Level Evaluation (Simulated User)
   ├─ Run: bun test:simulated-user
   ├─ Output: System metrics (coherence, task completion, etc.)
   └─ Purpose: Validate complete implementation

3. Statistical Analysis
   ├─ Compare: Component vs System metrics
   ├─ Identify: Gaps and correlations
   └─ Report: Combined evaluation results
```

### Paper Inclusion

Recommended sections:

**Chapter 3 (Methodology)**:
```markdown
### 3.X Evaluasi Tingkat Sistem

Selain evaluasi komponen RAG menggunakan RAGAS, kami melakukan
evaluasi tingkat sistem menggunakan simulated user testing untuk
memvalidasi implementasi chatbot secara menyeluruh.

#### 3.X.1 Pendekatan LLM-as-a-User
...

#### 3.X.2 Persona dan Skenario
...

#### 3.X.3 Metrik Tingkat Sistem
...
```

**Chapter 4 (Results)**:
```markdown
### 4.X Hasil Evaluasi Tingkat Sistem

Hasil simulated user testing menunjukkan:
- Task Completion Rate: XX%
- Conversation Coherence: X.XX
- Context Retention: XX%
...
```

**Chapter 5 (Discussion)**:
```markdown
### 5.X Evaluasi Komprehensif: Komponen vs Sistem

Kombinasi evaluasi komponen-level dan sistem-level memberikan
validasi menyeluruh terhadap implementasi MuliaChat...
```

## References

- **RAGAS**: Shahul et al. (2023). "RAGAS: Automated Evaluation of Retrieval Augmented Generation"
- **LLM-as-a-Judge**: Zheng et al. (2023). "Judging LLM-as-a-Judge with MT-Bench"
- **User Simulation**: Zhang et al. (2024). "Simulating User Behavior for Testing Conversational AI"

---

**Status**: ✅ Implemented  
**Last Updated**: 2025-12-20  
**Maintainer**: Research Team
