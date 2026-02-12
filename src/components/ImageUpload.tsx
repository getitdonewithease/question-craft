import { useId, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value?: string;
  onChange: (data: { file: File | null; preview: string }) => void;
  compact?: boolean;
}

export const ImageUpload = ({ value, onChange, compact = false }: ImageUploadProps) => {
  const [preview, setPreview] = useState<string>(value || "");
  const inputId = useId();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real app, you would upload to storage here
      // For now, we'll create a local preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreview(result);
        onChange({ file, preview: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlChange = (url: string) => {
    setPreview(url);
    onChange({ file: null, preview: url });
  };

  const clearImage = () => {
    setPreview("");
    onChange({ file: null, preview: "" });
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {preview ? (
          <div className="relative group">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-24 object-cover rounded-md border border-border"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={clearImage}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <Label
            htmlFor={inputId}
            className="flex items-center justify-center gap-2 h-24 border-2 border-dashed border-border rounded-md cursor-pointer hover:border-primary hover:bg-secondary/50 transition-colors"
          >
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Add image</span>
            <Input
              id={inputId}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </Label>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {preview ? (
        <Card className="relative overflow-hidden border-border">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-48 object-cover"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={clearImage}
          >
            <X className="h-4 w-4" />
          </Button>
        </Card>
      ) : (
        <Label
          htmlFor={inputId}
          className="flex flex-col items-center justify-center gap-2 h-48 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-secondary/50 transition-colors"
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Click to upload or drag and drop
          </span>
          <span className="text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB</span>
          <Input
            id={inputId}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </Label>
      )}

      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Input
        placeholder="Paste image URL..."
        value={preview}
        onChange={(e) => handleUrlChange(e.target.value)}
        className="text-sm"
      />
    </div>
  );
};
