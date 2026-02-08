import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, CheckCircle2 } from "lucide-react";
import { Question } from "./QuestionBuilder";
import { cn } from "@/lib/utils";

interface QuestionPreviewProps {
  question: Question;
  onClose: () => void;
}

export const QuestionPreview = ({ question, onClose }: QuestionPreviewProps) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 md:p-8 shadow-[var(--shadow-medium)]">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 flex-1">
              <h2 className="text-2xl font-bold">Question Preview</h2>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="font-medium">
                  {question.examType}
                </Badge>
                <Badge variant="secondary" className="font-medium">
                  {question.subject}
                </Badge>
                <Badge variant="secondary" className="font-medium">
                  {question.examYear}
                </Badge>
                {question.section && (
                  <Badge variant="outline" className="font-medium">
                    {question.section}
                  </Badge>
                )}
                {question.topic && (
                  <Badge variant="outline" className="font-medium">
                    {question.topic}
                  </Badge>
                )}
                {question.subtopic && (
                  <Badge variant="outline" className="font-medium">
                    {question.subtopic}
                  </Badge>
                )}
                {question.source && (
                  <Badge variant="outline" className="font-medium">
                    {question.source}
                  </Badge>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Question Content */}
          <div className="space-y-4">
            <div className="prose prose-lg max-w-none">
              <p className="text-foreground font-medium leading-relaxed">
                {question.content}
              </p>
            </div>

            {question.imageUrl && (
              <Card className="overflow-hidden border-border">
                <img
                  src={question.imageUrl}
                  alt="Question"
                  className="w-full h-auto max-h-64 object-contain bg-muted"
                />
              </Card>
            )}
          </div>

          {/* Options */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Options:</h3>
            {question.options.map((option) => (
              <Card
                key={option.id}
                className={cn(
                  "p-4 transition-all border-2",
                  option.isCorrect
                    ? "border-success bg-success/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                      option.isCorrect
                        ? "bg-success text-success-foreground"
                        : "bg-secondary text-secondary-foreground"
                    )}
                  >
                    {option.label}
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-foreground font-medium">{option.content}</p>
                    {option.imageUrl && (
                      <img
                        src={option.imageUrl}
                        alt={`Option ${option.label}`}
                        className="w-full h-32 object-contain rounded border border-border bg-muted"
                      />
                    )}
                  </div>
                  {option.isCorrect && (
                    <CheckCircle2 className="flex-shrink-0 h-5 w-5 text-success" />
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Solution */}
          {question.solution && (
            <div className="space-y-2 pt-4 border-t border-border">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                Solution
              </h3>
              <Card className="p-4 bg-muted/50 border-border">
                <p className="text-foreground leading-relaxed">{question.solution}</p>
              </Card>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end pt-4 border-t border-border">
            <Button onClick={onClose} size="lg">
              Close Preview
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
