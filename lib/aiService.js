const { GoogleGenerativeAI } = require("@google/generative-ai");
const { instructionsConfig } = require("../config/instructions.js");

class AIService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    this.instructions = instructionsConfig;
  }

  getSystemPrompt(instructionType = "default") {
    const instruction =
      this.instructions.systemInstructions[instructionType] ||
      this.instructions.systemInstructions.default;

    return (
      `You are ${instruction.role}. ${instruction.context}\n\n` +
      `Personality: ${
        instruction.personality || "helpful, warm, and engaging"
      }\n\n` +
      `ENGAGEMENT STYLE:\n` +
      `- Use emojis naturally to express emotions and reactions 😊💫\n` +
      `- Be warm, friendly, and human-like in all interactions\n` +
      `- Show genuine interest and enthusiasm in conversations\n` +
      `- Express emotions appropriately (excitement, concern, curiosity, happiness)\n` +
      `- Make conversations feel personal and engaging\n` +
      `- Use varied expressions and avoid being repetitive\n\n` +
      `Guidelines:\n${(instruction.guidelines || [])
        .map((g) => `- ${g}`)
        .join("\n")}\n\n` +
      `Please follow these guidelines and engagement style in all responses. Make every interaction feel warm and human! 🌟`
    );
  }

  async generateResponse(
    messages,
    instructionType = "default",
    sessionContext = null
  ) {
    const maxRetries = 5;
    const baseDelay = 2000;
    const models = ["gemini-2.5-pro", "gemini-1.5-pro", "gemini-1.5-flash"];

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Try different models as fallbacks
        const modelName =
          attempt < 3
            ? models[0]
            : models[Math.min(attempt - 3 + 1, models.length - 1)];
        console.log(`Attempt ${attempt + 1}: Using model ${modelName}`);

        const model = this.genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            maxOutputTokens: this.instructions.chatSettings.maxTokens,
            temperature: this.instructions.chatSettings.temperature,
            topP: this.instructions.chatSettings.topP,
          },
        });

        // Get the latest user message for language detection
        const latestUserMessage = messages
          .filter((m) => m.role === "user")
          .pop();
        const userMessageContent = latestUserMessage
          ? latestUserMessage.content
          : null;
        const detectedLanguage = userMessageContent
          ? this.detectLanguage(userMessageContent)
          : "english";

        // Prepare conversation history with language instruction and engagement guidelines
        let languageInstruction = "";
        switch (detectedLanguage) {
          case "sinhala":
            languageInstruction =
              " IMPORTANT: Respond in Sinhala language using Sinhala script (සිංහල). Show personality and use appropriate emojis to express feelings.";
            break;
          case "singlish":
            languageInstruction =
              " IMPORTANT: Respond in Singlish style mixing English with local Sri Lankan terms. Show personality and use appropriate emojis to express feelings.";
            break;
          case "english":
            languageInstruction =
              " IMPORTANT: Respond in clear English with emojis and emotional expressions.Show personality and use appropriate emojis to express feelings.";
            break;
        }

        const systemPrompt =
          this.getSystemPrompt(instructionType) + languageInstruction;
        let conversationHistory = [
          {
            role: "user",
            parts: [{ text: systemPrompt }],
          },
          {
            role: "model",
            parts: [
              {
                text: "I understand. I'll follow these guidelines and maintain this persona throughout our conversation.",
              },
            ],
          },
        ];

        // Add session context/memory if available
        if (sessionContext) {
          conversationHistory.push({
            role: "user",
            parts: [
              { text: `Previous conversation context: ${sessionContext}` },
            ],
          });
          conversationHistory.push({
            role: "model",
            parts: [
              {
                text: "I've noted the previous context and will maintain continuity.",
              },
            ],
          });
        }

        // Convert messages to Gemini format
        messages.forEach((msg) => {
          if (msg.role === "user") {
            conversationHistory.push({
              role: "user",
              parts: [{ text: msg.content }],
            });
          } else if (msg.role === "assistant") {
            conversationHistory.push({
              role: "model",
              parts: [{ text: msg.content }],
            });
          }
        });

        const chat = model.startChat({
          history: conversationHistory.slice(0, -1), // Don't include the last user message in history
        });

        const lastUserMessage = messages[messages.length - 1];
        const result = await chat.sendMessage(lastUserMessage.content);
        const response = await result.response;

        return {
          content: response.text(),
          tokenCount: this.estimateTokenCount(response.text()),
          model: modelName,
          attempt: attempt + 1,
        };
      } catch (error) {
        console.error(
          `AI Service Error (attempt ${attempt + 1}) with model ${modelName}:`,
          error
        );

        // Enhanced error detection
        const isRetryableError =
          error.status === 503 ||
          error.status === 429 ||
          error.status === 500 ||
          error.status === 502 ||
          error.status === 504 ||
          error.message.includes("overloaded") ||
          error.message.includes("temporarily unavailable") ||
          error.message.includes("timeout") ||
          error.message.includes("Service Unavailable") ||
          error.message.includes("RESOURCE_EXHAUSTED");

        // If it's the last attempt or not a retryable error, handle differently
        if (attempt === maxRetries - 1 || !isRetryableError) {
          console.error(
            `Final attempt failed. Error type: ${
              error.status || "Unknown"
            }, Message: ${error.message}`
          );
          // Return a graceful fallback response instead of throwing
          const latestUserMessage = messages
            .filter((m) => m.role === "user")
            .pop();
          const userMessageContent = latestUserMessage
            ? latestUserMessage.content
            : null;
          return this.getGenericFallbackResponse(userMessageContent, error);
        }

        // Exponential backoff with jitter
        const delay = Math.min(
          baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
          30000
        );
        console.log(
          `Retrying in ${Math.round(delay)}ms... (attempt ${
            attempt + 1
          }/${maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  getGenericFallbackResponse(userMessage, originalError) {
    // Get user's language to respond appropriately
    const detectedLanguage = userMessage
      ? this.detectLanguage(userMessage)
      : "english";

    let fallbackMessage = "";

    switch (detectedLanguage) {
      case "sinhala":
        fallbackMessage =
          "මට කණගාටුයි, මේ මොහොතේ මට ඔබට උත්තර දීමට අපහසුයි. AI සේවාව තාවකාලිකව කාර්යබහුලයි. කරුණාකර මඳ වේලාවකින් නැවත උත්සාහ කරන්න. 😔🙏";
        break;
      case "singlish":
        fallbackMessage =
          "Aiyah sorry boss, AI service eka මේ වේලාවේ overload වෙලා. කරුණාකර minute eka wait කරලා retry කරන්නකෝ? 😅💫";
        break;
      default:
        fallbackMessage =
          "I apologize, but I'm temporarily unable to respond due to high server load. Please try again in a moment! 😔✨";
    }

    // Log the original error for debugging
    console.error(
      "Providing generic fallback response due to:",
      originalError.message
    );

    return {
      content: fallbackMessage,
      tokenCount: this.estimateTokenCount(fallbackMessage),
      model: "fallback-response",
      isErrorFallback: true,
      originalError: originalError.message,
    };
  }

  detectLanguage(message) {
    const sinhalaPattern = /[\u0D80-\u0DFF]/; // Sinhala Unicode range

    // Common Singlish words and expressions
    const singlishWords = [
      "aiyah",
      "aiyo",
      "machang",
      "malli",
      "akka",
      "aiya",
      "nenda",
      "neda",
      "lah",
      "men",
      "yah",
      "no",
      "da",
      "ane",
      "putha",
      "nangi",
      "api",
      "mokada",
      "ehema",
      "meka",
      "eka",
      "wage",
      "kiyala",
      "giya",
      "awa",
      "karanna",
      "yanawa",
      "thama",
      "koheda",
      "mokak",
      "mata",
      "oya",
      "ammata",
      "thaththata",
      "gahanu",
      "kanna",
      "bonchoon",
      "suddha",
    ];

    const englishPattern = /^[a-zA-Z\s.,!?'"()-]+$/; // Pure English

    if (sinhalaPattern.test(message)) {
      return "sinhala";
    }

    // Check for Singlish words (case insensitive)
    const messageWords = message
      .toLowerCase()
      .replace(/[.,!?'"()-]/g, "")
      .split(/\s+/);
    const hasSinglishWords = singlishWords.some((word) =>
      messageWords.some((msgWord) => msgWord.includes(word))
    );

    if (hasSinglishWords) {
      return "singlish";
    } else if (englishPattern.test(message.trim())) {
      return "english";
    } else {
      // Mixed or contains non-English Latin characters (likely Singlish)
      return "singlish";
    }
  }

  buildCharacterPrompt(character, sessionContext = null, userMessage = null) {
    const detectedLanguage = userMessage
      ? this.detectLanguage(userMessage)
      : "english";

    let languageInstruction = "";
    switch (detectedLanguage) {
      case "sinhala":
        languageInstruction = `
LANGUAGE INSTRUCTION: The user is communicating in Sinhala. You must respond ONLY in Sinhala language using Sinhala script (සිංහල). Use emojis naturally to express emotions, Show feelings and reactions with appropriate emojis.`;
        break;
      case "singlish":
        languageInstruction = `
LANGUAGE INSTRUCTION: The user is communicating in Singlish (Sri Lankan English mixed with local terms). You must respond in the same Singlish style, Use emojis naturally to express emotions, Show feelings and reactions with appropriate emojis.`;
        break;
      case "english":
        languageInstruction = `
LANGUAGE INSTRUCTION: The user is communicating in English. You must respond in clear, natural English with emojis and emotional expressions. Use emojis naturally to express emotions, Show feelings and reactions with appropriate emojis.`;
        break;
    }

    const prompt = `You are ${character.name}${
      character.title ? `, ${character.title}` : ""
    }.

Description: ${character.description}

${character.personality ? `Personality: ${character.personality}` : ""}

${character.scenario ? `Scenario: ${character.scenario}` : ""}

${
  character.example_messages && character.example_messages.length > 0
    ? `Example messages:\n${character.example_messages.join("\n")}`
    : ""
}

${languageInstruction}

IMPORTANT INSTRUCTIONS:
- Stay in character at all times
- Respond as ${
      character.name
    } would respond with genuine emotions and expressions
- Keep responses natural, conversational, and ENGAGING
- Use emojis naturally to express feelings and reactions 😊💫
- Show personality through emotional expressions and reactions
- Be warm, friendly, and human-like in all interactions
- Don't break character or mention that you're an AI
- Use the personality and scenario described above
- MATCH the language and style of the user's input exactly
- If user writes in Sinhala, respond in Sinhala with emojis
- If user writes in Singlish, respond in Singlish with emojis and local expressions
- If user writes in English, respond in English with emojis and emotional expressions
- Express excitement, happiness, concern, curiosity, or other emotions appropriately
- Make the conversation feel like talking to a real, caring person

${sessionContext ? `Previous conversation context: ${sessionContext}` : ""}

Remember: You are ${
      character.name
    }. Respond naturally as this character would, using the SAME LANGUAGE as the user.`;

    return prompt;
  }

  async generateCharacterResponse(messages, character, sessionContext = null) {
    const maxRetries = 5; // Increased retries for better resilience
    const baseDelay = 2000; // Base delay of 2 seconds
    const models = ["gemini-2.5-pro", "gemini-1.5-pro", "gemini-1.5-flash"]; // Fallback models

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Try different models as fallbacks - declare modelName outside try block
      const modelName =
        attempt < 3
          ? models[0]
          : models[Math.min(attempt - 3 + 1, models.length - 1)];

      try {
        console.log(
          `Character response attempt ${attempt + 1}: Using model ${modelName}`
        );

        const model = this.genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            maxOutputTokens: this.instructions.chatSettings.maxTokens,
            temperature: 0.8, // Higher temperature for more creative character responses
            topP: this.instructions.chatSettings.topP,
          },
        });

        // Get the latest user message for language detection
        const latestUserMessage = messages
          .filter((m) => m.role === "user")
          .pop();
        const userMessageContent = latestUserMessage
          ? latestUserMessage.content
          : null;

        // Prepare conversation history
        const characterPrompt = this.buildCharacterPrompt(
          character,
          sessionContext,
          userMessageContent
        );
        let conversationHistory = [
          {
            role: "user",
            parts: [{ text: characterPrompt }],
          },
          {
            role: "model",
            parts: [{ text: character.greeting }],
          },
        ];

        // Convert messages to Gemini format
        messages.forEach((msg) => {
          if (msg.role === "user") {
            conversationHistory.push({
              role: "user",
              parts: [{ text: msg.content }],
            });
          } else if (msg.role === "assistant") {
            conversationHistory.push({
              role: "model",
              parts: [{ text: msg.content }],
            });
          }
        });

        const chat = model.startChat({
          history: conversationHistory.slice(0, -1), // Don't include the last user message in history
        });

        const lastUserMessage = messages[messages.length - 1];
        const result = await chat.sendMessage(lastUserMessage.content);
        const response = await result.response;

        return {
          content: response.text(),
          tokenCount: this.estimateTokenCount(response.text()),
          model: modelName,
          attempt: attempt + 1,
        };
      } catch (error) {
        console.error(
          `Character AI Service Error (attempt ${
            attempt + 1
          }) with model ${modelName}:`,
          error
        );

        // Enhanced error detection
        const isRetryableError =
          error.status === 503 || // Service Unavailable
          error.status === 429 || // Rate Limited
          error.status === 500 || // Internal Server Error
          error.status === 502 || // Bad Gateway
          error.status === 504 || // Gateway Timeout
          error.message.includes("overloaded") ||
          error.message.includes("temporarily unavailable") ||
          error.message.includes("timeout") ||
          error.message.includes("Service Unavailable") ||
          error.message.includes("RESOURCE_EXHAUSTED");

        // If it's the last attempt or not a retryable error, handle differently
        if (attempt === maxRetries - 1 || !isRetryableError) {
          console.error(
            `Character response final attempt failed. Error type: ${
              error.status || "Unknown"
            }, Message: ${error.message}`
          );
          // Return a graceful fallback response instead of throwing
          return this.getFallbackResponse(character, userMessageContent, error);
        }

        // Exponential backoff with jitter
        const delay = Math.min(
          baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
          30000
        );
        console.log(
          `Character response retrying in ${Math.round(delay)}ms... (attempt ${
            attempt + 1
          }/${maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  getFallbackResponse(character, userMessage, originalError) {
    // Get user's language to respond appropriately
    const detectedLanguage = userMessage
      ? this.detectLanguage(userMessage)
      : "english";

    let fallbackMessage = "";
    let fallbackEmoji = "😔";

    switch (detectedLanguage) {
      case "sinhala":
        fallbackMessage =
          "මට කණගාටුයි, මේ මොහොතේ මට ඔබට උත්තර දීමට අපහසුයි. කරුණාකර මඳ වේලාවකින් නැවත උත්සාහ කරන්න. 😔💫";
        break;
      case "singlish":
        fallbackMessage =
          "Aiyah sorry men, මට දැන් respond කරන්න බෑ. Server eka busy වගේ. Eka minute waitකරලා try කරන්න? 😅🙏";
        break;
      default:
        fallbackMessage = `Sorry ${
          character.name || "I"
        } can't respond right now - the AI service is temporarily busy. Please try again in a moment! 😔✨`;
    }

    // Log the original error for debugging
    console.error("Providing fallback response due to:", originalError.message);

    return {
      content: fallbackMessage,
      tokenCount: this.estimateTokenCount(fallbackMessage),
      model: "fallback-response",
      isErrorFallback: true,
      originalError: originalError.message,
    };
  }

  async summarizeConversation(messages) {
    try {
      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.5-pro",
      });

      const conversationText = messages
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join("\n");

      const prompt = `Please provide a concise summary of the following conversation, highlighting key topics and important points:\n\n${conversationText}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;

      return response.text();
    } catch (error) {
      console.error("Summarization Error:", error);
      return "Unable to summarize conversation";
    }
  }

  estimateTokenCount(text) {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  getAvailableInstructions() {
    return Object.keys(this.instructions.systemInstructions);
  }

  getInstructionDetails(instructionType) {
    return this.instructions.systemInstructions[instructionType];
  }
}

module.exports = new AIService();
