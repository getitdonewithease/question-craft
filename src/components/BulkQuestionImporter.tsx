import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload } from "lucide-react";
import type { ExtractedQuestion } from "@/types/questions";
import { QuestionReviewGrid } from "./QuestionReviewGrid";
import { useToast } from "@/hooks/use-toast";

interface BulkQuestionImporterProps {
  onImportComplete?: () => void;
}

export const BulkQuestionImporter = ({
  onImportComplete,
}: BulkQuestionImporterProps) => {
  const { toast } = useToast();
  const [extractedQuestions, setExtractedQuestions] = useState<
    ExtractedQuestion[]
  >([]);
  const [showReview, setShowReview] = useState(false);
  const [examType, setExamType] = useState("");
  const [subject, setSubject] = useState("");
  const [examYear, setExamYear] = useState("");
  const [jsonInput, setJsonInput] = useState("");

  const handleReset = () => {
    setExtractedQuestions([]);
    setShowReview(false);
    setExamType("");
    setSubject("");
    setExamYear("");
    setJsonInput("");
  };

  const handleJsonImport = () => {
    if (!examType || !subject || !examYear) {
      toast({
        title: "Validation Error",
        description: "Exam type, subject, and year are required",
        variant: "destructive",
      });
      return;
    }

    if (!jsonInput.trim()) {
      toast({
        title: "Validation Error",
        description: "Please paste JSON before importing",
        variant: "destructive",
      });
      return;
    }

    try {
      const payload = JSON.parse(jsonInput) as {
        questions?: Array<{
          number?: number;
          topic?: string;
          section?: string;
          text?: string;
          solution?: string;
          options?:
            | Array<{
                label?: string;
                value?: string;
                isCorrect?: boolean;
              }>
            | Record<string, string>;
        }>;
      };

      const items = payload.questions ?? [];
      if (items.length === 0) {
        toast({
          title: "Validation Error",
          description: "No questions found in the JSON payload",
          variant: "destructive",
        });
        return;
      }

      const mapped: ExtractedQuestion[] = items.map((item, index) => {
        const optionsValue = item.options ?? [];
        const optionsArray = Array.isArray(optionsValue)
          ? optionsValue
              .filter((opt) => opt && (opt.value ?? opt.label) != null)
              .map((opt, optIndex) => ({
                label: (opt.label || String.fromCharCode(65 + optIndex)).trim(),
                content: String(opt.value ?? "").trim(),
                isCorrect: Boolean(opt.isCorrect),
              }))
          : Object.entries(optionsValue)
              .filter(([, value]) => value != null)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([label, content]) => ({
                label,
                content: String(content).trim(),
                isCorrect: false,
              }));

        return {
          number: item.number,
          content: item.text?.trim() || `Question ${item.number ?? index + 1}`,
          options: optionsArray,
          explanation: item.solution?.trim() || null,
          section: item.section?.trim() || null,
          topic: item.topic?.trim() || null,
          subtopic: null,
          requiresImage: false,
          imageUrl: undefined,
        };
      });

      const hasInvalid = mapped.some(
        (q) => !q.content.trim() || q.options.length < 2
      );
      if (hasInvalid) {
        toast({
          title: "Validation Error",
          description: "Each question needs text and at least 2 options",
          variant: "destructive",
        });
        return;
      }

      setExtractedQuestions(mapped);
      setShowReview(true);
      toast({
        title: "Import Complete",
        description: `Loaded ${mapped.length} question(s) from JSON`,
      });
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description:
          error instanceof Error
            ? error.message
            : "Unable to parse JSON. Please check the format.",
        variant: "destructive",
      });
    }
  };

  if (showReview && extractedQuestions.length > 0) {
    return (
      <QuestionReviewGrid
        questions={extractedQuestions}
        examType={examType}
        subject={subject}
        examYear={examYear}
        onBack={() => setShowReview(false)}
        onSaveComplete={() => {
          handleReset();
          onImportComplete?.();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground">
            Bulk Question Importer
          </h1>
          <p className="text-muted-foreground text-lg">
            Paste a structured JSON payload to import multiple questions
          </p>
        </div>

        <Card className="p-6 md:p-8 shadow-[var(--shadow-medium)] border-border">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bulk-examType" className="text-base font-semibold">
                  Exam Type *
                </Label>
                <Select value={examType} onValueChange={setExamType}>
                  <SelectTrigger id="bulk-examType">
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
                <Label htmlFor="bulk-subject" className="text-base font-semibold">
                  Subject *
                </Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger id="bulk-subject">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mathematics">Mathematics</SelectItem>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Physics">Physics</SelectItem>
                    <SelectItem value="Chemistry">Chemistry</SelectItem>
                    <SelectItem value="Biology">Biology</SelectItem>
                    <SelectItem value="Economics">Economics</SelectItem>
                    <SelectItem value="Government">Government</SelectItem>
                    <SelectItem value="Crk">Crk</SelectItem>
                    <SelectItem value="Commerce">Commerce</SelectItem>
                    <SelectItem value="Insurance">Insurance</SelectItem>
                    <SelectItem value="Irk">Irk</SelectItem>
                    <SelectItem value="Geography">Geography</SelectItem>
                    
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bulk-examYear" className="text-base font-semibold">
                  Exam Year *
                </Label>
                <Input
                  id="bulk-examYear"
                  type="text"
                  placeholder="e.g., 2021"
                  value={examYear}
                  onChange={(e) => setExamYear(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Paste Questions JSON *
              </Label>
              <Textarea
                placeholder='Paste JSON like { "questions": [ { "number": 1, "text": "...", "options": [ ... ] } ] }'
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="min-h-[180px] resize-y"
              />
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  onClick={handleJsonImport}
                  disabled={!jsonInput.trim()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Load from JSON
                </Button>
                {(jsonInput || examType || subject || examYear) && (
                  <Button type="button" variant="outline" onClick={handleReset}>
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
