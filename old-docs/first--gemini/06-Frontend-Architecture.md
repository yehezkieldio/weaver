# Frontend Architecture: A First Principles Analysis

## Abstract

The frontend of the Academic Research RAG Chatbot is designed to solve a specific UX challenge: **Transparency**. Unlike standard chatbots that present a simple "typing..." indicator, this interface must visualize the complex, asynchronous "thought process" of an AI agent. This document analyzes the React-based architecture (`src/components`) responsible for consuming structured data streams and rendering the agent's cognitive state in real-time.

## 1. The Challenge of Structured Streaming

Standard LLM streams are simple text chunks. An *Agentic* stream, however, is a multiplexed signal containing:
1.  **Text Deltas:** The actual words of the answer.
2.  **Tool Calls:** Notifications that the agent is initiating a search.
3.  **Tool Results:** The raw JSON data returned from the database.
4.  **Reasoning Steps:** Internal monologues or plan updates.

## 2. The `useChat` Hook Implementation

The core logic resides in a custom adaptation of the Vercel AI SDK's `useChat` hook (`src/components/chat/chat-interface.tsx`).

### 2.1. State Management
The hook manages a complex state object that goes beyond simple message history:
*   `messages`: The linear conversation history.
*   `data`: A parallel array storing the structured metadata (steps, sources) associated with each message ID.
*   `isLoading`: Tracks the active state of the agent loop.

### 2.2. Stream Parsing
As packets arrive from the `/api/chat` endpoint, the frontend parser distinguishes between them:
*   **Text Parts:** Appended to the current message bubble.
*   **Data Parts:** Parsed as JSON and routed to the visualization components (e.g., updating the "Sources" list).

## 3. Visualization Components

The UI is composed of atomic units designed to visualize the "Black Box."

### 3.1. `MessageBubble`
The container for a single turn of conversation. It acts as a controller, conditionally rendering child components based on the data attached to the message.

### 3.2. `AgentStepsCollapsible`
*   **Purpose:** Shows the "work" behind the answer.
*   **Behavior:** It renders a timeline of events (e.g., "Planning...", "Searching for 'Tuition'...", "Reading 5 documents...").
*   **UX Pattern:** Collapsed by default to reduce clutter, but expandable for users (or researchers) who want to verify the process.

### 3.3. `SourcesCollapsible`
*   **Purpose:** Provides evidence and provenance.
*   **Data Source:** Populated by the `retrieval` tool results.
*   **Interaction:** Clicking a source likely expands details or opens the original document, establishing the chain of custody for information.

## 4. Configuration & Control

The frontend also serves as the control panel for the research platform.
*   **Mode Switcher:** Allows the user to toggle between "Agentic", "Standard RAG", and "Direct" modes via query parameters or context state.
*   **Settings Panel:** Enables real-time adjustment of parameters (e.g., "Temperature", "Max Steps") without redeploying the backend.

## 5. Conclusion

The Frontend Architecture is a direct reflection of the system's "First Principles" of transparency. It rejects the "Magic Box" metaphor common in AI UX, instead choosing to expose the machinery of cognition. This empowers the user to trust the system not because it claims to be smart, but because it shows its work.
