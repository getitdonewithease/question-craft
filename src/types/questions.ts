export interface ExtractedQuestion {
  number?: number;
  content: string;
  options: Array<{
    label: string;
    content: string;
    isCorrect: boolean;
  }>;
  explanation: string | null;
  section?: string | null;
  topic: string | null;
  subtopic?: string | null;
  requiresImage: boolean;
  imageUrl?: string;
}
