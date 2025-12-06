"use server";

import { validateAdminCredentials, createAdminSession } from "@/lib/admin-auth";

export async function adminLogin(username, password) {
  // Artificial delay to prevent timing attacks and show loading state
  await new Promise((resolve) => setTimeout(resolve, 800));

  console.log("Login attempt for:", username);
  const isValid = validateAdminCredentials(username, password);
  console.log("Credentials valid:", isValid);

  if (isValid) {
    await createAdminSession();
    return { success: true };
  }

  return { success: false, message: "Invalid username or password" };
}
