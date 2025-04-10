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
}

const TagSelector: React.FC<TagSelectorProps> = ({ selectedTagIds, onChange, className }) => {
  const { token } = useAuth();
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(""); // Keep track of search term

  useEffect(() => {
    const fetchTags = async () => {
      if (!token) return;
      setIsLoading(true);
      setError(null);
      try {
        const tags = await api.getAllTags(token);
        setAvailableTags(tags);
      } catch (err: any) {
        setError(err.message || "Failed to load tags");
        console.error("Failed to load tags:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTags();
  }, [token]);

  const handleSelect = (tagId: number) => {
    const newSelectedIds = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter(id => id !== tagId)
      : [...selectedTagIds, tagId];
    onChange(newSelectedIds);
    setSearchTerm(""); // Clear search on select
    // Keep popover open for multi-select
    // setOpen(false);
  };

   // Memoize selected tags for display to avoid recalculating on every render
   const selectedTags = useMemo(() => {
       // Sort available tags once if needed, e.g., alphabetically
       const sortedAvailable = [...availableTags].sort((a, b) => a.name.localeCompare(b.name));
       return sortedAvailable.filter(tag => selectedTagIds.includes(tag.tagId!));
   }, [availableTags, selectedTagIds]);

   // Memoize filtered tags for the dropdown
   const filteredDropdownTags = useMemo(() => {
       return availableTags
           .filter(tag => tag.name.toLowerCase().includes(searchTerm.toLowerCase()))
           .sort((a, b) => a.name.localeCompare(b.name)); // Sort filtered results
   }, [availableTags, searchTerm]);


  return (
    <div className={cn('space-y-2', className)}>
         <Popover open={open} onOpenChange={setOpen}>
             <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between min-h-[36px] font-normal" // Ensure min height, normal font weight
                    disabled={isLoading || !!error}
                >
                  <span className="truncate">
                    {isLoading ? 'Loading tags...' :
                     error ? 'Error loading tags' :
                     selectedTags.length > 0 ? `${selectedTags.length} selected` :
                     'Select tags...'}
                  </span>
                   {isLoading ? <LoadingSpinner size="sm" className='ml-2'/> : <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
                </Button>
             </PopoverTrigger>
             {/* Adjust width based on trigger */}
             <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                 <Command shouldFilter={false}> {/* Disable default filtering, we filter manually */}
                    <CommandInput
                        placeholder="Search tags..."
                        value={searchTerm}
                        onValueChange={setSearchTerm} // Update search term state
                    />
                    <CommandList>
                        <CommandEmpty>{isLoading ? 'Loading...' : 'No tags found.'}</CommandEmpty>
                         {!isLoading && (
                            <CommandGroup>
                                {filteredDropdownTags.map((tag) => (
                                <CommandItem
                                    key={tag.tagId}
                                    value={tag.name} // Use name for Command's internal value/search
                                    onSelect={() => {
                                        handleSelect(tag.tagId!);
                                    }}
                                    className='cursor-pointer' // Ensure pointer cursor
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
                    <Badge key={tag.tagId} variant="secondary" className='items-center'> {/* Use secondary variant */}
                        <span>{tag.name}</span> {/* Remove mr-1 */}
                         <button
                             type="button"
                             // Styling for the 'X' button within the badge
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