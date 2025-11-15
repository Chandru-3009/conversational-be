# Nutrina: Voice-Powered Diet Tracking Assistant

## 🧠 Problem

Patients often struggle to consistently log their dietary intake using conventional tools like web forms, which require manual entry or time-consuming food searches.

## 🎯 Solution

Nutrina introduces a voice-first AI assistant that interacts with users in natural conversation to seamlessly capture their dietary habits. This reduces friction and increases adherence to diet tracking routines.

## 🗣️ Example Conversation Flow

1. **Initiate**: User opens the app and starts a session. A WebSocket connection is established between the device and server.
2. **Greet & Context**: The AI retrieves user context and greets them via voice.
3. **Prompt**: Agent asks, “What did you have for breakfast today?”
4. **Capture**: User responds, e.g., “I had eggs and toast.”
5. **Clarify**: Agent follows up: “How many eggs?” “What size was the toast?”
6. **Iterate**: It continues to ask relevant questions until all necessary food and portion data are gathered.
7. **Store**: Once done, it saves the nutritional information and ends the session.

This conversational approach enhances usability and promotes more accurate, real-time food logging.

## 🧩 Tech Stack

| Component           | Tech / Tool             |
| ------------------- | ----------------------- |
| **Backend**         | Node.js with TypeScript |
| **Real-time Comm**  | WebSocket               |
| **Agent Framework** | LangChain               |
| **Database**        | MongoDB                 |
| **STT & TTS**       | ElevenLabs              |
| **LLM**             | Gemini (via Google)     |
| **Deployment**      | GCP Compute Engine      |

## ☁️ Deployment

The application will be hosted on **Google Cloud Platform (GCP)**, leveraging **Compute Engine** to ensure performance, scalability, and low-latency for real-time voice interactions.
