# Simulated User Testing

> System-level evaluation framework complementing RAGAS component-level metrics

## Quick Start

```bash
# Run quick test (small scenario subset)
npm run test:simulated-user:quick

# Run all scenarios
npm run test:simulated-user

# Run specific scenario
npm run test:simulated-user -- --scenario krs-registration

# Run with repetitions for statistical validity
npm run test:simulated-user -- --repetitions 3
```

## What is This?

This framework tests the **complete chatbot system** through simulated multi-turn conversations:

- ✅ **Multi-turn conversations** (not just single Q&A)
- ✅ **Task completion** (did user achieve their goal?)
- ✅ **Context retention** (does system remember previous turns?)
- ✅ **Conversation coherence** (natural flow?)
- ✅ **End-to-end testing** (API → RAG → Response)

## Why?

### The Problem
- Paper title claims **"Implementasi"** (implementation)
- Previous evaluation only measured **component-level RAG metrics**
- No validation of **complete system** or **multi-turn conversations**

### The Solution
Simulated user testing validates:
1. Complete system implementation works
2. Multi-turn conversations are coherent
3. Users can actually complete tasks
4. Context is maintained across turns

## How It Works

### LLM-as-a-User

Similar to **LLM-as-a-Judge** (used in RAGAS):
- **LLM-as-a-Judge**: Evaluates response quality
- **LLM-as-a-User**: Generates realistic user messages

```
┌─────────────┐
│   Persona   │  (e.g., "New Student")
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ LLM-as-User │  Generates: "Bagaimana cara mengisi KRS?"
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Chat API   │  Real system responds
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Evaluator  │  Scores: coherence, context retention
└─────────────┘
```

## Personas

5 user types based on corpus content:

| Persona | Description | Example Goal |
|---------|-------------|--------------|
| **New Student** | Just enrolled, novice | Learn about KRS, facilities |
| **Senior Student** | Graduating, intermediate | Understand graduation requirements |
| **Faculty** | Teaching staff, expert | Find curriculum, calendar info |
| **Staff** | Administrative, intermediate | Learn organizational structure |
| **Prospective** | Pre-enrollment, novice | Explore programs, admission |

## Scenarios

7 conversation scenarios:

1. **KRS Registration** (3 turns)
   - Persona: New Student
   - Goal: Learn KRS process and SKS limits

2. **Graduation Requirements** (4 turns)
   - Persona: Senior Student
   - Goal: Understand all graduation requirements

3. **Academic Leave** (3 turns)
   - Persona: Senior Student
   - Goal: Learn cuti akademik process

4. **Organizational Structure** (3 turns)
   - Persona: Staff
   - Goal: Understand university organization

5. **Program Information** (4 turns)
   - Persona: Prospective Student
   - Goal: Explore available programs

6. **Faculty Services** (3 turns)
   - Persona: Faculty
   - Goal: Learn about teaching resources

7. **Student Facilities** (3 turns)
   - Persona: New Student
   - Goal: Discover campus facilities

## Metrics

### System-Level Metrics (New)

| Metric | Description | Good Value |
|--------|-------------|------------|
| **Task Completion Rate** | % of tasks successfully completed | > 80% |
| **Conversation Coherence** | Natural flow score | > 0.8 |
| **Context Retention** | % of context maintained | > 80% |
| **Information Coverage** | % of required info provided | > 80% |
| **Average Latency** | Response time | < 2000ms |

### vs Component-Level (RAGAS)

| Aspect | RAGAS (Component) | Simulated User (System) |
|--------|-------------------|-------------------------|
| **Scope** | Single Q&A pairs | Multi-turn conversations |
| **Measures** | Faithfulness, relevancy | Coherence, task completion |
| **Context** | Individual questions | Conversation history |
| **Validates** | RAG components work | Complete system works |

## Example Output

```
🎭 Starting scenario: Proses Pengisian KRS
👤 Persona: Mahasiswa Baru
🎯 Goal: Memahami cara mengisi KRS dan batas SKS

--- Turn 1 ---
👤 User: Bagaimana cara mengisi KRS?
🤖 Assistant (1234ms): Pengisian KRS dilakukan...
📊 Coherence: 0.92, Context: ✓

--- Turn 2 ---
👤 User: Berapa maksimal SKS yang bisa diambil?
🤖 Assistant (1567ms): Maksimal SKS bergantung...
📊 Coherence: 0.88, Context: ✓

✅ Task Completed
📈 Metrics:
   Task Completion: 100%
   Avg Coherence: 0.90
   Context Retention: 100%
   Info Coverage: 100%
```

## CLI Options

```bash
# Run specific scenario
--scenario <scenario-id>
  Example: --scenario krs-registration

# Quick mode (small scenario subset)
--quick

# Run all scenarios
--all-scenarios

# Repetitions for statistical validity
--repetitions <n>
  Example: --repetitions 3

# Disable agentic mode
--no-agentic
```

## Available Scenarios

Run with `--scenario <id>`:

- `krs-registration`
- `graduation-requirements`
- `academic-leave`
- `organizational-structure`
- `program-information`
- `faculty-services`
- `student-facilities`

## Report Generation

After running, a report is generated at `/tmp/simulated-user-testing-report-<timestamp>.md`

Report includes:
- Executive summary
- System-level metrics
- Performance analysis
- Error analysis
- Academic justification
- Recommendations

## Integration with Paper

### Recommended Sections

**Chapter 3 (Methodology)**:
```markdown
### 3.X Evaluasi Tingkat Sistem

Selain evaluasi komponen RAG, kami melakukan evaluasi 
tingkat sistem menggunakan simulated user testing...
```

**Chapter 4 (Results)**:
```markdown
### 4.X Hasil Evaluasi Tingkat Sistem

Task Completion Rate: 85%
Conversation Coherence: 0.87
Context Retention: 92%
```

**Chapter 5 (Discussion)**:
```markdown
### 5.X Evaluasi Komprehensif

Kombinasi evaluasi komponen dan sistem memberikan
validasi menyeluruh terhadap implementasi...
```

## Academic Justification

**Why This Approach?**

1. **Complements RAGAS**: Component + System = Complete validation
2. **Scalable**: No manual user studies needed
3. **Reproducible**: Same results every run
4. **Justified**: LLM-as-a-User extends proven LLM-as-a-Judge pattern

**For Thesis Defense**:
- Present as **complementary** to RAGAS (not replacement)
- Acknowledge **limitations** (simulated, not real users)
- Emphasize **practicality** (timeline, resources)
- Suggest **future work** (real user studies)

## Limitations

Current:
- ✅ Tests API (backend)
- ❌ Doesn't test UI (frontend)
- ✅ Simulated users
- ❌ Not real human users
- ✅ Predefined scenarios
- ❌ Limited coverage

Future:
- Add UI testing (Playwright)
- Conduct real user studies
- Expand scenario library
- Add more personas

## Files

```
src/lib/simulated-user/
├── types.ts              # TypeScript interfaces
├── personas.ts           # User personas
├── scenarios.ts          # Conversation scenarios
├── user-simulator.ts     # LLM-as-a-User
├── evaluator.ts          # Metrics calculation
├── conversation-runner.ts # Main orchestrator
└── index.ts              # Exports

scripts/
└── run-simulated-user-tests.ts  # CLI script

research/docs/
└── 10_simulated_user_testing.md # Full documentation
```

## Support

For issues or questions:
1. Check `research/docs/10_simulated_user_testing.md` for detailed docs
2. Review example scenarios in `src/lib/simulated-user/scenarios.ts`
3. Check logs in generated report

---

**Status**: ✅ Implemented
**Last Updated**: 2025-12-20
