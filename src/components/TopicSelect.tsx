import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Topic } from "@/lib/topicService";
import { Check, ChevronsUpDown } from "lucide-react";

type TopicSelectProps = {
  value: string;
  topics: Topic[];
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

export const TopicSelect = ({
  value,
  topics,
  placeholder = "Select topic",
  disabled = false,
  onChange,
}: TopicSelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selectedTopic = topics.find(
    (topic) => topic.name.toLowerCase() === value.toLowerCase()
  );
  const hasExactMatch = topics.some(
    (topic) => topic.name.toLowerCase() === search.trim().toLowerCase()
  );
  const canUseSearch = search.trim().length > 0 && !hasExactMatch;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          <span className="truncate">
            {selectedTopic?.name || value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search topic..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No topics found.</CommandEmpty>
            <CommandGroup>
              {canUseSearch && (
                <CommandItem
                  value={search}
                  onSelect={() => {
                    onChange(search.trim());
                    setOpen(false);
                  }}
                >
                  <Check className="mr-2 h-4 w-4 opacity-0" />
                  Use "{search.trim()}"
                </CommandItem>
              )}
              {topics.map((topic) => (
                <CommandItem
                  key={topic.id}
                  value={topic.name}
                  onSelect={() => {
                    onChange(topic.name);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value.toLowerCase() === topic.name.toLowerCase()
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  {topic.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
