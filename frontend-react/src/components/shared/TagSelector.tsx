import React, { useState, useEffect, useMemo } from 'react';
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import type { Tag } from '../../../../backend/src/functionalities/tag/models';
import { cn } from '@/lib/utils';
import LoadingSpinner from './LoadingSpinner'; // Import spinner

interface TagSelectorProps {
  selectedTagIds: number[];
  onChange: (selectedIds: number[]) => void;
  className?: string;
  /** Optional: Provide pre-fetched tags to avoid internal fetching */
  availableTags?: Tag[];
}

const TagSelector: React.FC<TagSelectorProps> = ({
  selectedTagIds,
  onChange,
  className,
  availableTags: preFetchedTags // Renamed prop for clarity
}) => {
  const { token } = useAuth();
  const [internalTags, setInternalTags] = useState<Tag[]>(preFetchedTags ?? []);
  const [isLoading, setIsLoading] = useState(!preFetchedTags);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const tagsToUse = preFetchedTags ?? internalTags;

  useEffect(() => {
    const fetchTags = async () => {
      if (preFetchedTags || !token) {
          setIsLoading(false);
          return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const tags = await api.getAllTags(token);
        setInternalTags(tags);
      } catch (err: any) {
        setError(err.message || "Failed to load tags");
        console.error("Failed to load tags:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTags();
  }, [token, preFetchedTags]);

  const handleSelect = (tagId: number) => {
    const newSelectedIds = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter(id => id !== tagId)
      : [...selectedTagIds, tagId];
    onChange(newSelectedIds);
    setSearchTerm("");
  };

   const selectedTags = useMemo(() => {
       const sortedAvailable = [...tagsToUse].sort((a, b) => a.name.localeCompare(b.name));
       return sortedAvailable.filter(tag => selectedTagIds.includes(tag.tagId!));
   }, [tagsToUse, selectedTagIds]);

   const filteredDropdownTags = useMemo(() => {
       return tagsToUse
           .filter(tag => tag.name.toLowerCase().includes(searchTerm.toLowerCase()))
           .sort((a, b) => a.name.localeCompare(b.name));
   }, [tagsToUse, searchTerm]);


  return (
    <div className={cn('space-y-2', className)}>
         <Popover open={open} onOpenChange={setOpen}>
             <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between min-h-[36px] font-normal text-sm h-9"
                    disabled={isLoading || !!error}
                >
                  <span className="truncate">
                    {isLoading ? 'Loading tags...' :
                     error ? 'Error loading tags' :
                     selectedTags.length > 0 ? `${selectedTags.length} tags selected` :
                     'Select tags...'}
                  </span>
                   {isLoading ? <LoadingSpinner size="sm" className='ml-2'/> : <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
                </Button>
             </PopoverTrigger>
             {/* PopoverContent uses bg-popover by default, remove explicit bg override */}
             <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                 <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="Search tags..."
                        value={searchTerm}
                        onValueChange={setSearchTerm}
                    />
                    {/* CommandList uses bg-popover by default */}
                    <CommandList>
                        <CommandEmpty>{isLoading ? 'Loading...' : 'No tags found.'}</CommandEmpty>
                         {!isLoading && !preFetchedTags && tagsToUse.length === 0 && !error && (
                             <div className='text-center text-xs text-muted-foreground p-2'>No tags created yet.</div>
                         )}
                         {!isLoading && (
                            <CommandGroup>
                                {filteredDropdownTags.map((tag) => (
                                <CommandItem
                                    key={tag.tagId}
                                    value={tag.name}
                                    onSelect={() => {
                                        handleSelect(tag.tagId!);
                                    }}
                                    className='cursor-pointer'
                                >
                                    <Check
                                        className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedTagIds.includes(tag.tagId!) ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {tag.name}
                                </CommandItem>
                                ))}
                            </CommandGroup>
                         )}
                    </CommandList>
                 </Command>
             </PopoverContent>
         </Popover>
         {/* Display selected tags as Badges */}
         {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
                {selectedTags.map(tag => (
                    <Badge key={tag.tagId} variant="secondary" className='items-center'>
                        <span>{tag.name}</span>
                         <button
                             type="button"
                             className="ml-1 p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-background/50 focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1"
                             onClick={() => handleSelect(tag.tagId!)}
                             aria-label={`Remove ${tag.name} tag`}
                         >
                           <X className="h-3 w-3"/>
                         </button>
                    </Badge>
                ))}
            </div>
         )}
          {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
};

export default TagSelector;