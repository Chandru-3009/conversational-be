# Project: Ameya AI Diet Tracker
This document outlines the requirements for the "Ameya" AI Diet Tracker web application. Ameya will allow users to voice chat with an AI agent to log their meals (Breakfast, Lunch, Dinner, Snacks) and water intake.

# Web Page Requirements:
The web page should provide a welcoming interface and facilitate real-time voice interaction with the AI agent.

## 1. User Interface & Initial Interaction:
Welcome Screen: Display a welcoming message for the "Ameya" diet tracker.

Call Icon: A prominent call icon should be centrally located on the screen.

Animation: The call icon should feature a subtle animation (e.g., a "poke" or pulse effect) to encourage user interaction.

Click Event: On user click of the call icon, a pop-up modal should appear.

## 2. User Onboarding Modal:
Email Input: The modal must include an input field for the user's email ID, which will serve as their unique identifier.

Microphone Access Consent: Inform the user that microphone access will be requested. Include a checkbox that the user must consciously tick to acknowledge and consent to microphone access.

Proceed Button: A "Proceed" button should be present to continue the session after inputting the email and checking the consent box.

## 3. Backend Communication & Setup:
Websocket Connection: Upon clicking "Proceed", initiate a WebSocket connection with the backend server.

Initial Data Transmission: Send the user's email, a generated user ID, and a session ID through the WebSocket connection.

Ephemeral Key Request: Once the WebSocket connection is successfully established, use it to request an ephemeral key for OpenAI WebRTC.

OpenAI WebRTC Connection: On receiving the ephemeral key, establish a WebRTC connection with the OpenAI real-time API.

Front-end Ready Status: After a successful WebRTC connection, send a status message via the WebSocket to inform the backend server that the front-end is ready for interaction.

## 4. AI Agent Interaction Flow:
Greeting Message Retrieval: Upon receiving the "front-end ready" status, the backend server will:

Fetch user data from its database.

Prepare a tailored greeting message:

First-time user: A comprehensive greeting covering usage instructions, privacy policy, and features.

Repeat user: A greeting that continues from their last meal if unfinished, or prompts for the next meal if the previous day's meals are complete.

Greeting Audio Playback: The greeting message audio will be sent from the backend via WebSocket to the front-end, which will then play the audio.

User Speech to Text (STT): After the greeting audio finishes playing, the user can speak. The browser's Web Speech API will convert the user's speech to text.

Text to OpenAI WebRTC: The converted text will be sent to OpenAI WebRTC for generating a response.

OpenAI Response to Backend: The response text from OpenAI will be sent to the backend server via WebSocket.

Backend Text-to-Speech (TTS): The backend server will use Gemini Text-to-Speech to convert the response text into audio.

Response Audio Playback: The generated audio will be sent via WebSocket to the front-end and played for the user.

Continuous Cycle: This speech-to-text, AI response, text-to-speech cycle will continue until the user explicitly quits the session.