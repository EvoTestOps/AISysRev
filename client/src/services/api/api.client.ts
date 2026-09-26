/**
 * Generic API Client for typed-openapi generated code
 *
 * Generated transport for a typed-openapi client.
 * It handles:
 * - Query parameter serialization
 * - Body encoding by `requestFormat` (json / form-data / form-url / binary / text)
 * - Operation headers and request overrides

 *
 * Usage:
 * 1. Import createApi() or api from this file
 * 2. Pass a base URL to createApi() when your runtime owns environment access
 * 3. Customize error handling and headers as needed
 */

import { type Fetcher, type RequestFormat, createApiClient } from "./client.ts";

// Basic configuration. Pass an explicit URL to createApi() in browser-only runtimes.
const API_BASE_URL =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.["API_BASE_URL"] ??
  "https://api.example.com";

const isMutationMethod = (method: string) => ["post", "put", "patch", "delete"].includes(method.toLowerCase());

/** Encode body according to OpenAPI requestBody content type (`requestFormat`). */
const encodeRequestBody = ((requestFormat, body) => {
  if (body === void 0) return {};
  switch (requestFormat) {
    case "form-data": {
      if (body instanceof FormData) return { body };
      const formData = new FormData();
      if (body && typeof body === "object") {
        for (const [key, value] of Object.entries(body)) {
          if (value == null) continue;
          if (value instanceof Blob) {
            formData.append(key, value);
          } else if (Array.isArray(value)) {
            for (const item of value) {
              if (item == null) continue;
              formData.append(key, item instanceof Blob ? item : String(item));
            }
          } else {
            formData.append(key, String(value));
          }
        }
      }
      return { body: formData };
    }
    case "form-url": {
      if (body instanceof URLSearchParams) {
        return { body, contentType: "application/x-www-form-urlencoded" };
      }
      const searchParams = new URLSearchParams();
      if (body && typeof body === "object") {
        for (const [key, value] of Object.entries(body)) {
          if (value == null) continue;
          if (Array.isArray(value)) {
            for (const item of value) {
              if (item != null) searchParams.append(key, String(item));
            }
          } else {
            searchParams.append(key, String(value));
          }
        }
      }
      return { body: searchParams, contentType: "application/x-www-form-urlencoded" };
    }
    case "binary": {
      if (typeof body === "string" || body instanceof Blob || body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
        return { body, contentType: "application/octet-stream" };
      }
      throw new TypeError(
        `requestFormat "binary" expects string | Blob | ArrayBuffer | ArrayBufferView, got ${Object.prototype.toString.call(body)}`,
      );
    }
    case "text":
      return { body: String(body), contentType: "text/plain" };
    case "json":
    default:
      return { body: JSON.stringify(body), contentType: "application/json" };
  }
}) as (requestFormat: RequestFormat, body: unknown) => { body?: BodyInit; contentType?: string };

/**
 * Simple fetcher implementation without external dependencies.
 * Compatible with both ApiClient and EffectApiClient (promise fetcher is wrapped).
 */
export const defaultFetcher: Fetcher["fetch"] = async (input) => {
  const headers = new Headers(input.overrides?.headers);
  // Handle query parameters
  if (input.urlSearchParams) {
    input.url.search = input.urlSearchParams.toString();
  }

  let body: BodyInit | undefined;
  if (isMutationMethod(input.method)) {
    const encoded = encodeRequestBody(input.requestFormat, input.parameters?.body);
    body = encoded.body;
    if (encoded.contentType && !headers.has("content-type")) {
      headers.set("Content-Type", encoded.contentType);
    }
  }

  const serializeParameterValue = (value: unknown, explode: boolean): string => {
    if (Array.isArray(value))
      return value
        .filter((item) => item != null)
        .map(String)
        .join(",");
    if (value && typeof value === "object") {
      const entries = Object.entries(value as Record<string, unknown>).filter(([, item]) => item != null);
      return explode
        ? entries.map(([key, item]) => key + "=" + String(item)).join(",")
        : entries.flatMap(([key, item]) => [key, String(item)]).join(",");
    }
    return String(value);
  };

  // Add custom headers
  if (input.parameters?.header && typeof input.parameters.header === "object") {
    Object.entries(input.parameters.header).forEach(([key, value]) => {
      if (value != null) {
        const style = input.parameterStyles?.header?.[key];
        headers.set(key, serializeParameterValue(value, style?.explode ?? false));
      }
    });
  }

  // Add cookie parameters using their OpenAPI form serialization.
  if (input.parameters?.cookie && typeof input.parameters.cookie === "object") {
    const cookieParts: string[] = [];
    Object.entries(input.parameters.cookie).forEach(([key, value]) => {
      if (value == null) return;
      const style = input.parameterStyles?.cookie?.[key];
      const explode = style?.explode ?? true;
      if (style?.style === "form" && explode && value && typeof value === "object" && !Array.isArray(value)) {
        Object.entries(value as Record<string, unknown>).forEach(([nestedKey, nestedValue]) => {
          if (nestedValue != null) cookieParts.push(nestedKey + "=" + String(nestedValue));
        });
      } else if (style?.style === "form" && explode && Array.isArray(value)) {
        value.forEach((item) => item != null && cookieParts.push(key + "=" + String(item)));
      } else {
        cookieParts.push(key + "=" + serializeParameterValue(value, explode));
      }
    });
    if (cookieParts.length) {
      const existing = headers.get("cookie");
      headers.set("cookie", existing ? existing + "; " + cookieParts.join("; ") : cookieParts.join("; "));
    }
  }

  const response = await fetch(input.url, {
    method: input.method.toUpperCase(),
    ...(body !== undefined && { body }),
    ...input.overrides,
    headers,
  });

  return response;
};

/** Create a client with an explicit base URL when your runtime owns environment access. */
export const createApi = (baseUrl = API_BASE_URL) => createApiClient({ fetch: defaultFetcher }, baseUrl);

export const api = createApi();
