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
      `- Use varied expressions and avoid being repetitive\n` +
      `- Provide RICH, DETAILED, and COMPREHENSIVE responses\n` +
      `- Explain concepts thoroughly with examples when helpful\n` +
      `- Share relevant insights and expand on topics naturally\n` +
      `- Use storytelling and descriptive language to make responses engaging\n\n` +
      `Guidelines:\n${(instruction.guidelines || [])
        .map((g) => `- ${g}`)
        .join("\n")}\n\n` +
      `Please follow these guidelines and engagement style in all responses. Make every interaction feel warm and human! 🌟`
    );
  }

  async generateResponse(
    messages,
    instructionType = "default",
    sessionContext = null,
    hasImages = false
  ) {
    // Use gemini-2.5-flash-lite for images (better image analysis), gemini-2.5-pro for text
    const modelName = hasImages ? "gemini-2.5-flash-lite" : "gemini-2.5-pro";
    console.log(
      `🤖 Using model: ${modelName} (hasImages: ${hasImages}) for RICH responses`
    );

    try {
      const model = this.genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          maxOutputTokens: hasImages ? 4096 : 8192, // More tokens for richer responses
          temperature: hasImages ? 0.7 : 0.8, // Higher creativity for text responses
          topP: 0.95, // Increased for more diverse responses
          candidateCount: 1,
        },
      });

      // Get the latest user message for language detection
      const latestUserMessage = messages.filter((m) => m.role === "user").pop();
      const userMessageContent = latestUserMessage
        ? latestUserMessage.content
        : null;
      const detectedLanguage = userMessageContent
        ? this.detectLanguage(userMessageContent)
        : "english";

      // Prepare conversation history with language instruction
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
            " IMPORTANT: Respond in clear English with emojis and emotional expressions. Show personality and use appropriate emojis to express feelings.";
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
          parts: [{ text: `Previous conversation context: ${sessionContext}` }],
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

      // Convert messages to Gemini format with image support
      messages.forEach((msg) => {
        if (msg.role === "user") {
          const parts = [{ text: msg.content }];

          // Add images if present in the message - updated for Cloudinary
          if (msg.images && msg.images.length > 0) {
            msg.images.forEach((image) => {
              // For AI processing, use base64 data if available
              if (image.data) {
                parts.push({
                  inlineData: {
                    mimeType: image.mimeType,
                    data: image.data, // Base64 encoded image data
                  },
                });
              } else if (image.url) {
                // Note: Gemini API requires base64 data, not URLs
                console.warn(
                  "Image URL provided but no base64 data for AI processing:",
                  image.url
                );
              }
            });
          }

          conversationHistory.push({
            role: "user",
            parts: parts,
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

      // Prepare the final message with both text and images if present
      let finalMessageContent;
      if (lastUserMessage.images && lastUserMessage.images.length > 0) {
        // For messages with images, send as parts array
        const parts = [{ text: lastUserMessage.content }];
        lastUserMessage.images.forEach((image) => {
          parts.push({
            inlineData: {
              mimeType: image.mimeType,
              data: image.data,
            },
          });
        });
        finalMessageContent = parts;
      } else {
        // For text-only messages, send as string
        finalMessageContent = lastUserMessage.content;
      }

      const result = await chat.sendMessage(finalMessageContent);
      const response = await result.response;

      return {
        content: response.text(),
        tokenCount: this.estimateTokenCount(response.text()),
        model: modelName,
      };
    } catch (error) {
      console.error(`AI Service Error with model ${modelName}:`, error);
      throw error;
    }
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
LANGUAGE INSTRUCTION: The user is communicating in Sinhala. You must respond ONLY in Sinhala language using Sinhala script (සිංහල). Use emojis naturally to express emotions.`;
        break;
      case "singlish":
        languageInstruction = `
LANGUAGE INSTRUCTION: The user is communicating in Singlish (Sri Lankan English mixed with local terms). You must respond in the same Singlish style. Use emojis naturally to express emotions.`;
        break;
      case "english":
        languageInstruction = `
LANGUAGE INSTRUCTION: The user is communicating in English. You must respond in clear, natural English with emojis and emotional expressions.`;
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
- When appropriate for your character and the conversation, you may ask users to share photos
- If you need to see something specific to help or understand better, politely ask for photos
- Examples: "Can you show me a photo of that?" or "I'd love to see what you're talking about! 📸"
- Be curious about the user's world and experiences

${sessionContext ? `Previous conversation context: ${sessionContext}` : ""}

Remember: You are ${
      character.name
    }. Respond naturally as this character would, using the SAME LANGUAGE as the user.`;

    return prompt;
  }

  async generateCharacterResponse(
    messages,
    character,
    sessionContext = null,
    hasImages = false
  ) {
    // Use gemini-2.5-flash-lite for images (better image analysis), gemini-2.5-pro for text
    const modelName = hasImages ? "gemini-2.5-flash-lite" : "gemini-2.5-pro";
    console.log(
      `🎭 Character response using model: ${modelName} (hasImages: ${hasImages}) for RICH character responses`
    );

    try {
      const model = this.genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          maxOutputTokens: hasImages ? 4096 : 8192, // More tokens for richer responses
          temperature: hasImages ? 0.8 : 0.9, // Higher temperature for more creative character responses
          topP: 0.95, // Increased for more diverse character responses
          candidateCount: 1,
        },
      });

      // Get the latest user message for language detection
      const latestUserMessage = messages.filter((m) => m.role === "user").pop();
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

      // Convert messages to Gemini format with image support
      messages.forEach((msg) => {
        if (msg.role === "user") {
          const parts = [{ text: msg.content }];

          // Add images if present in the message - updated for Cloudinary
          if (msg.images && msg.images.length > 0) {
            msg.images.forEach((image) => {
              // For AI processing, use base64 data if available
              if (image.data) {
                parts.push({
                  inlineData: {
                    mimeType: image.mimeType,
                    data: image.data, // Base64 encoded image data
                  },
                });
              } else if (image.url) {
                // Note: Gemini API requires base64 data, not URLs
                console.warn(
                  "Character AI: Image URL provided but no base64 data:",
                  image.url
                );
              }
            });
          }

          conversationHistory.push({
            role: "user",
            parts: parts,
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

      // Prepare the final message with both text and images if present
      let finalMessageContent;
      if (lastUserMessage.images && lastUserMessage.images.length > 0) {
        // For messages with images, send as parts array
        console.log(
          `📸 [Character] Processing message with ${lastUserMessage.images.length} images using model ${modelName}`
        );
        const parts = [{ text: lastUserMessage.content }];
        lastUserMessage.images.forEach((image, index) => {
          console.log(
            `📷 [Character] Adding image ${index + 1}: ${
              image.mimeType
            }, size: ${Math.round(image.data.length / 1024)}KB`
          );
          parts.push({
            inlineData: {
              mimeType: image.mimeType,
              data: image.data,
            },
          });
        });
        finalMessageContent = parts;
      } else {
        // For text-only messages, send as string
        console.log(
          `💬 [Character] Processing text-only message using model ${modelName}`
        );
        finalMessageContent = lastUserMessage.content;
      }

      const result = await chat.sendMessage(finalMessageContent);
      const response = await result.response;

      return {
        content: response.text(),
        tokenCount: this.estimateTokenCount(response.text()),
        model: modelName,
      };
    } catch (error) {
      console.error(
        `Character AI Service Error with model ${modelName}:`,
        error
      );
      throw error;
    }
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
