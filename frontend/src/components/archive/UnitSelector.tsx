import React, { useState, useEffect, useMemo } from 'react';
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import type { ArchiveDocument } from '../../../../backend/src/functionalities/archive/document/models';
import type { SearchRequest } from '../../../../backend/src/utils/search';
import { cn } from '@/lib/utils';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { t } from '@/translations/utils'; // Import translation utility

interface UnitSelectorProps {
  selectedUnitId: number | null;
  onChange: (selectedId: number | null) => void;
  className?: string;
  /** Prevent selecting the document that contains this selector */
  currentDocumentId?: number;
}

const UnitSelector: React.FC<UnitSelectorProps> = ({
  selectedUnitId,
  onChange,
  className,
  currentDocumentId
}) => {
  const { token, preferredLanguage } = useAuth(); // Get preferredLanguage
  const [availableUnits, setAvailableUnits] = useState<ArchiveDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchUnits = async () => {
      if (!token) return;
      setIsLoading(true);
      setError(null);
      try {
        // Search for items of type 'unit'
        const searchRequest: SearchRequest = {
            query: [ { field: 'type', condition: 'EQ', value: 'unit', not: false } ],
            page: 1,
            pageSize: 500, // Fetch a reasonable number of units for selection
        };
        const response = await api.searchArchiveDocuments(searchRequest, token);
        // Filter out the potential parent document itself
        setAvailableUnits(
            response.data.filter(unit => unit.archiveDocumentId !== currentDocumentId)
                           .sort((a, b) => a.title.localeCompare(b.title)) // Sort locally
        );
      } catch (err: any) {
        const msg = err.message || t('unitLoadFailedError', preferredLanguage);
        setError(msg);
        console.error("Failed to load units:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUnits();
  }, [token, currentDocumentId, preferredLanguage]); // Add preferredLanguage

  const handleSelect = (unitId: number | null) => {
    onChange(unitId);
    setOpen(false); // Close popover on select/clear
    setSearchTerm("");
  };

   const selectedUnit = useMemo(() => {
       return availableUnits.find(unit => unit.archiveDocumentId === selectedUnitId);
   }, [availableUnits, selectedUnitId]);

   const filteredDropdownUnits = useMemo(() => {
       return availableUnits
           .filter(unit => unit.title.toLowerCase().includes(searchTerm.toLowerCase()))
   }, [availableUnits, searchTerm]);


  return (
    <div className={cn('space-y-2', className)}> {/* Removed p-3, border, bg-white */}
         <Popover open={open} onOpenChange={setOpen}>
             <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between min-h-[36px] font-normal text-sm h-9" // Button uses standard outline
                    disabled={isLoading || !!error}
                >
                  <span className="truncate">
                    {isLoading ? t('loadingText', preferredLanguage) :
                     error ? t('errorText', preferredLanguage) :
                     selectedUnit ? selectedUnit.title :
                     t('unitSelectorPlaceholder', preferredLanguage)}
                  </span>
                   {isLoading ? <LoadingSpinner size="sm" className='ml-2'/> : <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
                </Button>
             </PopoverTrigger>
             <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start"> {/* Content uses standard popover bg */}
                 <Command shouldFilter={false}>
                    <CommandInput
                        placeholder={t('unitSelectorSearchPlaceholder', preferredLanguage)}
                        value={searchTerm}
                        onValueChange={setSearchTerm}
                    />
                    <CommandList>
                        <CommandEmpty>{isLoading ? t('loadingText', preferredLanguage) : t('unitSelectorNoUnitsFound', preferredLanguage)}</CommandEmpty>
                         {!isLoading && (
                            <CommandGroup>
                                <CommandItem
                                    key="clear-unit"
                                    value="--clear--"
                                    onSelect={() => handleSelect(null)}
                                    className='cursor-pointer text-muted-foreground italic'
                                >
                                    <X className="mr-2 h-4 w-4 opacity-50" />
                                    {t('clearButton', preferredLanguage)} {t('selection', preferredLanguage)}
                                </CommandItem>
                                {filteredDropdownUnits.map((unit) => (
                                <CommandItem
                                    key={unit.archiveDocumentId}
                                    value={unit.title}
                                    onSelect={() => {
                                        handleSelect(unit.archiveDocumentId!);
                                    }}
                                    className='cursor-pointer'
                                >
                                    <Check
                                        className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedUnitId === unit.archiveDocumentId ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {unit.title}
                                </CommandItem>
                                ))}
                            </CommandGroup>
                         )}
                    </CommandList>
                 </Command>
             </PopoverContent>
         </Popover>
          {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
};

export default UnitSelector;