import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronRight, ChevronDown, FolderOpen, Folder, FileText, RefreshCw } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useQuickFilterContext } from '@/context/QuickFilterContext';
import type { SignatureComponent } from '../../../../backend/src/functionalities/signature/component/models';
import type { SignatureElementSearchResult } from '../../../../backend/src/functionalities/signature/element/models';
import type { SearchQueryElement } from '../../../../backend/src/utils/search';
import type { SupportedLanguage } from '@/translations/models';
import { t } from '@/translations/utils';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

const MAX_RESULTS = 1000;

interface ElementNodeProps {
  element: SignatureElementSearchResult;
  depth: number;
  pathFromRoot: number[];
  activeElementId: number | null;
  enabled: boolean;
  token: string;
  onSelect: (elementId: number, path: number[]) => void;
}

const ElementNode: React.FC<ElementNodeProps> = ({
  element: el,
  depth,
  pathFromRoot,
  activeElementId,
  enabled,
  token,
  onSelect,
}) => {
  const { expandedElementIds, toggleElementExpanded, refreshKey } = useQuickFilterContext();
  const [children, setChildren] = useState<SignatureElementSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const id = el.signatureElementId!;
  const isExpanded = expandedElementIds.includes(id);
  const hasChildren = (el.childCount ?? 0) > 0;
  const isActive = activeElementId === id;
  const currentPath = [...pathFromRoot, id];

  useEffect(() => {
    if (!isExpanded) return;
    setIsLoading(true);
    api.searchSignatureElements({
      query: [
        { field: 'parentIds', condition: 'ANY_OF', value: [id], not: false },
      ],
      page: 1,
      pageSize: MAX_RESULTS,
    }, token)
      .then(res => setChildren(res.data))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [isExpanded, refreshKey, id, token]);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!enabled) return;
    if (hasChildren) {
      toggleElementExpanded(id);
    }
    onSelect(id, currentPath);
  }, [enabled, hasChildren, id, currentPath, onSelect, toggleElementExpanded]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!enabled) return;
      if (hasChildren) {
        toggleElementExpanded(id);
      }
      onSelect(id, currentPath);
    } else if (e.key === 'ArrowRight' && hasChildren && !isExpanded && enabled) {
      e.preventDefault();
      toggleElementExpanded(id);
    } else if (e.key === 'ArrowLeft' && hasChildren && isExpanded && enabled) {
      e.preventDefault();
      toggleElementExpanded(id);
    }
  }, [enabled, hasChildren, id, currentPath, onSelect, toggleElementExpanded, isExpanded]);

  const showChildCount = hasChildren && !isExpanded && (el.childCount ?? 0) > 0;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 py-0.5 px-1 rounded cursor-pointer text-xs hover:bg-accent whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isActive && "bg-primary text-primary-foreground font-semibold hover:bg-primary",
        )}
        style={{ paddingLeft: `${depth * 14 + 4}px` }}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
      >
        {hasChildren ? (
          isExpanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />
        ) : (
          <FileText className={cn("h-3 w-3 shrink-0", !isActive && "text-muted-foreground")} />
        )}
        <span className={cn("text-[10px] mr-0.5 shrink-0 font-mono", !isActive && "text-muted-foreground")}>
          {el.index || ''}
        </span>
        <span className="truncate">{el.name}</span>
        {showChildCount && (
          <span className={cn("text-[10px] ml-auto shrink-0", !isActive && "text-muted-foreground")}>({el.childCount})</span>
        )}
        {isExpanded && isLoading && <LoadingSpinner size="sm" className="ml-1" />}
      </div>
      {isExpanded && (
        <div>
          {isLoading && children.length === 0 && (
            <div className="pl-4 py-0.5">
              <LoadingSpinner size="sm" />
            </div>
          )}
          {!isLoading && children.length === 0 && (
            <div className="pl-4 py-0.5 text-[10px] text-muted-foreground italic">-</div>
          )}
          {children.map(child => (
            <ElementNode
              key={child.signatureElementId!}
              element={child}
              depth={depth + 1}
              pathFromRoot={currentPath}
              activeElementId={activeElementId}
              enabled={enabled}
              token={token}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface ComponentNodeProps {
  comp: SignatureComponent;
  activeElementId: number | null;
  enabled: boolean;
  token: string;
  onSelect: (elementId: number, path: number[]) => void;
}

const ComponentNode: React.FC<ComponentNodeProps> = ({
  comp,
  activeElementId,
  enabled,
  token,
  onSelect,
}) => {
  const { expandedComponentIds, toggleComponentExpanded, refreshKey } = useQuickFilterContext();
  const [roots, setRoots] = useState<SignatureElementSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const compId = comp.signatureComponentId!;
  const isExpanded = expandedComponentIds.includes(compId);

  useEffect(() => {
    if (!isExpanded) return;
    setIsLoading(true);
    api.searchSignatureElements({
      query: [
        { field: 'signatureComponentId', condition: 'EQ', value: compId, not: false },
        { field: 'hasParents', condition: 'EQ', value: false, not: false },
      ],
      page: 1,
      pageSize: MAX_RESULTS,
    }, token)
      .then(res => setRoots(res.data))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [isExpanded, refreshKey, compId, token]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    toggleComponentExpanded(compId);
  }, [compId, toggleComponentExpanded]);

  return (
    <div>
      <div
        className="flex items-center gap-1 py-0.5 px-1 rounded cursor-pointer text-xs font-medium hover:bg-accent whitespace-nowrap"
        onClick={handleClick}
      >
        {isExpanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
        {isExpanded
          ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          : <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        <span>{comp.name}</span>
        {isExpanded && isLoading && <LoadingSpinner size="sm" className="ml-1" />}
      </div>
      {isExpanded && (
        <div>
          {isLoading && roots.length === 0 && (
            <div className="pl-4 py-0.5">
              <LoadingSpinner size="sm" />
            </div>
          )}
          {!isLoading && roots.length === 0 && (
            <div className="pl-4 py-0.5 text-[10px] text-muted-foreground italic">-</div>
          )}
          {roots.map(node => (
            <ElementNode
              key={node.signatureElementId!}
              element={node}
              depth={1}
              pathFromRoot={[]}
              activeElementId={activeElementId}
              enabled={enabled}
              token={token}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface QuickSignatureFilterProps {
  token: string;
  preferredLanguage: SupportedLanguage;
  onFilterChange: (filter: SearchQueryElement | null) => void;
}

const QuickSignatureFilter: React.FC<QuickSignatureFilterProps> = ({
  token,
  preferredLanguage,
  onFilterChange,
}) => {
  const {
    enabled, setEnabled,
    condition, setCondition,
    activeElementId, setActiveElementId,
    activePath, setActivePath,
    refreshKey,
    triggerRefresh,
  } = useQuickFilterContext();

  const [components, setComponents] = useState<SignatureComponent[]>([]);
  const [isLoadingComponents, setIsLoadingComponents] = useState(false);
  const [previewElements, setPreviewElements] = useState<SignatureElementSearchResult[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  useEffect(() => {
    if (!token) return;
    setIsLoadingComponents(true);
    api.getAllSignatureComponents(token)
      .then(comps => setComponents(comps.sort((a, b) => a.name.localeCompare(b.name))))
      .catch(console.error)
      .finally(() => setIsLoadingComponents(false));
  }, [token]);

  useEffect(() => {
    if (!token || !activePath || activePath.length === 0) {
      setPreviewElements([]);
      return;
    }
    setIsLoadingPreview(true);
    api.searchSignatureElements({
      query: [
        { field: 'signatureElementId', condition: 'ANY_OF', value: activePath, not: false },
      ],
      page: 1,
      pageSize: Math.max(activePath.length, 1),
    }, token)
      .then(res => {
        const byId = new Map(res.data.map(el => [el.signatureElementId!, el]));
        setPreviewElements(
          activePath
            .map(id => byId.get(id))
            .filter((el): el is SignatureElementSearchResult => el !== undefined),
        );
      })
      .catch(console.error)
      .finally(() => setIsLoadingPreview(false));
  }, [token, activePath, refreshKey]);

  const buildFilter = useCallback((path: number[], cond: typeof condition): SearchQueryElement => {
    return {
      field: 'descriptiveSignature',
      condition: cond,
      value: path,
      not: false,
    } as SearchQueryElement;
  }, []);

  useEffect(() => {
    if (enabled && activePath) {
      onFilterChange(buildFilter(activePath, condition));
    } else {
      onFilterChange(null);
    }
  }, [enabled, activePath, condition, onFilterChange, buildFilter]);

  const handleElementSelect = useCallback((elementId: number, path: number[]) => {
    if (!enabled) return;

    if (activeElementId === elementId) {
      setActiveElementId(null);
      setActivePath(null);
    } else {
      setActiveElementId(elementId);
      setActivePath(path);
    }
  }, [enabled, activeElementId, setActiveElementId, setActivePath]);

  const handleConditionChange = useCallback((newCondition: string) => {
    setCondition(newCondition as typeof condition);
  }, [setCondition]);

  const handleEnabledChange = useCallback((checked: boolean) => {
    setEnabled(checked);
  }, [setEnabled]);

  const conditionOptions = [
    { value: 'STARTS_WITH' as const, labelKey: 'conditionStartsWithPath' as const },
    { value: 'CONTAINS_SEQUENCE' as const, labelKey: 'conditionContainsSequence' as const },
    { value: 'EQ' as const, labelKey: 'conditionEqualsPath' as const },
  ];

  const longestLabel = useMemo(() => {
    return conditionOptions
      .map(opt => t(opt.labelKey, preferredLanguage))
      .reduce((a, b) => a.length > b.length ? a : b, '');
  }, [t, preferredLanguage]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Checkbox
          id="quick-filter-enable"
          checked={enabled}
          onCheckedChange={(checked) => handleEnabledChange(!!checked)}
        />
        <Label htmlFor="quick-filter-enable" className="text-xs font-medium cursor-pointer">
          {t('quickFilterEnableLabel', preferredLanguage)}
        </Label>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto h-7 w-7 shrink-0"
          onClick={triggerRefresh}
          title={t('quickFilterRefreshTreeTooltip', preferredLanguage)}
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className={cn("flex items-center gap-1", !enabled && "pointer-events-none opacity-40")}>
        <Select value={condition} onValueChange={handleConditionChange}>
          <SelectTrigger className="h-7 text-xs" style={{ minWidth: `calc(${longestLabel.length}ch + 3rem)` }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {conditionOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {t(opt.labelKey, preferredLanguage)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {activePath && activePath.length > 0 && (
        <div className={cn("min-w-0 rounded-md bg-muted px-2 py-1.5", !enabled && "pointer-events-none opacity-40")}>
          {isLoadingPreview ? (
            <LoadingSpinner size="sm" />
          ) : previewElements.length === 0 ? (
            <span className="text-[10px] text-muted-foreground italic">-</span>
          ) : (
            <span className="flex min-w-0 flex-wrap items-center gap-y-0.5 text-xs">
              {previewElements.map((el, i) => (
                <span key={el.signatureElementId} className="flex min-w-0 items-center">
                  {i > 0 && <ChevronRight className="mx-1 h-3 w-3 shrink-0 text-muted-foreground" />}
                  {el.index && (
                    <span className="mr-1 shrink-0 font-mono text-[10px] text-muted-foreground">{el.index}</span>
                  )}
                  <span className="min-w-0 overflow-wrap-anywhere">{el.name}</span>
                </span>
              ))}
            </span>
          )}
        </div>
      )}

      <div
        className={cn(
          "overflow-x-auto whitespace-nowrap min-h-[40px] text-xs",
          !enabled && "pointer-events-none opacity-40"
        )}
      >
        {isLoadingComponents ? (
          <div className="flex items-center justify-center py-2">
            <LoadingSpinner size="sm" />
          </div>
        ) : components.length === 0 ? (
          <div className="text-[10px] text-muted-foreground py-1 text-center italic">-</div>
        ) : (
          components.map(comp => (
            <ComponentNode
              key={comp.signatureComponentId!}
              comp={comp}
              activeElementId={activeElementId}
              enabled={enabled}
              token={token}
              onSelect={handleElementSelect}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default QuickSignatureFilter;
