import { NextRequest, NextResponse } from "next/server";

export function GET(req: NextRequest) {
  const url = req.nextUrl;
  const params = new URLSearchParams(url.searchParams);
  const appRedirect = params.get("app_redirect");

  // Remove the hint from the forwarded query
  params.delete("app_redirect");
  const rest = params.toString();

  if (appRedirect) {
    const sep = appRedirect.includes("?") ? (rest ? "&" : "") : (rest ? "?" : "");
    const final = `${appRedirect}${sep}${rest}`;
    return NextResponse.redirect(final, { status: 302 });
  }

  // Fallback to the app's home when no deep link hint is present
  return NextResponse.redirect(new URL("/", url), { status: 302 });
}
