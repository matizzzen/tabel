"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export async function loginAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  try {
    await signIn("credentials", {
      login: formData.get("login"),
      password: formData.get("password"),
      redirectTo: "/timesheet",
    });
    return null;
  } catch (err) {
    if (err instanceof AuthError) return "Неверный логин или пароль";
    throw err;
  }
}
