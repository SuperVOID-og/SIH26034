import { InspectionResponse } from "../types/api";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export class APIError extends Error {
  constructor(public status: number, public message: string) {
    super(message);
    this.name = "APIError";
  }
}

async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  
  const headers = {
    ...options.headers,
  };

  // Only set application/json if not sending FormData
  if (!(options.body instanceof FormData)) {
    (headers as any)["Content-Type"] = "application/json";
  }

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let errorMessage = "An error occurred";
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch {
      // Ignore JSON parse errors on error responses
    }
    throw new APIError(response.status, errorMessage);
  }

  return response.json();
}

export const api = {
  createInspection: async (product_category?: string, package_context: string = "retail"): Promise<InspectionResponse> => {
    return fetchAPI<InspectionResponse>("/api/inspections/", {
      method: "POST",
      body: JSON.stringify({ product_category, package_context }),
    });
  },

  listInspections: async (skip: number = 0, limit: number = 100): Promise<InspectionResponse[]> => {
    return fetchAPI<InspectionResponse[]>(`/api/inspections/?skip=${skip}&limit=${limit}`);
  },

  getInspection: async (id: number): Promise<InspectionResponse> => {
    return fetchAPI<InspectionResponse>(`/api/inspections/${id}`);
  },

  uploadImages: async (id: number, files: File[]): Promise<InspectionResponse> => {
    const formData = new FormData();
    files.forEach(file => formData.append("files", file));
    
    return fetchAPI<InspectionResponse>(`/api/inspections/${id}/images`, {
      method: "POST",
      body: formData,
    });
  },

  extractData: async (id: number): Promise<InspectionResponse> => {
    return fetchAPI<InspectionResponse>(`/api/inspections/${id}/extract`, {
      method: "POST",
    });
  },

  getReviewData: async (id: number): Promise<{ extracted_data: any, verified_data: any, status: string }> => {
    return fetchAPI<{ extracted_data: any, verified_data: any, status: string }>(`/api/inspections/${id}/review`);
  },

  submitReview: async (id: number, review: any): Promise<InspectionResponse> => {
    return fetchAPI<InspectionResponse>(`/api/inspections/${id}/review`, {
      method: "POST",
      body: JSON.stringify(review),
    });
  },

  evaluateCompliance: async (id: number): Promise<InspectionResponse> => {
    return fetchAPI<InspectionResponse>(`/api/inspections/${id}/evaluate`, {
      method: "POST",
    });
  },

  deleteInspection: async (id: number): Promise<{ deleted: boolean, inspection_id: number }> => {
    return fetchAPI<{ deleted: boolean, inspection_id: number }>(`/api/inspections/${id}`, {
      method: "DELETE",
    });
  }
};
