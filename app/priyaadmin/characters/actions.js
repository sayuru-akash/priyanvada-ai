"use server";

import postgres from "@/lib/postgres";

export async function fetchCharacters() {
  try {
    const res = await postgres.query(`
        SELECT * FROM characters 
        ORDER BY is_active DESC, name ASC
    `);

    // Serialize dates
    const data = res.rows.map((c) => ({
      ...c,
      created_at: c.created_at?.toISOString(),
      updated_at: c.updated_at?.toISOString(),
    }));

    return { success: true, data };
  } catch (err) {
    console.error("Error fetching characters:", err);
    return { success: false, error: err.message };
  }
}
export async function createCharacter(data) {
  try {
    const {
      name,
      title,
      description,
      avatar_url,
      personality,
      scenario,
      greeting,
      book_name,
      is_active,
      tags,
    } = data;

    await postgres.query(
      `INSERT INTO characters (
        name, title, description, avatar_url, 
        personality, scenario, greeting, book_name,
        is_active, tags, created_at, updated_at
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
      [
        name,
        title,
        description,
        avatar_url,
        personality || "",
        scenario || "",
        greeting || "",
        book_name || "",
        is_active || false,
        tags || [],
      ]
    );
    return { success: true };
  } catch (e) {
    console.error("Error creating character:", e);
    return { success: false, error: e.message };
  }
}

export async function updateCharacter(id, data) {
  try {
    const fields = [];
    const values = [];
    let idx = 2;

    const allowedFields = [
      "name",
      "title",
      "description",
      "avatar_url",
      "personality",
      "scenario",
      "greeting",
      "book_name",
      "is_active",
      "tags",
      "is_public",
    ];

    for (const [key, val] of Object.entries(data)) {
      if (key === "id") continue;
      if (!allowedFields.includes(key)) continue;

      fields.push(`"${key}" = $${idx++}`);
      values.push(val);
    }

    if (fields.length === 0) return { success: true };

    await postgres.query(
      `UPDATE characters SET ${fields.join(
        ", "
      )}, updated_at = NOW() WHERE id = $1`,
      [id, ...values]
    );
    return { success: true };
  } catch (e) {
    console.error("Error updating character:", e);
    return { success: false, error: e.message };
  }
}

export async function deleteCharacter(id) {
  try {
    await postgres.query("DELETE FROM characters WHERE id = $1", [id]);
    return { success: true };
  } catch (e) {
    console.error("Error deleting character:", e);
    if (e.code === "23503") {
      return {
        success: false,
        error: "Cannot delete character because it has associated chats.",
      };
    }
    return { success: false, error: e.message };
  }
}
