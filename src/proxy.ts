import { auth } from "@/auth";
import { NextResponse } from "next/server";

export const proxy = auth((req) => {
  const user = req.auth?.user;

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (req.nextUrl.pathname.startsWith("/admin") && user.role === "FOREMAN") {
    return NextResponse.redirect(new URL("/timesheet", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
