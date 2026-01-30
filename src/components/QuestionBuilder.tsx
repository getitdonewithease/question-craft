import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Eye, Save, Loader2 } from "lucide-react";
import { OptionBuilder } from "./OptionBuilder";
import { ImageUpload } from "./ImageUpload";
import { QuestionPreview } from "./QuestionPreview";
import { useToast } from "@/hooks/use-toast";
import { getAccessToken } from "@/lib/utils";

export interface Option {
  id: string;
  label: string;
  content: string;
  isCorrect: boolean;
  imageUrl?: string;
}

export interface Question {
  content: string;
  section?: string;
  topic?: string;
  weight: number;
  imageUrl?: string;
  imageFile?: File | null;
  solution?: string;
  examType: string;
  subject: string;
  examYear: string;
  options: Option[];
}

export const QuestionBuilder = () => {
  const { toast } = useToast();
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [question, setQuestion] = useState<Question>({
    content: "",
    section: "",
    topic: "",
    weight: 1,
    imageUrl: "",
    imageFile: null,
    solution: "",
    examType: "",
    subject: "",
    examYear: "",
    options: [],
  });

  const addOption = () => {
    const nextLabel = String.fromCharCode(65 + question.options.length); // A, B, C, D...
    const newOption: Option = {
      id: crypto.randomUUID(),
      label: nextLabel,
      content: "",
      isCorrect: false,
    };
    setQuestion({ ...question, options: [...question.options, newOption] });
  };

  const updateOption = (id: string, updates: Partial<Option>) => {
    setQuestion({
      ...question,
      options: question.options.map((opt) =>
        opt.id === id ? { ...opt, ...updates } : opt
      ),
    });
  };

  const setCorrectAnswer = (id: string) => {
    setQuestion({
      ...question,
      options: question.options.map((opt) => ({
        ...opt,
        isCorrect: opt.id === id,
      })),
    });
  };

  const removeOption = (id: string) => {
    const filtered = question.options.filter((opt) => opt.id !== id);
    const relabeled = filtered.map((opt, idx) => ({
      ...opt,
      label: String.fromCharCode(65 + idx),
    }));
    setQuestion({ ...question, options: relabeled });
  };

  const handleSubmit = async () => {
    // Validation
    if (!question.content.trim()) {
      toast({
        title: "Validation Error",
        description: "Question content is required",
        variant: "destructive",
      });
      return;
    }

    if (!question.examType || !question.subject || !question.examYear) {
      toast({
        title: "Validation Error",
        description: "Exam type, subject, and year are required",
        variant: "destructive",
      });
      return;
    }

    if (question.options.length < 2) {
      toast({
        title: "Validation Error",
        description: "At least 2 options are required",
        variant: "destructive",
      });
      return;
    }

    const hasCorrectAnswer = question.options.some((opt) => opt.isCorrect);
    if (!hasCorrectAnswer) {
      toast({
        title: "Validation Error",
        description: "Please mark one option as correct",
        variant: "destructive",
      });
      return;
    }

    const allOptionsHaveContent = question.options.every((opt) => opt.content.trim());
    if (!allOptionsHaveContent) {
      toast({
        title: "Validation Error",
        description: "All options must have content",
        variant: "destructive",
      });
      return;
    }

    const toImageRequest = (preview?: string, file?: File | null) => {
      if (!preview) return null;

      // Use file metadata when available
      const fileName = file?.name || "upload";
      const contentTypeFromFile = file?.type;
      let contentType = contentTypeFromFile || "";
      let base64String = "";
      let extension = fileName.includes(".") ? fileName.split(".").pop() || "" : "";

      if (preview.startsWith("data:")) {
        const [meta, data] = preview.split(",");
        if (meta) {
          const match = meta.match(/data:(.*?);base64/);
          if (match?.[1]) {
            contentType = contentType || match[1];
            const parts = match[1].split("/");
            if (!extension && parts.length === 2) {
              extension = parts[1];
            }
          }
        }
        base64String = data || "";
      } else {
        // Not a data URL; send as-is (likely a normal URL) and leave base64 empty
        return null;
      }

      return {
        base64String,
        fileName,
        contentType,
        extension,
      };
    };

    // Transform question data to API payload format
    const payload = {
      content: question.content,
      section: question.section?.trim() || null,
      topic: question.topic?.trim() || null,
      weight: question.weight,
      imageRequest: toImageRequest(question.imageUrl?.trim(), question.imageFile),
      solution: question.solution?.trim() || null,
      examType: question.examType,
      subject: question.subject,
      examYear: question.examYear,
      optionRequests: question.options.map((opt) => ({
        label: opt.label,
        content: opt.content,
        isCorrect: opt.isCorrect,
        imageUrl: opt.imageUrl?.trim() || "",
      })),
    };

    setIsSaving(true);
    try {
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

      const response = await fetch("https://localhost:53196/api/v1/questions/store", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      toast({
        title: "Success!",
        description: "Question saved successfully",
      });

      // Reset form after successful save
      setQuestion({
        content: "",
        section: "",
        topic: "",
        weight: 1,
        imageUrl: "",
        solution: "",
        examType: "",
        subject: "",
        examYear: "",
        options: [],
      });
    } catch (error) {
      console.error("Error saving question:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save question. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Create Exam Question</h1>
          <p className="text-muted-foreground text-lg">
            Build comprehensive questions with multiple choice options
          </p>
        </div>

        <Card className="p-6 md:p-8 shadow-[var(--shadow-medium)] border-border">
          <div className="space-y-6">
            {/* Question Content */}
            <div className="space-y-2">
              <Label htmlFor="content" className="text-base font-semibold">
                Question Content *
              </Label>
              <Textarea
                id="content"
                placeholder="Enter the exam question..."
                value={question.content}
                onChange={(e) => setQuestion({ ...question, content: e.target.value })}
                className="min-h-[120px] resize-none"
              />
            </div>

            {/* Question Image */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Question Image (Optional)</Label>
              <ImageUpload
                value={question.imageUrl}
                onChange={({ file, preview }) =>
                  setQuestion({ ...question, imageUrl: preview, imageFile: file })
                }
              />
            </div>

            {/* Row 1: Exam Type, Subject, Year */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="examType" className="text-base font-semibold">
                  Exam Type *
                </Label>
                <Select
                  value={question.examType}
                  onValueChange={(value) => setQuestion({ ...question, examType: value })}
                >
                  <SelectTrigger id="examType">
                    <SelectValue placeholder="Select exam type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTME">UTME</SelectItem>
                    <SelectItem value="POST_UTME">POST UTME</SelectItem>
                    <SelectItem value="WAEC">WAEC</SelectItem>
                    <SelectItem value="NECO">NECO</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject" className="text-base font-semibold">
                  Subject *
                </Label>
                <Select
                  value={question.subject}
                  onValueChange={(value) => setQuestion({ ...question, subject: value })}
                >
                  <SelectTrigger id="subject">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mathematics">Mathematics</SelectItem>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Physics">Physics</SelectItem>
                    <SelectItem value="Chemistry">Chemistry</SelectItem>
                    <SelectItem value="Biology">Biology</SelectItem>
                    <SelectItem value="Economics">Economics</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="examYear" className="text-base font-semibold">
                  Exam Year *
                </Label>
                <Input
                  id="examYear"
                  type="text"
                  placeholder="e.g., 2021"
                  value={question.examYear}
                  onChange={(e) => setQuestion({ ...question, examYear: e.target.value })}
                />
              </div>
            </div>

            {/* Row 2: Section, Topic, Weight */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="section" className="text-base font-semibold">
                  Section (Optional)
                </Label>
                <Input
                  id="section"
                  placeholder="e.g., Algebra"
                  value={question.section}
                  onChange={(e) => setQuestion({ ...question, section: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="topic" className="text-base font-semibold">
                  Topic (Optional)
                </Label>
                <Input
                  id="topic"
                  placeholder="e.g., Quadratic Equations"
                  value={question.topic}
                  onChange={(e) => setQuestion({ ...question, topic: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight" className="text-base font-semibold">
                  Weight *
                </Label>
                <Input
                  id="weight"
                  type="number"
                  min="1"
                  value={question.weight}
                  onChange={(e) =>
                    setQuestion({ ...question, weight: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
            </div>

            {/* Solution */}
            <div className="space-y-2">
              <Label htmlFor="solution" className="text-base font-semibold">
                Solution (Optional)
              </Label>
              <Textarea
                id="solution"
                placeholder="Explain the correct answer..."
                value={question.solution}
                onChange={(e) => setQuestion({ ...question, solution: e.target.value })}
                className="min-h-[100px] resize-none"
              />
            </div>

            {/* Options Section */}
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Answer Options</h3>
                <Button
                  onClick={addOption}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={question.options.length >= 8}
                >
                  <Plus className="h-4 w-4" />
                  Add Option
                </Button>
              </div>

              {question.options.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Click "Add Option" to create answer choices
                </div>
              ) : (
                <div className="space-y-3">
                  {question.options.map((option) => (
                    <OptionBuilder
                      key={option.id}
                      option={option}
                      onUpdate={updateOption}
                      onRemove={removeOption}
                      onSetCorrect={setCorrectAnswer}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={() => setShowPreview(true)}
                variant="outline"
                className="flex-1 gap-2"
                disabled={!question.content.trim() || question.options.length === 0}
              >
                <Eye className="h-4 w-4" />
                Preview Question
              </Button>
              <Button onClick={handleSubmit} className="flex-1 gap-2" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Question
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <QuestionPreview question={question} onClose={() => setShowPreview(false)} />
      )}
    </div>
  );
};
