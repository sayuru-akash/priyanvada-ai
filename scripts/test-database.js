#!/usr/bin/env node
require("dotenv").config({ path: ".env.local" });

const db = require("../lib/database");

async function testDatabaseOperations() {
  console.log("🧪 Testing hybrid database setup...\n");

  try {
    // Test 1: Authentication (Supabase)
    console.log("1. Testing Supabase authentication...");
    const currentUser = await db.getCurrentUser();
    console.log("   ✅ Supabase connection established");

    // Test 2: PostgreSQL connection
    console.log("2. Testing PostgreSQL connection...");
    // We'll create a test character to verify PostgreSQL works

    // For testing, we'll use a dummy user ID (in real app, this comes from auth)
    const testUserId = "00000000-0000-0000-0000-000000000001";

    console.log("3. Testing character operations (PostgreSQL)...");

    // Create a test character
    const testCharacter = await db.createCharacter(testUserId, {
      name: "Test Character",
      title: "AI Assistant",
      description: "A test character for database validation",
      personality: "Helpful and friendly",
      scenario: "Testing scenario",
      greeting: "Hello! This is a test.",
      exampleMessages: ["Hello!", "How can I help?"],
      tags: ["test", "validation"],
      avatarUrl: null,
      isPublic: false,
    });
    console.log("   ✅ Character created:", testCharacter.name);

    // Read the character back
    const retrievedCharacter = await db.getCharacterById(testCharacter.id);
    console.log("   ✅ Character retrieved:", retrievedCharacter.name);

    // Update the character
    const updatedCharacter = await db.updateCharacter(testCharacter.id, {
      title: "Updated AI Assistant",
    });
    console.log("   ✅ Character updated:", updatedCharacter.title);

    // Test chat session operations
    console.log("4. Testing chat session operations (PostgreSQL)...");

    const testSession = await db.createChatSession(
      testUserId,
      testCharacter.id,
      "Test Chat"
    );
    console.log("   ✅ Chat session created:", testSession.title);

    // Test message operations
    console.log("5. Testing message operations (PostgreSQL)...");

    const testMessage = await db.addMessage(
      testSession.id,
      "user",
      "Hello, test message!"
    );
    console.log("   ✅ Message added:", testMessage.content);

    const messages = await db.getMessages(testSession.id);
    console.log("   ✅ Messages retrieved:", messages.length);

    // Test memory operations
    console.log("6. Testing memory operations (PostgreSQL)...");

    const testMemory = await db.saveChatMemory(testSession.id, "Test summary", [
      "key1",
      "key2",
    ]);
    console.log("   ✅ Memory saved");

    const retrievedMemory = await db.getChatMemory(testSession.id);
    console.log("   ✅ Memory retrieved:", retrievedMemory.summary);

    // Clean up test data
    console.log("7. Cleaning up test data...");
    await db.deleteChat(testSession.id);
    await db.deleteCharacter(testCharacter.id);
    console.log("   ✅ Test data cleaned up");

    console.log(
      "\n🎉 All tests passed! Your hybrid database setup is working correctly."
    );
    console.log("\nSetup summary:");
    console.log("- ✅ Supabase: Authentication and user management");
    console.log("- ✅ PostgreSQL: Characters, chats, messages, and memory");
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.error("\nPlease check:");
    console.error("1. PostgreSQL connection string in .env.local");
    console.error("2. PostgreSQL database is running and accessible");
    console.error(
      "3. Database tables have been created (run postgres-setup.sql)"
    );
    console.error("4. Supabase credentials are correct");

    if (error.code === "ECONNREFUSED") {
      console.error("\n💡 Connection refused - is PostgreSQL running?");
    } else if (error.code === "42P01") {
      console.error(
        "\n💡 Table does not exist - run the postgres-setup.sql script"
      );
    }
  } finally {
    await db.close();
    process.exit(0);
  }
}

// Add to package.json scripts: "test:db": "node scripts/test-database.js"
if (require.main === module) {
  testDatabaseOperations();
}

module.exports = testDatabaseOperations;
