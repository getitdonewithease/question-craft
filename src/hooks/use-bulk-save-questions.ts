import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { ExtractedQuestion } from "@/types/questions";
import { questionService } from "@/lib/questionService";

type EditableOption = ExtractedQuestion["options"][number] & {
  imageFile?: File | null;
};

export type EditableQuestion = Omit<ExtractedQuestion, "options"> & {
  id: string;
  examType: string;
  subject: string;
  examYear: string;
  section?: string;
  source?: string;
  weight: number;
  imageFile?: File | null;
  options: EditableOption[];
};

const dataUrlToFile = (dataUrl?: string) => {
  if (!dataUrl || !dataUrl.startsWith("data:")) return null;
  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  if (!match) return null;
  const contentType = match[1] || "image/png";
  const base64Data = match[2];
  const byteString = atob(base64Data);
  const byteNumbers = new Array(byteString.length);
  for (let i = 0; i < byteString.length; i += 1) {
    byteNumbers[i] = byteString.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const extension = contentType.split("/")[1] || "png";
  return new File([byteArray], `question-image.${extension}`, {
    type: contentType,
  });
};

const validateQuestions = (questions: EditableQuestion[]) => {
  const errors: string[] = [];

  questions.forEach((q, index) => {
    if (!q.content.trim()) {
      errors.push(`Question ${index + 1}: Content is required`);
    }
    if (q.options.length < 2) {
      errors.push(`Question ${index + 1}: At least 2 options are required`);
    }
    const allOptionsHaveContent = q.options.every((opt) => opt.content.trim());
    if (!allOptionsHaveContent) {
      errors.push(`Question ${index + 1}: All options must have content`);
    }
  });

  return errors;
};

const buildBulkFormData = (questions: EditableQuestion[]) => {
  const formData = new FormData();

  questions.forEach((q, qIndex) => {
    if (q.number != null) {
      formData.append(`questions[${qIndex}].questionNumber`, String(q.number));
    }
    formData.append(`questions[${qIndex}].content`, q.content);
    formData.append(`questions[${qIndex}].section`, q.section?.trim() || "");
    formData.append(`questions[${qIndex}].topic`, q.topic?.trim() || "");
    formData.append(`questions[${qIndex}].subTopic`, q.subtopic?.trim() || "");
    formData.append(`questions[${qIndex}].source`, q.source?.trim() || "");
    formData.append(`questions[${qIndex}].weight`, String(q.weight));
    formData.append(
      `questions[${qIndex}].solution`,
      q.explanation?.trim() || ""
    );
    formData.append(`questions[${qIndex}].examType`, q.examType);
    formData.append(`questions[${qIndex}].subject`, q.subject);
    formData.append(`questions[${qIndex}].examYear`, q.examYear);

    const questionImageFile = q.imageFile || dataUrlToFile(q.imageUrl);
    if (questionImageFile) {
      formData.append(`questions[${qIndex}].file`, questionImageFile);
    }

    q.options.forEach((opt, optIndex) => {
      formData.append(
        `questions[${qIndex}].optionRequests[${optIndex}].label`,
        opt.label
      );
      formData.append(
        `questions[${qIndex}].optionRequests[${optIndex}].content`,
        opt.content
      );
      formData.append(
        `questions[${qIndex}].optionRequests[${optIndex}].isCorrect`,
        String(opt.isCorrect)
      );
      if (opt.imageFile) {
        formData.append(
          `questions[${qIndex}].optionRequests[${optIndex}].file`,
          opt.imageFile
        );
      }
    });
  });

  return formData;
};

type UseBulkSaveQuestionsParams = {
  questions: EditableQuestion[];
  onSuccess: () => void;
};

export const useBulkSaveQuestions = ({
  questions,
  onSuccess,
}: UseBulkSaveQuestionsParams) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const saveBulkQuestions = async () => {
    const errors = validateQuestions(questions);

    if (errors.length > 0) {
      toast({
        title: "Validation Errors",
        description:
          errors.slice(0, 3).join(", ") + (errors.length > 3 ? "..." : ""),
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const formData = buildBulkFormData(questions);
      await questionService.storeBulk(formData);

      toast({
        title: "Success!",
        description: `Successfully saved ${questions.length} question(s)`,
      });

      onSuccess();
    } catch (error) {
      console.error("Error saving questions:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to save questions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return { isSaving, saveBulkQuestions };
};

export type { EditableOption };
