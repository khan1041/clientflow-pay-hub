

// import { NextResponse } from "next/server";
// import type { NextRequest } from "next/server";
// import { SESSION_COOKIE_NAME, verifySessionTokenEdge } from "@/lib/auth";

// export async function middleware(request: NextRequest) {
//   const { pathname } = request.nextUrl;

//   if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
//     const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
//     const session = await verifySessionTokenEdge(token);

//     if (!session || session.role !== "ADMIN") {
//       return NextResponse.redirect(new URL("/admin/login", request.url));
//     }
//   }

//   return NextResponse.next();
// }

// export const config = {
//   matcher: ["/admin/:path*"],
// };


// token css 



import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionTokenEdge } from "@/lib/auth-edge";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await verifySessionTokenEdge(token);

    if (!session || session.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};


