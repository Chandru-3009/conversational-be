# 🤖 Conversational Agent: Implementation Overview

This document defines the schema, LLM input/output structure, and front-end integration approach for building a structured conversational agent that gathers user information across multiple intents.

---

## 📦 1. Schema Definitions

### 🔹 Agent Metadata

```json
{
  "agent": {
    "about": "You are Ameya, a friendly, supportive nutritional diet tracking assistant..."
  },
  "mode": ["text", "audio"] // Determines response mode
}
```

---

### 🔹 Section Schema

```json
{
  "id": 1,
  "name": "personal-info-section",
  "about": "Captures the user's personal information to tailor the experience.",
  "introduction": [
    {
      "intent": "Give a warm introduction about this section and its objective"
    }
  ],
  "intents": [3221, 3222, 3223]
}
```

---

### 🔹 Intent Schema

```json
{
  "id": 3221,
  "intent": "Get user's name and preferred way of addressing",
  "fieldsToExtract": [
    {
      "name": "name",
      "type": "string",
      "description": "The name or nickname provided by the user",
      "example": "John",
      "validation": "Name must be at least 2 characters and contain only letters and spaces."
    }
  ],
  "isMandatory": true,
  "retryLimit": 3
}
```

---

## 🧠 2. LLM Prompt Format (Flattened Text)

The front-end sends a **structured text prompt** rather than raw JSON.

### 🔹 Example Prompt for Intent 3221 (Name)

```
You are Ameya, a friendly, supportive nutritional diet tracking assistant.

Current Intent:
Get user's name and preferred way of addressing

Field to Extract:
- name: The name or nickname provided by the user
  Example: John
  Validation: Name must be at least 2 characters and contain only letters and spaces.

Next Intent (if current is completed):
Get user's age

Conversation so far:
agent: What's your name and how should I address you?
user: You can call me Raj.

Instructions:
1. Extract the required fields for the current intent.
2. Return:
   - id: intent ID
   - isCompleted: true or false
   - fields: key-value map of extracted fields
   - nextPrompt: question to ask next (or follow-up if current intent is incomplete)
```

---

## 📤 3. LLM Output Schema (Structured JSON)

```json
{
  "id": 3221,
  "isCompleted": true,
  "fields": {
    "name": "Raj"
  },
  "nextPrompt": "Thanks, Raj! How old are you?"
}
```

* `id`: Current intent ID
* `isCompleted`: Indicates if all mandatory fields were captured and validated
* `fields`: Key-value map of user responses
* `nextPrompt`: Prompt to continue the conversation

---

## 🔄 4. Sample Flow: 3 Intents

### ✳️ Intents

1. Name (`id: 3221`)
2. Age (`id: 3222`)
3. Lifestyle (`id: 3223`)

---

### 🔁 Step-by-Step Example

#### 🔹 Step 1

**Prompt:**

```
Current Intent:
Get user's name and preferred way of addressing

Field to Extract:
- name: Nickname or name (e.g., John)

Next Intent:
Get user's age

Conversation so far:
agent: What's your name and how should I address you?
user: You can call me Raj.
```

**Response:**

```json
{
  "id": 3221,
  "isCompleted": true,
  "fields": {
    "name": "Raj"
  },
  "nextPrompt": "Thanks, Raj! How old are you?"
}
```

#### 🔹 Step 2

**Prompt:**

```
Current Intent:
Get user's age

Field to Extract:
- age: User's age in years (e.g., 28)
  Validation: Number between 1 and 120

Next Intent:
Ask about user's daily exercise or activity

Conversation so far:
agent: Thanks, Raj! How old are you?
user: I'm 28.
```

**Response:**

```json
{
  "id": 3222,
  "isCompleted": true,
  "fields": {
    "age": 28
  },
  "nextPrompt": "Got it! Do you follow any regular exercise routine?"
}
```

#### 🔹 Step 3

**Prompt:**

```
Current Intent:
Ask about user's daily exercise or activity

Fields to Extract:
- lifestyle: Type of physical activity (e.g., Yoga)
- frequency: How often (e.g., 3 times a week)

Next Intent:
None

Conversation so far:
agent: Got it! Do you follow any regular exercise routine?
user: I do yoga 3 times a week in the mornings.
```

**Response:**

```json
{
  "id": 3223,
  "isCompleted": true,
  "fields": {
    "lifestyle": "Yoga",
    "frequency": "3 times a week in the mornings"
  },
  "nextPrompt": "Awesome! That’s all I needed for now 😊"
}
```

---

## 🖥️ 5. Front-End Responsibilities

### 🔄 Loop Flow

1. **Initialize** section and intents
2. For each intent:

   * Format prompt using `currentIntent`, `nextIntent`, and `conversationHistory`
   * Send prompt to LLM
   * Parse `isCompleted`, `fields`, and `nextPrompt`
   * Store `fields` if completed
   * Display `nextPrompt`
3. Repeat until all intents are completed or `nextIntent == null`

---

## ✅ Summary

| Component            | Format                                                        |
| -------------------- | ------------------------------------------------------------- |
| Agent input to LLM   | Structured plain-text prompt                                  |
| Conversation history | Single string with speaker prefixes                           |
| LLM output           | JSON with `id`, `isCompleted`, `fields`, `nextPrompt`         |
| Front-end role       | Orchestrate flow, format prompts, parse responses, store data |

