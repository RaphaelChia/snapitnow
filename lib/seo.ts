const DEFAULT_SITE_URL = "http://localhost:3000";

function parseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

export function getSiteUrl(): URL {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL;
  if (envUrl) {
    const parsed = parseUrl(envUrl);
    if (parsed) return parsed;
  }

  return new URL(DEFAULT_SITE_URL);
}

export function absoluteUrl(pathname: string): string {
  const base = getSiteUrl();
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return new URL(normalizedPath, base).toString();
}

