import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Upload, X, Loader2, FileImage, AlertCircle, Crop } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import ReactCrop, { type Crop as CropType, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
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
  const [jsonInput, setJsonInput] = useState("");
  
  // Image cropping state
  const [crop, setCrop] = useState<CropType>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);
  const [imageRef, setImageRef] = useState<HTMLImageElement | null>(null);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [selectedSourceImageIndex, setSelectedSourceImageIndex] = useState(0);

  const sourceImageUrl = useMemo(() => {
    const file = questionImages[selectedSourceImageIndex];
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [questionImages, selectedSourceImageIndex]);

  useEffect(() => {
    return () => {
      if (sourceImageUrl) URL.revokeObjectURL(sourceImageUrl);
    };
  }, [sourceImageUrl]);

  const remainingDiagramCount = useMemo(
    () => extractedQuestions.filter((q) => q.requiresImage && !q.imageUrl).length,
    [extractedQuestions]
  );

  const openCropDialog = (questionIndex: number) => {
    setSelectedQuestionIndex(questionIndex);
    setCompletedCrop(null);
    setCrop(undefined);
    setImageRef(null);
    setSelectedSourceImageIndex(0);
    setIsCropDialogOpen(true);
  };

  const saveCrop = () => {
    if (selectedQuestionIndex === null) return;
    if (!imageRef || !completedCrop || completedCrop.width <= 0 || completedCrop.height <= 0) {
      toast({
        title: "Crop Required",
        description: "Please select a crop area before saving.",
        variant: "destructive",
      });
      return;
    }

    const scaleX = imageRef.naturalWidth / imageRef.width;
    const scaleY = imageRef.naturalHeight / imageRef.height;

    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(completedCrop.width * scaleX);
    canvas.height = Math.floor(completedCrop.height * scaleY);
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      toast({
        title: "Crop Error",
        description: "Failed to create canvas context.",
        variant: "destructive",
      });
      return;
    }

    ctx.drawImage(
      imageRef,
      Math.floor(completedCrop.x * scaleX),
      Math.floor(completedCrop.y * scaleY),
      Math.floor(completedCrop.width * scaleX),
      Math.floor(completedCrop.height * scaleY),
      0,
      0,
      canvas.width,
      canvas.height
    );

    const dataUrl = canvas.toDataURL("image/png");

    setExtractedQuestions((prev) =>
      prev.map((q, idx) =>
        idx === selectedQuestionIndex
          ? { ...q, imageUrl: dataUrl, requiresImage: false }
          : q
      )
    );

    setIsCropDialogOpen(false);
  };

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
      // Stay on this screen to allow optional cropping for diagram questions.

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

            {/* JSON Import */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Paste Questions JSON (Optional)
              </Label>
              <Textarea
                placeholder='Paste JSON like { "questions": [ { "number": 1, "text": "...", "options": [ ... ] } ] }'
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="min-h-[140px] resize-y"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleJsonImport}
                disabled={!jsonInput.trim()}
                className="gap-2"
              >
                Load from JSON
              </Button>
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

            {/* Extracted Questions (Hybrid Image Extraction / Manual Cropping) */}
            {extractedQuestions.length > 0 && !showReview && (
              <div className="pt-6 space-y-4 border-t border-border">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold">Extracted Questions</h2>
                    <p className="text-sm text-muted-foreground">
                      {extractedQuestions.length} question(s) extracted.
                      {remainingDiagramCount > 0
                        ? ` ${remainingDiagramCount} need diagram crops.`
                        : " No diagram crops needed."}
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowReview(true)}
                    className="gap-2"
                    disabled={isProcessing || extractedQuestions.length === 0}
                  >
                    <Upload className="h-4 w-4" />
                    Continue to Review & Save
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {extractedQuestions.map((q, index) => (
                    <Card key={index} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">Question {index + 1}</Badge>
                            {q.requiresImage && !q.imageUrl && (
                              <Badge variant="destructive" className="gap-1">
                                ⚠️ Diagram Needed
                              </Badge>
                            )}
                            {q.imageUrl && (
                              <Badge variant="outline" className="gap-1">
                                Cropped Image Added
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-foreground line-clamp-2">
                            {q.content}
                          </p>
                        </div>

                        {q.requiresImage && !q.imageUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => openCropDialog(index)}
                            disabled={questionImages.length === 0}
                          >
                            <Crop className="h-4 w-4" />
                            Crop Image
                          </Button>
                        )}
                      </div>

                      {q.imageUrl && (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Cropped Diagram Preview</Label>
                          <img
                            src={q.imageUrl}
                            alt={`Cropped diagram for question ${index + 1}`}
                            className="max-h-48 rounded-md border border-border object-contain bg-muted"
                          />
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Crop Dialog */}
      <Dialog open={isCropDialogOpen} onOpenChange={setIsCropDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Crop Diagram from Uploaded Page</DialogTitle>
            <DialogDescription>
              Select the area that contains the diagram for the chosen question, then click “Save Crop”.
            </DialogDescription>
          </DialogHeader>

          {questionImages.length > 1 && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Source Page</Label>
              <Select
                value={String(selectedSourceImageIndex)}
                onValueChange={(v) => setSelectedSourceImageIndex(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a source image" />
                </SelectTrigger>
                <SelectContent>
                  {questionImages.map((f, idx) => (
                    <SelectItem key={idx} value={String(idx)}>
                      {f.name || `Image ${idx + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="max-h-[60vh] overflow-auto rounded-md border border-border bg-muted p-2">
            {sourceImageUrl ? (
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
              >
                <img
                  src={sourceImageUrl}
                  alt="Source for cropping"
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    setImageRef(img);
                    setCrop({
                      unit: "%",
                      x: 10,
                      y: 10,
                      width: 80,
                      height: 80,
                    });
                  }}
                  className="max-w-full h-auto"
                />
              </ReactCrop>
            ) : (
              <div className="p-6 text-sm text-muted-foreground">
                No source image available.
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsCropDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveCrop} className="gap-2">
              <Crop className="h-4 w-4" />
              Save Crop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

