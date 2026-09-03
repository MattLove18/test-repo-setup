export function readWidgetToken(): string | undefined {
  const token = process.env.WIDGET_TOKEN?.trim();
  return token || undefined;
}

export function authorizeWidget(request: Request, token: string | undefined): boolean {
  if (!token) return true;
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token") ?? "";
  const headerToken = request.headers.get("x-widget-token") ?? "";
  return bearer === token || queryToken === token || headerToken === token;
}
