"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";

export default function LoginPage() {
  const [error, action, pending] = useActionState(loginAction, null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-[360px] flex flex-col gap-8">
        {/* Logo area */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-foreground text-background font-bold text-lg mb-4">
            Т
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Табель</h1>
          <p className="mt-1 text-sm text-muted-foreground">Войдите в систему</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-7 shadow-sm">
          <form action={action} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login" className="text-sm font-medium text-foreground">
                Логин
              </label>
              <input
                id="login"
                name="login"
                type="text"
                required
                autoFocus
                autoComplete="username"
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20 placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Пароль
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </div>
            {error && (
              <p className="rounded-lg bg-destructive/8 px-3 py-2 text-sm text-destructive">{error}</p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="mt-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
            >
              {pending ? "Вход…" : "Войти"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
