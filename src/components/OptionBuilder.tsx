import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import { ImageUpload } from "./ImageUpload";
import { Option } from "./QuestionBuilder";

interface OptionBuilderProps {
  option: Option;
  onUpdate: (id: string, updates: Partial<Option>) => void;
  onRemove: (id: string) => void;
  onSetCorrect: (id: string) => void;
}

export const OptionBuilder = ({
  option,
  onUpdate,
  onRemove,
  onSetCorrect,
}: OptionBuilderProps) => {
  return (
    <Card className="p-4 transition-all hover:shadow-[var(--shadow-soft)] border-border">
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          {/* Correct Answer Radio */}
          <div className="flex items-center pt-2">
            <RadioGroup
              value={option.isCorrect ? option.id : ""}
              onValueChange={() => onSetCorrect(option.id)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value={option.id}
                  id={`correct-${option.id}`}
                  className="data-[state=checked]:bg-success data-[state=checked]:border-success"
                />
                <Label
                  htmlFor={`correct-${option.id}`}
                  className="text-sm font-medium cursor-pointer"
                >
                  Correct
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Option Label Badge */}
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
            {option.label}
          </div>

          {/* Option Content */}
          <div className="flex-1 space-y-3">
            <Input
              placeholder="Enter option text..."
              value={option.content}
              onChange={(e) => onUpdate(option.id, { content: e.target.value })}
              className="font-medium"
            />

            {/* Option Image */}
            <ImageUpload
              value={option.imageUrl}
              onChange={(url) => onUpdate(option.id, { imageUrl: url })}
              compact
            />
          </div>

          {/* Remove Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(option.id)}
            className="flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
