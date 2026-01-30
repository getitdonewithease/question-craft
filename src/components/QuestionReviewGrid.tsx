import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Trash2, CheckCircle2, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ExtractedQuestion } from "@/lib/gemini";
import { cn, getAccessToken } from "@/lib/utils";

interface EditableQuestion extends ExtractedQuestion {
  id: string;
  examType: string;
  subject: string;
  examYear: string;
  section?: string;
  weight: number;
}

interface QuestionReviewGridProps {
  questions: ExtractedQuestion[];
  examType: string;
  subject: string;
  examYear: string;
  onBack: () => void;
  onSaveComplete: () => void;
}

export const QuestionReviewGrid = ({
  questions: initialQuestions,
  examType,
  subject,
  examYear,
  onBack,
  onSaveComplete,
}: QuestionReviewGridProps) => {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<EditableQuestion[]>(
    initialQuestions.map((q, index) => ({
      ...q,
      id: crypto.randomUUID(),
      examType,
      subject,
      examYear,
      section: "",
      weight: 1,
    }))
  );
  const [isSaving, setIsSaving] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  const updateQuestion = (id: string, updates: Partial<EditableQuestion>) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...updates } : q))
    );
  };

  const updateOption = (
    questionId: string,
    optionIndex: number,
    updates: Partial<EditableQuestion["options"][0]>
  ) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === questionId) {
          const newOptions = [...q.options];
          newOptions[optionIndex] = { ...newOptions[optionIndex], ...updates };
          return { ...q, options: newOptions };
        }
        return q;
      })
    );
  };

  const setCorrectAnswer = (questionId: string, optionLabel: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === questionId) {
          return {
            ...q,
            options: q.options.map((opt) => ({
              ...opt,
              isCorrect: opt.label === optionLabel,
            })),
          };
        }
        return q;
      })
    );
  };

  const addOption = (questionId: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === questionId) {
          const nextLabel = String.fromCharCode(65 + q.options.length);
          return {
            ...q,
            options: [
              ...q.options,
              {
                label: nextLabel,
                content: "",
                isCorrect: false,
              },
            ],
          };
        }
        return q;
      })
    );
  };

  const removeOption = (questionId: string, optionIndex: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === questionId) {
          const filtered = q.options.filter((_, i) => i !== optionIndex);
          const relabeled = filtered.map((opt, idx) => ({
            ...opt,
            label: String.fromCharCode(65 + idx),
          }));
          return { ...q, options: relabeled };
        }
        return q;
      })
    );
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const toImageRequest = (preview?: string) => {
    if (!preview || !preview.startsWith("data:")) return null;
    const [meta, data] = preview.split(",");
    const match = meta.match(/data:(.*?);base64/);
    const contentType = match?.[1] || "image/png";
    const extension = contentType.split("/")[1] || "png";

    return {
      base64String: data || "",
      fileName: `question-image.${extension}`,
      contentType,
      extension,
    };
  };

  const handleBulkSave = async () => {
    // Validation
    const errors: string[] = [];

    questions.forEach((q, index) => {
      if (!q.content.trim()) {
        errors.push(`Question ${index + 1}: Content is required`);
      }
      if (q.options.length < 2) {
        errors.push(`Question ${index + 1}: At least 2 options are required`);
      }
      const hasCorrect = q.options.some((opt) => opt.isCorrect);
      if (!hasCorrect) {
        errors.push(`Question ${index + 1}: Please mark one option as correct`);
      }
      const allOptionsHaveContent = q.options.every((opt) => opt.content.trim());
      if (!allOptionsHaveContent) {
        errors.push(`Question ${index + 1}: All options must have content`);
      }
    });

    if (errors.length > 0) {
      toast({
        title: "Validation Errors",
        description: errors.slice(0, 3).join(", ") + (errors.length > 3 ? "..." : ""),
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Prepare bulk payload matching the expected API structure
      const bulkPayload = {
        questions: questions.map((q) => ({
          content: q.content,
          section: q.section?.trim() || null,
          topic: q.topic?.trim() || null,
          subTopic: null,
          source: null,
          weight: q.weight,
          imageRequest: {
            base64String: "",
            fileName: "",
            contentType: "",
            extension: "",
          },
          solution: q.explanation?.trim() || null,
          examType: q.examType,
          subject: q.subject,
          examYear: q.examYear,
          optionRequests: q.options.map((opt) => ({
            label: opt.label,
            content: opt.content,
            isCorrect: opt.isCorrect,
            imageUrl: "",
          })),
        })),
      };

      // Get access token for authentication
      const accessToken = getAccessToken();
      if (!accessToken) {
        const errorMsg = 
          "Access token not found. To set your token, open the browser console and run:\n\n" +
          "localStorage.setItem('authData', JSON.stringify({\n" +
          "  accessToken: 'YOUR_TOKEN_HERE',\n" +
          "  expirationTime: '2026-03-01T06:02:50.6074824+00:00'\n" +
          "}));\n\n" +
          "Or use: window.setAccessToken('YOUR_TOKEN_HERE', 'EXPIRATION_DATE')\n" +
          "Or set VITE_ACCESS_TOKEN in your .env file.";
        throw new Error(errorMsg);
      }

      // Make bulk API call
      const response = await fetch("https://localhost:7009/api/v1/questions/store/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify(bulkPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error: ${response.status} ${response.statusText}`);
      }

      toast({
        title: "Success!",
        description: `Successfully saved ${questions.length} question(s)`,
      });

      onSaveComplete();
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

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-foreground">
              Review & Edit Extracted Questions
            </h1>
            <p className="text-muted-foreground">
              {questions.length} question(s) extracted. Review and edit before saving.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={onBack} variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleBulkSave}
              disabled={isSaving || questions.length === 0}
              className="gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save All ({questions.length})
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Questions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {questions.map((question, index) => (
            <Card
              key={question.id}
              className={cn(
                "p-4 space-y-4 transition-all",
                expandedQuestion === question.id && "ring-2 ring-primary"
              )}
            >
              {/* Question Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Question {index + 1}</Badge>
                    {question.options.some((opt) => opt.isCorrect) && (
                      <Badge variant="outline" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Answer Set
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{question.examType}</Badge>
                    <Badge variant="outline">{question.subject}</Badge>
                    <Badge variant="outline">{question.examYear}</Badge>
                    {question.topic && (
                      <Badge variant="outline">{question.topic}</Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeQuestion(question.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Question Content */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Question Content</Label>
                <Textarea
                  value={question.content}
                  onChange={(e) =>
                    updateQuestion(question.id, { content: e.target.value })
                  }
                  className="min-h-[100px] resize-none"
                  placeholder="Question text..."
                />
              </div>

              {/* Section & Weight */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Section (Optional)</Label>
                  <Input
                    value={question.section || ""}
                    onChange={(e) =>
                      updateQuestion(question.id, { section: e.target.value })
                    }
                    placeholder="e.g., Algebra"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Weight</Label>
                  <Input
                    type="number"
                    min="1"
                    value={question.weight}
                    onChange={(e) =>
                      updateQuestion(question.id, {
                        weight: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>
              </div>

              {/* Options */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Options</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addOption(question.id)}
                    disabled={question.options.length >= 8}
                  >
                    Add Option
                  </Button>
                </div>
                <div className="space-y-2">
                  {question.options.map((option, optIndex) => (
                    <div
                      key={optIndex}
                      className={cn(
                        "flex items-start gap-2 p-2 rounded-md border",
                        option.isCorrect
                          ? "border-success bg-success/5"
                          : "border-border"
                      )}
                    >
                      <RadioGroup
                        value={option.isCorrect ? option.label : ""}
                        onValueChange={() =>
                          setCorrectAnswer(question.id, option.label)
                        }
                      >
                        <RadioGroupItem
                          value={option.label}
                          id={`${question.id}-${option.label}`}
                          className="mt-1"
                        />
                      </RadioGroup>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={option.isCorrect ? "default" : "outline"}
                            className="w-6 h-6 p-0 flex items-center justify-center"
                          >
                            {option.label}
                          </Badge>
                          <Input
                            value={option.content}
                            onChange={(e) =>
                              updateOption(question.id, optIndex, {
                                content: e.target.value,
                              })
                            }
                            placeholder={`Option ${option.label}...`}
                            className="flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeOption(question.id, optIndex)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Solution/Explanation */}
              {question.explanation && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Solution</Label>
                  <Textarea
                    value={question.explanation}
                    onChange={(e) =>
                      updateQuestion(question.id, { explanation: e.target.value })
                    }
                    className="min-h-[80px] resize-none"
                    placeholder="Solution explanation..."
                  />
                </div>
              )}
            </Card>
          ))}
        </div>

        {questions.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No questions to review.</p>
          </Card>
        )}
      </div>
    </div>
  );
};

