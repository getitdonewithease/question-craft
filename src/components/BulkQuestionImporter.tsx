import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Upload, X, Loader2, FileImage, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { extractQuestionsFromImages, ExtractedQuestion } from "@/lib/gemini";
import { QuestionReviewGrid } from "./QuestionReviewGrid";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface BulkQuestionImporterProps {
  onImportComplete?: () => void;
}

export const BulkQuestionImporter = ({ onImportComplete }: BulkQuestionImporterProps) => {
  const { toast } = useToast();
  const [questionImages, setQuestionImages] = useState<File[]>([]);
  const [answerKeyImage, setAnswerKeyImage] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedQuestions, setExtractedQuestions] = useState<ExtractedQuestion[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [examType, setExamType] = useState("");
  const [subject, setSubject] = useState("");
  const [examYear, setExamYear] = useState("");

  const handleQuestionImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setQuestionImages(files);
  };

  const handleAnswerKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setAnswerKeyImage(file);
  };

  const removeQuestionImage = (index: number) => {
    setQuestionImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeAnswerKey = () => {
    setAnswerKeyImage(null);
  };

  const handleExtract = async () => {
    if (questionImages.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please upload at least one question image",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const questions = await extractQuestionsFromImages(
        questionImages,
        answerKeyImage || undefined
      );

      clearInterval(progressInterval);
      setProgress(100);

      if (questions.length === 0) {
        toast({
          title: "No Questions Found",
          description: "The AI could not extract any questions from the images. Please try with clearer images.",
          variant: "destructive",
        });
        return;
      }

      setExtractedQuestions(questions);
      setShowReview(true);

      toast({
        title: "Extraction Complete",
        description: `Successfully extracted ${questions.length} question(s) from the images.`,
      });
    } catch (error) {
      console.error("Error extracting questions:", error);
      toast({
        title: "Extraction Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to extract questions. Please check your API key and try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleReset = () => {
    setQuestionImages([]);
    setAnswerKeyImage(null);
    setExtractedQuestions([]);
    setShowReview(false);
    setExamType("");
    setSubject("");
    setExamYear("");
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
          <h1 className="text-4xl font-bold text-foreground">Bulk Question Importer</h1>
          <p className="text-muted-foreground text-lg">
            Upload images of exam papers to automatically extract questions using AI
          </p>
        </div>

        {/* API Key Warning */}
        {!import.meta.env.VITE_GEMINI_API_KEY && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>API Key Missing</AlertTitle>
            <AlertDescription>
              Please set VITE_GEMINI_API_KEY in your .env file to use this feature.
              <br />
              <span className="text-xs mt-2 block">
                Note: You must restart the dev server after adding the API key to your .env file.
              </span>
              <br />
              <span className="text-xs mt-1 block font-mono">
                Debug: Env keys: {Object.keys(import.meta.env).filter(k => k.includes('GEMINI')).join(', ') || 'none'}
              </span>
            </AlertDescription>
          </Alert>
        )}

        <Card className="p-6 md:p-8 shadow-[var(--shadow-medium)] border-border">
          <div className="space-y-6">
            {/* Exam Metadata */}
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

            {/* Question Images Upload */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Question Images * (2-column layout supported)
              </Label>
              <div className="space-y-2">
                {questionImages.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {questionImages.map((file, index) => (
                      <div
                        key={index}
                        className="relative group border border-border rounded-lg overflow-hidden"
                      >
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Question ${index + 1}`}
                          className="w-full h-32 object-cover"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeQuestionImage(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate">
                          {file.name}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                <Label
                  htmlFor="question-images"
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-secondary/50 transition-colors",
                    questionImages.length > 0 && "h-24"
                  )}
                >
                  <FileImage className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {questionImages.length > 0
                      ? "Add more images"
                      : "Click to upload question images"}
                  </span>
                  <Input
                    id="question-images"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleQuestionImagesChange}
                  />
                </Label>
              </div>
            </div>

            {/* Answer Key Image Upload (Optional) */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Answer Key Image (Optional)
              </Label>
              {answerKeyImage ? (
                <div className="relative group border border-border rounded-lg overflow-hidden">
                  <img
                    src={URL.createObjectURL(answerKeyImage)}
                    alt="Answer Key"
                    className="w-full h-32 object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={removeAnswerKey}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate">
                    {answerKeyImage.name}
                  </div>
                </div>
              ) : (
                <Label
                  htmlFor="answer-key"
                  className="flex flex-col items-center justify-center gap-2 h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-secondary/50 transition-colors"
                >
                  <FileImage className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Click to upload answer key image
                  </span>
                  <Input
                    id="answer-key"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAnswerKeyChange}
                  />
                </Label>
              )}
            </div>

            {/* Processing Progress */}
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Processing images with AI...</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={handleExtract}
                disabled={
                  isProcessing ||
                  questionImages.length === 0 ||
                  !examType ||
                  !subject ||
                  !examYear ||
                  !import.meta.env.VITE_GEMINI_API_KEY
                }
                className="flex-1 gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Extracting Questions...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Extract Questions
                  </>
                )}
              </Button>
              {questionImages.length > 0 && (
                <Button
                  onClick={handleReset}
                  variant="outline"
                  disabled={isProcessing}
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

