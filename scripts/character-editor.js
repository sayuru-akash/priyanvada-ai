#!/usr/bin/env node

// Load environment variables
require("dotenv").config({ path: ".env.local" });

const readline = require("readline");
const postgres = require("../lib/postgres");

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Utility function to prompt user input
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// New helper: collect multiline input until a single dot '.' on its own line
function askMultiline(prompt) {
  return new Promise((resolve) => {
    console.log(prompt);
    console.log(
      "(Enter multiple lines. Finish with a single '.' on a line by itself)"
    );
    const lines = [];

    function onLine(line) {
      if (line.trim() === ".") {
        rl.removeListener("line", onLine);
        resolve(lines.join("\n").trim());
      } else {
        lines.push(line);
      }
    }

    rl.on("line", onLine);
  });
}

// Display character list
function displayCharacters(characters) {
  console.log("\n📋 Available Characters:");
  console.log("━".repeat(60));
  characters.forEach((char, index) => {
    console.log(
      `${index + 1}. ${char.name} (ID: ${char.id.substring(0, 8)}...)`
    );
    console.log(`   Title: ${char.title || "N/A"}`);
    console.log(`   Public: ${char.is_public ? "Yes" : "No"}`);
    console.log(`   Chat Count: ${char.chat_count || 0}`);
    console.log("─".repeat(40));
  });
}

// Display character details
function displayCharacterDetails(character) {
  console.log("\n📝 Character Details:");
  console.log("━".repeat(60));

  const fields = {
    1: { key: "name", label: "Name", value: character.name },
    2: { key: "title", label: "Title", value: character.title || "N/A" },
    3: {
      key: "description",
      label: "Description",
      value: character.description || "N/A",
    },
    4: {
      key: "personality",
      label: "Personality",
      value: character.personality || "N/A",
    },
    5: {
      key: "scenario",
      label: "Scenario",
      value: character.scenario || "N/A",
    },
    6: {
      key: "greeting",
      label: "Greeting",
      value: character.greeting || "N/A",
    },
    7: {
      key: "avatar_url",
      label: "Avatar URL",
      value: character.avatar_url || "N/A",
    },
    8: {
      key: "tags",
      label: "Tags",
      value: Array.isArray(character.tags) ? character.tags.join(", ") : "N/A",
    },
    9: {
      key: "is_public",
      label: "Is Public",
      value: character.is_public ? "Yes" : "No",
    },
    10: {
      key: "is_active",
      label: "Is Active",
      value: character.is_active ? "Yes" : "No",
    },
    11: {
      key: "book_name",
      label: "Book Name",
      value: character.book_name || "N/A",
    },
    12: {
      key: "creator_id",
      label: "Creator ID",
      value: character.creator_id || "N/A",
    },
  };

  Object.entries(fields).forEach(([num, field]) => {
    const displayValue =
      field.value.length > 100
        ? field.value.substring(0, 100) + "..."
        : field.value;
    console.log(`${num}. ${field.label}: ${displayValue}`);
  });

  console.log("━".repeat(60));
  return fields;
}

// Get all characters
async function getCharacters() {
  try {
    const result = await postgres.query(`
      SELECT id, creator_id, name, title, description, personality, scenario, 
             greeting, example_messages, tags, avatar_url, is_public, is_active, 
             chat_count, book_name, created_at, updated_at
      FROM characters 
      WHERE is_active = true
      ORDER BY name
    `);
    return result.rows;
  } catch (error) {
    console.error("❌ Error fetching characters:", error.message);
    return [];
  }
}

// Update character field
async function updateCharacterField(characterId, field, value) {
  try {
    let processedValue = value;

    // Handle special field types
    if (field === "tags") {
      // Convert comma-separated string to array
      processedValue = value
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag);
    } else if (field === "is_public" || field === "is_active") {
      // Convert to boolean
      processedValue = ["yes", "true", "1", "y"].includes(value.toLowerCase());
    } else if (field === "example_messages" && value) {
      try {
        processedValue = JSON.parse(value);
      } catch (e) {
        console.log("⚠️  Invalid JSON, treating as string");
      }
    }

    const query = `
      UPDATE characters 
      SET ${field} = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const result = await postgres.query(query, [processedValue, characterId]);

    if (result.rows.length > 0) {
      console.log("✅ Character updated successfully!");
      return result.rows[0];
    } else {
      console.log("❌ No character found with that ID");
      return null;
    }
  } catch (error) {
    console.error("❌ Error updating character:", error.message);
    return null;
  }
}

// Create new character
async function createNewCharacter() {
  console.log("\n🎭 Creating New Character");
  console.log("━".repeat(60));
  console.log("📝 Please provide information for each field:");
  console.log("💡 Tip: Press Enter to skip optional fields\n");

  const characterData = {};

  // Fields that should accept multiline input
  const MULTILINE_FIELDS = [
    "description",
    "personality",
    "scenario",
    "greeting",
    "example_messages",
  ];

  // Define all character fields with their prompts
  const characterFields = [
    {
      key: "creator_id",
      label: "Creator ID",
      prompt: "🧑‍💻 Creator ID (UUID) - optional but recommended: ",
      required: false,
    },
    {
      key: "name",
      label: "Name",
      prompt: "✨ Character Name (required): ",
      required: true,
      validation: (value) => value && value.length > 0,
    },
    {
      key: "title",
      label: "Title",
      prompt: "🏷️  Character Title (optional): ",
      required: false,
    },
    {
      key: "description",
      label: "Description",
      prompt: "📖 Description (required): ",
      required: true,
      validation: (value) => value && value.length > 0,
    },
    {
      key: "personality",
      label: "Personality",
      prompt: "🧠 Personality traits: ",
      required: false,
    },
    {
      key: "scenario",
      label: "Scenario",
      prompt: "🎬 Background scenario: ",
      required: false,
    },
    {
      key: "greeting",
      label: "Greeting",
      prompt: "👋 Initial greeting message: ",
      required: false,
    },
    {
      key: "avatar_url",
      label: "Avatar URL",
      prompt: "🖼️  Avatar URL (https://... or data:image/...): ",
      required: false,
    },
    {
      key: "tags",
      label: "Tags",
      prompt: "🏷️  Tags (comma-separated): ",
      required: false,
      transform: (value) =>
        value
          ? value
              .split(",")
              .map((tag) => tag.trim())
              .filter((tag) => tag)
          : [],
    },
    {
      key: "is_public",
      label: "Is Public",
      prompt: "🌍 Make character public? (y/n, default: yes): ",
      required: false,
      transform: (value) =>
        !value || ["yes", "true", "1", "y", ""].includes(value.toLowerCase()),
      default: true,
    },
    {
      key: "book_name",
      label: "Book Name",
      prompt: "📚 Book/Series name (optional): ",
      required: false,
    },
  ];

  // Collect data for each field
  for (const field of characterFields) {
    while (true) {
      // Use multiline input for configured fields
      let answer;
      if (MULTILINE_FIELDS.includes(field.key)) {
        answer = await askMultiline(field.prompt);
      } else {
        answer = await askQuestion(field.prompt);
      }

      // Handle default values
      if (!answer && field.default !== undefined) {
        characterData[field.key] = field.default;
        console.log(`   → Using default: ${field.default}`);
        break;
      }

      // Check if required field is empty
      if (field.required && (!answer || answer.trim() === "")) {
        console.log("❌ This field is required. Please provide a value.");
        continue;
      }

      // Validate field if validation function exists
      if (field.validation && answer && !field.validation(answer)) {
        console.log("❌ Invalid value. Please try again.");
        continue;
      }

      // Transform value if transform function exists
      const finalValue = field.transform ? field.transform(answer) : answer;
      characterData[field.key] = finalValue || null;

      if (finalValue) {
        console.log(
          `   ✅ ${field.label}: ${
            Array.isArray(finalValue) ? finalValue.join(", ") : finalValue
          }`
        );
      }
      break;
    }
  }

  // Show summary and confirm
  console.log("\n📋 Character Summary:");
  console.log("━".repeat(40));
  Object.entries(characterData).forEach(([key, value]) => {
    const displayValue = Array.isArray(value) ? value.join(", ") : value;
    console.log(`${key}: ${displayValue || "N/A"}`);
  });

  const confirm = await askQuestion("\n❓ Create this character? (y/n): ");
  if (confirm.toLowerCase() !== "y" && confirm.toLowerCase() !== "yes") {
    console.log("❌ Character creation cancelled");
    return null;
  }

  // Insert character into database (build columns dynamically so creator_id can be included)
  try {
    const cols = [];
    const placeholders = [];
    const values = [];

    const add = (colName, val) => {
      values.push(val);
      cols.push(colName);
      placeholders.push(`$${values.length}`);
    };

    // Required: name
    add("name", characterData.name);

    // Optional fields
    if (characterData.creator_id) add("creator_id", characterData.creator_id);
    if (characterData.title) add("title", characterData.title);
    if (characterData.description)
      add("description", characterData.description);
    if (characterData.personality)
      add("personality", characterData.personality);
    if (characterData.scenario) add("scenario", characterData.scenario);
    if (characterData.greeting) add("greeting", characterData.greeting);
    if (characterData.avatar_url) add("avatar_url", characterData.avatar_url);
    if (characterData.tags) add("tags", characterData.tags);
    // is_public included (even if null) - default to false if not provided
    add(
      "is_public",
      characterData.is_public !== null && characterData.is_public !== undefined
        ? characterData.is_public
        : false
    );

    // Always set is_active = true for new characters
    add("is_active", true);

    if (characterData.book_name) add("book_name", characterData.book_name);

    // chat_count default to 0
    add("chat_count", 0);

    const query = `INSERT INTO characters (${cols.join(
      ", "
    )}) VALUES (${placeholders.join(", ")}) RETURNING *`;

    const result = await postgres.query(query, values);

    if (result.rows.length > 0) {
      console.log("🎉 Character created successfully!");
      console.log(`📝 Character ID: ${result.rows[0].id}`);
      console.log(`✨ Name: ${result.rows[0].name}`);
      return result.rows[0];
    }
  } catch (error) {
    console.error("❌ Error creating character:", error.message);
    return null;
  }
}

// Main application flow
async function main() {
  console.log("🎭 PRIYANVADA AI - Character Editor");
  console.log("═".repeat(50));

  try {
    // Test database connection
    await postgres.query("SELECT 1");
    console.log("✅ Database connected successfully\n");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1);
  }

  while (true) {
    try {
      // Get all characters
      const characters = await getCharacters();

      if (characters.length === 0) {
        console.log("❌ No characters found");
        break;
      }

      // Display characters
      displayCharacters(characters);

      // Ask user to select character or create new
      const charChoice = await askQuestion(
        '\n🎯 Enter character number, "new" to create, or "q" to quit: '
      );

      if (charChoice.toLowerCase() === "q") {
        break;
      }

      if (charChoice.toLowerCase() === "new") {
        await createNewCharacter();
        continue;
      }

      const charIndex = parseInt(charChoice) - 1;
      if (charIndex < 0 || charIndex >= characters.length) {
        console.log("❌ Invalid character number");
        continue;
      }

      const selectedCharacter = characters[charIndex];
      console.log(`\n🎭 Selected: ${selectedCharacter.name}`);

      // Show character details and fields
      const fields = displayCharacterDetails(selectedCharacter);

      // Ask user to select field to edit
      const fieldChoice = await askQuestion(
        '\n✏️  Enter field number to edit (or "b" to go back): '
      );

      if (fieldChoice.toLowerCase() === "b") {
        continue;
      }

      const fieldNum = parseInt(fieldChoice);
      if (!fields[fieldNum]) {
        console.log("❌ Invalid field number");
        continue;
      }

      const selectedField = fields[fieldNum];
      console.log(`\n📝 Editing: ${selectedField.label}`);
      console.log(`Current value: ${selectedField.value}`);

      // Special handling for different field types
      let prompt = `\n💬 Enter new value for ${selectedField.label}: `;

      if (selectedField.key === "tags") {
        prompt = "\n💬 Enter tags (comma-separated): ";
      } else if (
        selectedField.key === "is_public" ||
        selectedField.key === "is_active"
      ) {
        prompt = "\n💬 Enter true/false (or yes/no): ";
      } else if (selectedField.key === "example_messages") {
        prompt = "\n💬 Enter JSON array (or leave empty to skip): ";
      } else if (selectedField.key === "avatar_url") {
        prompt =
          "\n💬 Enter avatar URL (image URL or data:image/... for base64): ";
        console.log(
          "💡 Tip: Use image URLs (https://...) or base64 data URLs (data:image/... )"
        );
      }

      // Fields that accept multiline input when editing
      const MULTILINE_FIELDS_EDIT = [
        "description",
        "personality",
        "scenario",
        "greeting",
        "example_messages",
      ];

      let newValue;
      if (MULTILINE_FIELDS_EDIT.includes(selectedField.key)) {
        // Use multiline input for these fields
        newValue = await askMultiline(
          `\n💬 Enter new value for ${selectedField.label}:`
        );
      } else {
        newValue = await askQuestion(prompt);
      }

      if (newValue === "") {
        console.log("⏭️  Skipping field update");
        continue;
      }

      // Confirm update
      const confirm = await askQuestion(
        `\n❓ Confirm update "${selectedField.label}" to "${newValue}"? (y/n): `
      );

      if (confirm.toLowerCase() !== "y" && confirm.toLowerCase() !== "yes") {
        console.log("❌ Update cancelled");
        continue;
      }

      // Update character
      const updatedCharacter = await updateCharacterField(
        selectedCharacter.id,
        selectedField.key,
        newValue
      );

      if (updatedCharacter) {
        console.log(`\n🎉 Successfully updated ${selectedField.label}!`);
        console.log(`New value: ${newValue}`);
      }

      // Ask if user wants to continue editing
      const continueEditing = await askQuestion(
        "\n🔄 Continue editing? (y/n): "
      );
      if (
        continueEditing.toLowerCase() !== "y" &&
        continueEditing.toLowerCase() !== "yes"
      ) {
        break;
      }
    } catch (error) {
      console.error("❌ An error occurred:", error.message);
    }
  }

  console.log("\n👋 Thanks for using the Character Editor!");
  rl.close();
  process.exit(0);
}

// Handle process termination
process.on("SIGINT", () => {
  console.log("\n\n👋 Goodbye!");
  rl.close();
  process.exit(0);
});

// Run the application
if (require.main === module) {
  main().catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  });
}
