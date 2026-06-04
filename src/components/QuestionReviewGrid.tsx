import { useState } from "react";
import DOMPurify from "dompurify";
import katex from "katex";
import "katex/dist/katex.min.css";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Save,
  Trash2,
  CheckCircle2,
  Loader2,
  X,
  Pencil,
  Eye,
} from "lucide-react";
import type { ExtractedQuestion } from "@/types/questions";
import { cn } from "@/lib/utils";
import { useBulkSaveQuestions } from "@/hooks/use-bulk-save-questions";
import type { EditableOption, EditableQuestion } from "@/hooks/use-bulk-save-questions";
import { useTopics } from "@/hooks/use-topics";
import { TopicSelect } from "@/components/TopicSelect";
import { questionService } from "@/lib/questionService";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/ImageUpload";

interface QuestionReviewGridProps {
  questions: ExtractedQuestion[];
  examType: string;
  subject: string;
  examYear: string;
  onBack: () => void;
  onSaveComplete: () => void;
}

const latexPattern =
  /(\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$([^$\n]+?)\$)/g;

const renderLatexInHtml = (value: string) =>
  value.replace(
    latexPattern,
    (match, _full, blockDollar, blockBracket, inlineParen, inlineDollar) => {
      const expression =
        blockDollar || blockBracket || inlineParen || inlineDollar;
      const displayMode = Boolean(blockDollar || blockBracket);

      try {
        return katex.renderToString(expression.trim(), {
          displayMode,
          throwOnError: false,
          strict: "ignore",
          trust: false,
        });
      } catch {
        return match;
      }
    }
  );

const renderFormattedHtml = (value: string) => {
  const sanitized = DOMPurify.sanitize(value, {
    ALLOWED_TAGS: [
      "b",
      "strong",
      "i",
      "em",
      "u",
      "s",
      "sup",
      "sub",
      "br",
      "p",
      "span",
      "ul",
      "ol",
      "li",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
    ],
    ALLOWED_ATTR: [],
  });

  return renderLatexInHtml(sanitized);
};

const FormattedText = ({
  value,
  className,
}: {
  value?: string;
  className?: string;
}) => {
  if (!value?.trim()) {
    return <p className="text-sm text-muted-foreground">Not provided.</p>;
  }

  return (
    <div
      className={cn(
        "prose prose-sm max-w-none text-foreground leading-relaxed",
        className
      )}
      dangerouslySetInnerHTML={{ __html: renderFormattedHtml(value) }}
    />
  );
};

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
      section: q.section ?? "",
      source: "",
      weight: 1,
      imageFile: null,
    }))
  );
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [editingQuestionIds, setEditingQuestionIds] = useState<Set<string>>(
    () => new Set()
  );
  const [savingQuestionIds, setSavingQuestionIds] = useState<Set<string>>(
    () => new Set()
  );
  const { isSaving, saveBulkQuestions } = useBulkSaveQuestions({
    questions,
    onSuccess: onSaveComplete,
  });
  const { topics, isLoading: isTopicsLoading } = useTopics();

  const getDisplayNumber = (q: EditableQuestion, index: number) =>
    q.number ?? index + 1;

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

  const validateQuestion = (q: EditableQuestion, index: number) => {
    const displayNumber = getDisplayNumber(q, index);
    if (!q.content.trim()) {
      return `Question ${displayNumber}: Content is required`;
    }
    if (q.options.length < 2) {
      return `Question ${displayNumber}: At least 2 options are required`;
    }
    const allOptionsHaveContent = q.options.every((opt) => opt.content.trim());
    if (!allOptionsHaveContent) {
      return `Question ${displayNumber}: All options must have content`;
    }
    return null;
  };

  const buildSingleFormData = (q: EditableQuestion) => {
    const formData = new FormData();
    if (q.number != null) {
      formData.append("questionNumber", String(q.number));
    }
    formData.append("content", q.content);
    formData.append("section", q.section?.trim() || "");
    formData.append("topic", q.topic?.trim() || "");
    formData.append("subTopic", q.subtopic?.trim() || "");
    formData.append("source", q.source?.trim() || "");
    formData.append("weight", String(q.weight));
    formData.append("solution", q.explanation?.trim() || "");
    formData.append("examType", q.examType);
    formData.append("subject", q.subject);
    formData.append("examYear", q.examYear);

    const questionImageFile = q.imageFile || dataUrlToFile(q.imageUrl);
    if (questionImageFile) {
      formData.append("file", questionImageFile);
    }

    q.options.forEach((opt, optIndex) => {
      formData.append(`optionRequests[${optIndex}].label`, opt.label);
      formData.append(`optionRequests[${optIndex}].content`, opt.content);
      formData.append(
        `optionRequests[${optIndex}].isCorrect`,
        String(opt.isCorrect)
      );
      if (opt.imageFile) {
        formData.append(`optionRequests[${optIndex}].file`, opt.imageFile);
      }
    });

    return formData;
  };

  const saveSingleQuestion = async (questionId: string) => {
    const questionIndex = questions.findIndex((q) => q.id === questionId);
    if (questionIndex === -1) return;
    const question = questions[questionIndex];
    const displayNumber = getDisplayNumber(question, questionIndex);

    const error = validateQuestion(question, questionIndex);
    if (error) {
      toast({
        title: "Validation Error",
        description: error,
        variant: "destructive",
      });
      return;
    }

    setSavingQuestionIds((prev) => {
      const next = new Set(prev);
      next.add(questionId);
      return next;
    });

    try {
      const formData = buildSingleFormData(question);
      const response = await questionService.store(formData) as {
        isSuccess: boolean;
        message: string | null;
      } | null;

      toast({
        title: "Success!",
        description: response?.message || `Question ${displayNumber} saved successfully`,
      });
    } catch (error) {
      console.error("Error saving question:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to save question. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingQuestionIds((prev) => {
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });
    }
  };

  const updateQuestion = (id: string, updates: Partial<EditableQuestion>) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...updates } : q))
    );
  };

  const updateOption = (
    questionId: string,
    optionIndex: number,
    updates: Partial<EditableOption>
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
    setEditingQuestionIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const toggleQuestionEdit = (id: string) => {
    setEditingQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        setExpandedQuestion(id);
      }
      return next;
    });
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
              onClick={saveBulkQuestions}
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
          {questions.map((question, index) => {
            const isEditing = editingQuestionIds.has(question.id);

            return (
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
                    <Badge variant="secondary">
                      Question {getDisplayNumber(question, index)}
                    </Badge>
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
                    {question.subtopic && (
                      <Badge variant="outline">{question.subtopic}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={isEditing ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => toggleQuestionEdit(question.id)}
                    className="gap-2"
                  >
                    {isEditing ? (
                      <>
                        <Eye className="h-4 w-4" />
                        Review
                      </>
                    ) : (
                      <>
                        <Pencil className="h-4 w-4" />
                        Edit
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => saveSingleQuestion(question.id)}
                    disabled={
                      isSaving ||
                      savingQuestionIds.has(question.id) ||
                      questions.length === 0
                    }
                    className="gap-2"
                  >
                    {savingQuestionIds.has(question.id) ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeQuestion(question.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Question Content */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Question Content</Label>
                {isEditing ? (
                  <Textarea
                    value={question.content}
                    onChange={(e) =>
                      updateQuestion(question.id, { content: e.target.value })
                    }
                    className="min-h-[100px] resize-none"
                    placeholder="Question text..."
                  />
                ) : (
                  <div className="rounded-md border border-border bg-muted/30 p-3">
                    <FormattedText value={question.content} />
                  </div>
                )}
              </div>

              {/* Question Image */}
              {(isEditing || question.imageUrl) && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    Question Image (Optional)
                  </Label>
                  {isEditing ? (
                    <ImageUpload
                      value={question.imageUrl}
                      onChange={({ file, preview }) =>
                        updateQuestion(question.id, {
                          imageUrl: preview,
                          imageFile: file,
                        })
                      }
                      compact
                    />
                  ) : (
                    <img
                      src={question.imageUrl}
                      alt={`Question ${getDisplayNumber(question, index)}`}
                      className="max-h-48 w-full rounded-md border border-border bg-muted object-contain"
                    />
                  )}
                </div>
              )}

              {/* Section & Weight */}
              {isEditing && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      Section (Optional)
                    </Label>
                    <Textarea
                      value={question.section || ""}
                      onChange={(e) =>
                        updateQuestion(question.id, { section: e.target.value })
                      }
                      className="min-h-[80px] resize-none"
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
              )}

              {/* Topic, Subtopic & Source */}
              {isEditing && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      Topic (Optional)
                    </Label>
                    <TopicSelect
                      value={question.topic || ""}
                      topics={topics}
                      disabled={isTopicsLoading}
                      placeholder={
                        isTopicsLoading ? "Loading topics..." : "Select topic"
                      }
                      onChange={(value) =>
                        updateQuestion(question.id, { topic: value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      Subtopic (Optional)
                    </Label>
                    <Input
                      value={question.subtopic || ""}
                      onChange={(e) =>
                        updateQuestion(question.id, { subtopic: e.target.value })
                      }
                      placeholder="e.g., Factoring"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      Source (Optional)
                    </Label>
                    <Input
                      value={question.source || ""}
                      onChange={(e) =>
                        updateQuestion(question.id, { source: e.target.value })
                      }
                      placeholder="e.g., Cambridge or Teacher's Note"
                    />
                  </div>
                </div>
              )}

              {/* Options */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Options</Label>
                  {isEditing && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addOption(question.id)}
                      disabled={question.options.length >= 8}
                    >
                      Add Option
                    </Button>
                  )}
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
                      {isEditing ? (
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
                      ) : (
                        <div className="mt-1 h-4 w-4 flex-shrink-0">
                          {option.isCorrect && (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          )}
                        </div>
                      )}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={option.isCorrect ? "default" : "outline"}
                            className="w-6 h-6 p-0 flex items-center justify-center"
                          >
                            {option.label}
                          </Badge>
                          {isEditing ? (
                            <>
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
                                onClick={() =>
                                  removeOption(question.id, optIndex)
                                }
                                className="h-8 w-8 text-destructive hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <FormattedText
                              value={option.content}
                              className="flex-1"
                            />
                          )}
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
                  {isEditing ? (
                    <Textarea
                      value={question.explanation}
                      onChange={(e) =>
                        updateQuestion(question.id, {
                          explanation: e.target.value,
                        })
                      }
                      className="min-h-[80px] resize-none"
                      placeholder="Solution explanation..."
                    />
                  ) : (
                    <div className="rounded-md border border-border bg-muted/30 p-3">
                      <FormattedText value={question.explanation} />
                    </div>
                  )}
                </div>
              )}
            </Card>
            );
          })}
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
