type ApiErrorBody = {
  message?: string;
  error?: { message?: string };
  errors?: Record<string, string[]>;
};

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

const normalizeBaseUrl = (baseUrl: string) => baseUrl.replace(/\/+$/, "");

const buildUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) return path;
  const base = normalizeBaseUrl(API_BASE_URL);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${normalizedPath}` : normalizedPath;
};

const parseErrorMessage = async (response: Response) => {
  try {
    const data = (await response.clone().json()) as ApiErrorBody;

    if (data?.message) {
      return data.message;
    }

    if (data?.error?.message) {
      return data.error.message;
    }

    if (data?.errors) {
      const validationMessages = Object.values(data.errors)
        .flat()
        .filter(Boolean);

      if (validationMessages.length > 0) {
        return validationMessages.join(", ");
      }
    }

    return `Server error: ${response.status} ${response.statusText}`;
  } catch {
    return `Server error: ${response.status} ${response.statusText}`;
  }
};

export const postFormData = async <T>(path: string, formData: FormData) => {
  const response = await fetch(buildUrl(path), {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  if (response.status === 204) return null as T | null;

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return null as T | null;
  }

  return (await response.json()) as T;
};

export const getJson = async <T>(path: string) => {
  const response = await fetch(buildUrl(path), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  if (response.status === 204) return null as T | null;

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return null as T | null;
  }

  return (await response.json()) as T;
};
