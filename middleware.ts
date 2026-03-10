import { NextResponse, type NextRequest } from "next/server";

type AppRole = "ADMIN" | "TEACHER" | "STUDENT";

function getRequiredRole(pathname: string): AppRole | null {
  if (pathname.startsWith("/admin")) return "ADMIN";
  if (pathname.startsWith("/teacher")) return "TEACHER";
  if (pathname.startsWith("/student")) return "STUDENT";
  return null;
}

const dashboardMap: Record<AppRole, string> = {
  ADMIN: "/admin/dashboard",
  TEACHER: "/teacher/dashboard",
  STUDENT: "/student/dashboard",
};

async function getSessionRole(request: NextRequest): Promise<AppRole | null> {
  try {
    const sessionResponse = await fetch(`${request.nextUrl.origin}/api/auth/get-session`, {
      method: "GET",
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
      // Cache session untuk mengurangi API calls
      cache: "force-cache",
      // Tambahkan timeout
      signal: AbortSignal.timeout(3000),
    });

    if (!sessionResponse.ok) {
      return null;
    }

    const data = (await sessionResponse.json()) as {
      user?: { role?: string | null };
    };

    const role = data?.user?.role?.toUpperCase();
    if (role === "ADMIN" || role === "TEACHER" || role === "STUDENT") {
      return role;
    }
  } catch (error) {
    // Log error tapi jangan block request
    console.error("Middleware session check failed:", error);
    return null;
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requiredRole = getRequiredRole(pathname);

  if (!requiredRole) {
    return NextResponse.next();
  }

  // Skip session check untuk static assets
  if (pathname.includes(".") || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  const role = await getSessionRole(request);

  if (!role) {
    const url = new URL("/", request.url);
    url.searchParams.set("error", "unauthorized");
    return NextResponse.redirect(url);
  }

  if (role !== requiredRole) {
    const redirectPath = dashboardMap[role] ?? "/";
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*", "/student/:path*"],
};
