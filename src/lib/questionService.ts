import { postFormData } from "@/lib/apiClient";

export const questionService = {
  store: (formData: FormData) => postFormData("/api/v1/questions/store", formData),
  storeBulk: (formData: FormData) =>
    postFormData("/api/v1/questions/store/bulk", formData),
};
