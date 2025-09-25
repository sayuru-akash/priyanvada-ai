#!/usr/bin/env node
require("dotenv").config({ path: ".env.local" });

const postgres = require("../lib/postgres");

async function testPostgreSQLConnection() {
  console.log("🧪 Testing PostgreSQL connection...\n");

  try {
    // Test connection
    console.log("1. Testing PostgreSQL connection...");
    const connectionResult = await postgres.testConnection();

    if (connectionResult.success) {
      console.log("   ✅ PostgreSQL connection established");
      console.log(`   📅 Database time: ${connectionResult.time}`);
      console.log(
        `   🗄️  PostgreSQL version: ${connectionResult.version.split(",")[0]}`
      );
    } else {
      throw new Error(connectionResult.error);
    }

    // For testing, we'll use a dummy user ID (in real app, this comes from Supabase auth)
    const testUserId = "00000000-0000-0000-0000-000000000001";

    console.log("\n2. Testing character operations (PostgreSQL)...");

    // Create a test character
    const createCharacterQuery = `
      INSERT INTO characters (
        creator_id, name, title, description, personality, scenario, 
        greeting, example_messages, tags, avatar_url, is_public
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const characterValues = [
      testUserId,
      "Test Character",
      "AI Assistant",
      "A test character for database validation",
      "Helpful and friendly",
      "Testing scenario",
      "Hello! This is a test.",
      JSON.stringify(["Hello!", "How can I help?"]),
      ["test", "validation"],
      null,
      false,
    ];

    const characterResult = await postgres.query(
      createCharacterQuery,
      characterValues
    );
    const testCharacter = characterResult.rows[0];
    console.log("   ✅ Character created:", testCharacter.name);

    // Read the character back
    const getCharacterQuery = `SELECT * FROM characters WHERE id = $1`;
    const getCharacterResult = await postgres.query(getCharacterQuery, [
      testCharacter.id,
    ]);
    const retrievedCharacter = getCharacterResult.rows[0];
    console.log("   ✅ Character retrieved:", retrievedCharacter.name);

    // Update the character
    const updateCharacterQuery = `
      UPDATE characters 
      SET title = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    const updateCharacterResult = await postgres.query(updateCharacterQuery, [
      "Updated AI Assistant",
      testCharacter.id,
    ]);
    const updatedCharacter = updateCharacterResult.rows[0];
    console.log("   ✅ Character updated:", updatedCharacter.title);

    // Test chat session operations
    console.log("\n3. Testing chat session operations (PostgreSQL)...");

    const createSessionQuery = `
      INSERT INTO chat_sessions (user_id, character_id, title)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const sessionResult = await postgres.query(createSessionQuery, [
      testUserId,
      testCharacter.id,
      "Test Chat",
    ]);
    const testSession = sessionResult.rows[0];
    console.log("   ✅ Chat session created:", testSession.title);

    // Test message operations
    console.log("\n4. Testing message operations (PostgreSQL)...");

    const addMessageQuery = `
      INSERT INTO messages (session_id, role, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const messageResult = await postgres.query(addMessageQuery, [
      testSession.id,
      "user",
      "Hello, test message!",
    ]);
    const testMessage = messageResult.rows[0];
    console.log("   ✅ Message added:", testMessage.content);

    const getMessagesQuery = `SELECT * FROM messages WHERE session_id = $1`;
    const messagesResult = await postgres.query(getMessagesQuery, [
      testSession.id,
    ]);
    console.log("   ✅ Messages retrieved:", messagesResult.rows.length);

    // Test memory operations
    console.log("\n5. Testing memory operations (PostgreSQL)...");

    const saveMemoryQuery = `
      INSERT INTO chat_memory (session_id, summary, key_points)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const memoryResult = await postgres.query(saveMemoryQuery, [
      testSession.id,
      "Test summary",
      JSON.stringify(["key1", "key2"]),
    ]);
    const testMemory = memoryResult.rows[0];
    console.log("   ✅ Memory saved");

    const getMemoryQuery = `SELECT * FROM chat_memory WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1`;
    const retrievedMemoryResult = await postgres.query(getMemoryQuery, [
      testSession.id,
    ]);
    const retrievedMemory = retrievedMemoryResult.rows[0];
    console.log("   ✅ Memory retrieved:", retrievedMemory.summary);

    // Clean up test data
    console.log("\n6. Cleaning up test data...");
    await postgres.query("DELETE FROM chat_sessions WHERE id = $1", [
      testSession.id,
    ]);
    await postgres.query(
      "UPDATE characters SET is_active = false WHERE id = $1",
      [testCharacter.id]
    );
    console.log("   ✅ Test data cleaned up");

    console.log(
      "\n🎉 PostgreSQL database test passed! Your database is ready."
    );
    console.log("\nNext steps:");
    console.log(
      "1. Add your Supabase credentials to .env.local for authentication"
    );
    console.log("2. Run: npm run dev");
    console.log(
      "3. Test the full application with user registration and character creation"
    );
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.error("\nPlease check:");
    console.error("1. PostgreSQL connection string in .env.local");
    console.error("2. PostgreSQL database is running and accessible");
    console.error(
      "3. Database tables have been created (run postgres-setup.sql)"
    );

    if (error.code === "ECONNREFUSED") {
      console.error("\n💡 Connection refused - is PostgreSQL server running?");
    } else if (error.code === "42P01") {
      console.error(
        "\n💡 Table does not exist - run the postgres-setup.sql script"
      );
    }
  } finally {
    await postgres.close();
    process.exit(0);
  }
}

if (require.main === module) {
  testPostgreSQLConnection();
}

module.exports = testPostgreSQLConnection;
