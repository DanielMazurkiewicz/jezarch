import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronRight, ChevronDown, FolderOpen, Folder, FileText, Eye, Edit, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import LoadingSpinner from './LoadingSpinner';
import ElementForm from '@/components/signatures/ElementForm';
import ComponentForm from '@/components/signatures/ComponentForm';
import ElementPreviewDialog from '@/components/signatures/ElementPreviewDialog';
import ComponentPreviewDialog from '@/components/signatures/ComponentPreviewDialog';
import api from '@/lib/api';
import { compareSignatureComponents } from '@/lib/signatureComponentSort';
import { compareSignatureElements } from '@/lib/signatureElementSort';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { t } from '@/translations/utils';
import type { SignatureComponent } from '../../../../backend/src/functionalities/signature/component/models';
import type { SignatureElement, SignatureElementSearchResult } from '../../../../backend/src/functionalities/signature/element/models';
import type { SupportedLanguage } from '@/translations/models';

const MAX_RESULTS = 1000;

type ElementFormMode = 'edit' | 'createChildOfElement' | 'createInComponent';

/** Shared state + callbacks threaded down the tree so nodes stay lightweight. */
interface TreeActions {
    token: string;
    canModify: boolean;
    preferredLanguage: SupportedLanguage;
    activeElementId: number | null;
    refreshKey: number;
    expandedComponentIds: number[];
    expandedElementIds: number[];
    onToggleComponentExpand: (id: number) => void;
    onToggleElementExpand: (id: number) => void;
    onSelectPath: (elements: SignatureElement[]) => void;
    onPreviewComponent: (comp: SignatureComponent) => void;
    onEditComponent: (comp: SignatureComponent) => void;
    onAddChildToComponent: (comp: SignatureComponent) => void;
    onPreviewElement: (element: SignatureElement) => void;
    onEditElement: (element: SignatureElement) => void;
    onAddChildToElement: (element: SignatureElement) => void;
}

interface ElementNodeProps {
    element: SignatureElementSearchResult;
    depth: number;
    /** Ancestor elements from the component root down to this element's parent. */
    pathElements: SignatureElement[];
    actions: TreeActions;
}

const ElementNode: React.FC<ElementNodeProps> = ({ element: el, depth, pathElements, actions }) => {
    const [children, setChildren] = useState<SignatureElementSearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const id = el.signatureElementId!;
    const isExpanded = actions.expandedElementIds.includes(id);
    const hasChildren = (el.childCount ?? 0) > 0;
    const isActive = actions.activeElementId === id;
    const currentPathElements = [...pathElements, el];

    useEffect(() => {
        if (!isExpanded) return;
        setIsLoading(true);
        api.searchSignatureElements({
            query: [{ field: 'parentIds', condition: 'ANY_OF', value: [id], not: false }],
            page: 1,
            pageSize: MAX_RESULTS,
        }, actions.token)
            .then(res => setChildren(res.data.sort(compareSignatureElements)))
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, [isExpanded, actions.refreshKey, id, actions.token]);

    const handleRowClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (hasChildren) actions.onToggleElementExpand(id);
        actions.onSelectPath(currentPathElements);
    }, [hasChildren, id, currentPathElements, actions]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (hasChildren) actions.onToggleElementExpand(id);
            actions.onSelectPath(currentPathElements);
        } else if (e.key === 'ArrowRight' && hasChildren && !isExpanded) {
            e.preventDefault();
            actions.onToggleElementExpand(id);
        } else if (e.key === 'ArrowLeft' && hasChildren && isExpanded) {
            e.preventDefault();
            actions.onToggleElementExpand(id);
        }
    }, [hasChildren, id, isExpanded, currentPathElements, actions]);

    const showChildCount = hasChildren && !isExpanded;

    // On a selected row the background is `bg-primary` (near-black in light theme) while ghost
    // icons default to near-black too, so force a contrasting color when the row is active.
    const actionBtnClass = cn("h-5 w-5", isActive && "text-primary-foreground hover:bg-white/20 hover:text-primary-foreground");

    return (
        <div>
            <div
                className={cn(
                    "group flex items-center gap-1 py-0.5 px-1 rounded cursor-pointer text-xs hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive && "bg-primary text-primary-foreground font-semibold hover:bg-primary",
                )}
                style={{ paddingLeft: `${depth * 14 + 4}px` }}
                onClick={handleRowClick}
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
                <span className={cn("text-[10px] mr-0.5 shrink-0 font-mono", !isActive && "text-muted-foreground")}>{el.index || ''}</span>
                <span className="min-w-0 truncate">{el.name}</span>
                <div className="ml-auto flex items-center gap-0.5">
                    {showChildCount && (
                        <span className={cn("text-[10px] shrink-0", !isActive && "text-muted-foreground")}>({el.childCount})</span>
                    )}
                    {/* Hover-only actions */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className={actionBtnClass} title={t('previewButton', actions.preferredLanguage)} onClick={(e) => { e.stopPropagation(); actions.onPreviewElement(el); }}>
                            <Eye className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className={actionBtnClass} title={t('elementEditButtonTooltip', actions.preferredLanguage)} onClick={(e) => { e.stopPropagation(); actions.onEditElement(el); }}>
                            <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className={actionBtnClass} title={t('elementBrowserAddChildToElement', actions.preferredLanguage)} onClick={(e) => { e.stopPropagation(); actions.onAddChildToElement(el); }}>
                            <PlusCircle className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
            </div>
            {isExpanded && (
                <div>
                    {isLoading && children.length === 0 && (
                        <div className="pl-4 py-0.5"><LoadingSpinner size="sm" /></div>
                    )}
                    {!isLoading && children.length === 0 && (
                        <div className="pl-4 py-0.5 text-[10px] text-muted-foreground italic">-</div>
                    )}
                    {children.map(child => (
                        <ElementNode
                            key={child.signatureElementId!}
                            element={child}
                            depth={depth + 1}
                            pathElements={currentPathElements}
                            actions={actions}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

interface ComponentNodeProps {
    comp: SignatureComponent;
    actions: TreeActions;
}

const ComponentNode: React.FC<ComponentNodeProps> = ({ comp, actions }) => {
    const [roots, setRoots] = useState<SignatureElementSearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const compId = comp.signatureComponentId!;
    const isExpanded = actions.expandedComponentIds.includes(compId);

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
        }, actions.token)
            .then(res => setRoots(res.data.sort(compareSignatureElements)))
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, [isExpanded, actions.refreshKey, compId, actions.token]);

    const handleRowClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        actions.onToggleComponentExpand(compId);
    }, [compId, actions]);

    return (
        <div>
            <div
                className="group flex items-center gap-1 py-0.5 px-1 rounded cursor-pointer text-xs font-medium hover:bg-accent"
                onClick={handleRowClick}
            >
                {isExpanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                {isExpanded
                    ? <FolderOpen strokeWidth={comp.is_main ? 2.75 : 2} className={cn("h-3.5 w-3.5 shrink-0", comp.is_main ? "text-primary" : "text-muted-foreground")} />
                    : <Folder strokeWidth={comp.is_main ? 2.75 : 2} className={cn("h-3.5 w-3.5 shrink-0", comp.is_main ? "text-primary" : "text-muted-foreground")} />}
                <span className="min-w-0 truncate">{comp.name}</span>
                <div className="ml-auto flex items-center gap-0.5">
                    {/* Hover-only actions */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-5 w-5" title={t('previewButton', actions.preferredLanguage)} onClick={(e) => { e.stopPropagation(); actions.onPreviewComponent(comp); }}>
                            <Eye className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-5 w-5" title={t('editComponentButtonTooltip', actions.preferredLanguage)} onClick={(e) => { e.stopPropagation(); actions.onEditComponent(comp); }}>
                            <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-5 w-5" title={t('elementBrowserAddChildToComponent', actions.preferredLanguage)} onClick={(e) => { e.stopPropagation(); actions.onAddChildToComponent(comp); }}>
                            <PlusCircle className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
            </div>
            {isExpanded && (
                <div>
                    {isLoading && roots.length === 0 && (
                        <div className="pl-4 py-0.5"><LoadingSpinner size="sm" /></div>
                    )}
                    {!isLoading && roots.length === 0 && (
                        <div className="pl-4 py-0.5 text-[10px] text-muted-foreground italic">-</div>
                    )}
                    {roots.map(node => (
                        <ElementNode
                            key={node.signatureElementId!}
                            element={node}
                            depth={1}
                            pathElements={[]}
                            actions={actions}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

interface SignatureTreePickerProps {
    token: string;
    preferredLanguage: SupportedLanguage;
    canModify: boolean;
    /** The last element of the currently selected path, highlighted in the tree. */
    activeElementId: number | null;
    /** Called with the full root-to-element path when an element is clicked. */
    onSelectPath: (elements: SignatureElement[]) => void;
}

const SignatureTreePicker: React.FC<SignatureTreePickerProps> = ({ token, preferredLanguage, canModify, activeElementId, onSelectPath }) => {
    const [components, setComponents] = useState<SignatureComponent[]>([]);
    const [isLoadingComponents, setIsLoadingComponents] = useState(false);
    const [expandedComponentIds, setExpandedComponentIds] = useState<number[]>([]);
    const [expandedElementIds, setExpandedElementIds] = useState<number[]>([]);
    // Bumped after create/edit to refetch every expanded node's children (expansion is preserved).
    const [refreshKey, setRefreshKey] = useState(0);

    // --- Dialog state ---
    const [previewingElement, setPreviewingElement] = useState<SignatureElement | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewingComponent, setPreviewingComponent] = useState<SignatureComponent | null>(null);
    const [isComponentPreviewOpen, setIsComponentPreviewOpen] = useState(false);
    const [editingComponentForEdit, setEditingComponentForEdit] = useState<SignatureComponent | null>(null);
    const [isComponentFormOpen, setIsComponentFormOpen] = useState(false);
    const [elementFormMode, setElementFormMode] = useState<ElementFormMode | null>(null);
    const [elementFormTarget, setElementFormTarget] = useState<SignatureElement | null>(null);
    const [elementFormComponent, setElementFormComponent] = useState<SignatureComponent | null>(null);
    const [isElementFormOpen, setIsElementFormOpen] = useState(false);
    // Mirrors the left-menu tree: show only main components by default.
    const [mainOnly, setMainOnly] = useState(true);

    const visibleComponents = useMemo(
        () => (mainOnly ? components.filter(c => c.is_main) : components),
        [components, mainOnly],
    );

    const componentsById = useMemo(() => {
        const map = new Map<number, SignatureComponent>();
        for (const c of components) if (c.signatureComponentId !== undefined) map.set(c.signatureComponentId, c);
        return map;
    }, [components]);

    // Top-level components (refetched on refresh so names/counts stay current).
    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        setIsLoadingComponents(true);
        api.getAllSignatureComponents(token)
            .then(comps => { if (!cancelled) setComponents(comps.sort(compareSignatureComponents)); })
            .catch(console.error)
            .finally(() => { if (!cancelled) setIsLoadingComponents(false); });
        return () => { cancelled = true; };
    }, [token, refreshKey]);

    const toggleComponentExpanded = useCallback((id: number) => {
        setExpandedComponentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }, []);
    const toggleElementExpanded = useCallback((id: number) => {
        setExpandedElementIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }, []);

    // --- Row action handlers ---
    const handlePreviewElement = useCallback(async (element: SignatureElement) => {
        if (!token) return;
        try {
            const full = await api.getSignatureElementById(element.signatureElementId!, ['parents'], token);
            setPreviewingElement(full);
            setIsPreviewOpen(true);
        } catch (err: any) {
            toast.error(t('errorMessageTemplate', preferredLanguage, { message: err.message || t('elementLoadFailedError', preferredLanguage) }));
        }
    }, [token, preferredLanguage]);

    const handleEditElement = useCallback((element: SignatureElement) => {
        if (!canModify) { toast.error(t('insufficientPermissionsError', preferredLanguage)); return; }
        const comp = componentsById.get(element.signatureComponentId);
        if (!comp) { toast.error(t('componentContextMissingError', preferredLanguage)); return; }
        setElementFormMode('edit');
        setElementFormTarget(element);
        setElementFormComponent(comp);
        setIsElementFormOpen(true);
    }, [canModify, componentsById, preferredLanguage]);

    // Mirrors the "New Element" dialog on /signatures/{id}/elements/{id}: fixed parent + component picker.
    // The default component follows that page's logic: the first child's component when available,
    // otherwise the element's own component.
    const handleAddChildToElement = useCallback(async (element: SignatureElement) => {
        if (!canModify) { toast.error(t('insufficientPermissionsError', preferredLanguage)); return; }
        if (!token) return;

        let defaultComponentId = element.signatureComponentId;
        try {
            const res = await api.searchSignatureElements({
                query: [{ field: 'parentIds', condition: 'ANY_OF', value: [element.signatureElementId!], not: false }],
                page: 1,
                pageSize: 1,
            }, token);
            const firstChild = res.data[0];
            if (firstChild && firstChild.signatureComponentId !== undefined) {
                defaultComponentId = firstChild.signatureComponentId;
            }
        } catch (err) {
            console.error(err);
        }

        const comp = componentsById.get(defaultComponentId);
        if (!comp) { toast.error(t('componentContextMissingError', preferredLanguage)); return; }
        setElementFormMode('createChildOfElement');
        setElementFormTarget(element);
        setElementFormComponent(comp);
        setIsElementFormOpen(true);
    }, [canModify, componentsById, token, preferredLanguage]);

    // New top-level element inside the hovered component.
    const handleAddChildToComponent = useCallback((comp: SignatureComponent) => {
        if (!canModify) { toast.error(t('insufficientPermissionsError', preferredLanguage)); return; }
        setElementFormMode('createInComponent');
        setElementFormTarget(null);
        setElementFormComponent(comp);
        setIsElementFormOpen(true);
    }, [canModify, preferredLanguage]);

    const handlePreviewComponent = useCallback((comp: SignatureComponent) => {
        setPreviewingComponent(comp);
        setIsComponentPreviewOpen(true);
    }, []);

    const handleEditComponent = useCallback((comp: SignatureComponent) => {
        if (!canModify) { toast.error(t('insufficientPermissionsError', preferredLanguage)); return; }
        setEditingComponentForEdit(comp);
        setIsComponentFormOpen(true);
    }, [canModify, preferredLanguage]);

    const handleDeleteElement = useCallback(async (elementId: number) => {
        if (!canModify || !token) return;
        if (!window.confirm(t('confirmDeleteElementMessage', preferredLanguage))) return;
        try {
            await api.deleteSignatureElement(elementId, token);
            toast.success(t('elementDeletedSuccess', preferredLanguage));
            setRefreshKey(k => k + 1);
        } catch (err: any) {
            toast.error(t('errorMessageTemplate', preferredLanguage, { message: err.message || t('elementDeleteFailedError', preferredLanguage) }));
        }
    }, [canModify, token, preferredLanguage]);

    const handleDeleteComponent = useCallback(async (componentId: number) => {
        if (!canModify || !token) return;
        if (!window.confirm(t('confirmDeleteComponentMessage', preferredLanguage))) return;
        try {
            await api.deleteSignatureComponent(componentId, token);
            toast.success(t('componentDeletedSuccess', preferredLanguage));
            setRefreshKey(k => k + 1);
        } catch (err: any) {
            toast.error(t('errorMessageTemplate', preferredLanguage, { message: err.message || t('componentDeleteFailedError', preferredLanguage) }));
        }
    }, [canModify, token, preferredLanguage]);

    const handleElementFormSave = useCallback(async (savedElement: SignatureElement | null) => {
        const mode = elementFormMode;
        const wasEdit = mode === 'edit';
        const targetId = elementFormTarget?.signatureElementId;
        const compId = elementFormComponent?.signatureComponentId;
        setIsElementFormOpen(false);
        setElementFormMode(null);
        setElementFormTarget(null);
        setElementFormComponent(null);
        if (savedElement) {
            toast.success(wasEdit ? t('elementUpdatedSuccess', preferredLanguage) : t('elementCreatedSuccess', preferredLanguage, { name: savedElement.name }));
            // For a new element, expand its parent container so it is visible; other expansions are kept.
            if (!wasEdit) {
                if (mode === 'createChildOfElement' && targetId !== undefined) {
                    setExpandedElementIds(prev => prev.includes(targetId) ? prev : [...prev, targetId]);
                } else if (compId !== undefined) {
                    setExpandedComponentIds(prev => prev.includes(compId) ? prev : [...prev, compId]);
                }
            }
            setRefreshKey(k => k + 1);
        }
    }, [elementFormMode, elementFormTarget, elementFormComponent, preferredLanguage]);

    const handleComponentFormSave = useCallback(() => {
        setIsComponentFormOpen(false);
        setEditingComponentForEdit(null);
        setRefreshKey(k => k + 1);
    }, []);

    const actions: TreeActions = useMemo(() => ({
        token,
        canModify,
        activeElementId,
        refreshKey,
        expandedComponentIds,
        expandedElementIds,
        preferredLanguage,
        onToggleComponentExpand: toggleComponentExpanded,
        onToggleElementExpand: toggleElementExpanded,
        onSelectPath,
        onPreviewComponent: handlePreviewComponent,
        onEditComponent: handleEditComponent,
        onAddChildToComponent: handleAddChildToComponent,
        onPreviewElement: handlePreviewElement,
        onEditElement: handleEditElement,
        onAddChildToElement: handleAddChildToElement,
    }), [
        token, canModify, activeElementId, refreshKey, expandedComponentIds, expandedElementIds, preferredLanguage,
        toggleComponentExpanded, toggleElementExpanded, onSelectPath,
        handlePreviewComponent, handleEditComponent, handleAddChildToComponent,
        handlePreviewElement, handleEditElement, handleAddChildToElement,
    ]);

    return (
        <div className="flex-1 min-h-0 flex flex-col">
            {/* "Main components only" toggle, matching the left-menu tree */}
            <Label className="flex items-center gap-2 text-xs font-medium py-1 shrink-0 cursor-pointer select-none">
                <Checkbox
                    checked={mainOnly}
                    onCheckedChange={(checked) => setMainOnly(checked === true)}
                    className="h-3.5 w-3.5"
                />
                {t('quickFilterMainOnlyLabel', preferredLanguage)}
            </Label>

            {/* Scrollable tree */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                {isLoadingComponents ? (
                    <div className="flex items-center justify-center py-4"><LoadingSpinner size="sm" /></div>
                ) : visibleComponents.length === 0 ? (
                    <div className="text-xs text-muted-foreground py-2 text-center italic">{t('noComponentsFound', preferredLanguage)}</div>
                ) : (
                    visibleComponents.map(comp => (
                        <ComponentNode key={comp.signatureComponentId!} comp={comp} actions={actions} />
                    ))
                )}
            </div>

            {/* --- Element preview --- */}
            <ElementPreviewDialog
                isOpen={isPreviewOpen}
                onOpenChange={(open) => { setIsPreviewOpen(open); if (!open) setPreviewingElement(null); }}
                element={previewingElement}
                onEdit={handleEditElement}
                onDelete={handleDeleteElement}
            />

            {/* --- Component preview --- */}
            <ComponentPreviewDialog
                isOpen={isComponentPreviewOpen}
                onOpenChange={(open) => { setIsComponentPreviewOpen(open); if (!open) setPreviewingComponent(null); }}
                component={previewingComponent}
                onEdit={handleEditComponent}
                onDelete={handleDeleteComponent}
            />

            {/* --- Element form (edit / create child of element / create in component) --- */}
            <Dialog open={isElementFormOpen} onOpenChange={(open) => { if (!open) { setIsElementFormOpen(false); setElementFormMode(null); setElementFormTarget(null); setElementFormComponent(null); } }}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>{elementFormMode === 'edit' ? t('editElementDialogTitle', preferredLanguage) : t('createElementDialogTitle', preferredLanguage)}</DialogTitle>
                        <DialogDescription className="sr-only">{elementFormMode === 'edit' ? t('editElementDialogTitle', preferredLanguage) : t('createElementDialogTitle', preferredLanguage)}</DialogDescription>
                    </DialogHeader>
                    {isElementFormOpen && elementFormComponent && (
                        <ElementForm
                            elementToEdit={elementFormMode === 'edit' ? elementFormTarget : null}
                            currentComponent={elementFormComponent}
                            fixedParent={elementFormMode === 'createChildOfElement' ? elementFormTarget : null}
                            allowComponentPicker={elementFormMode === 'createChildOfElement'}
                            onSave={handleElementFormSave}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* --- Component form (edit) --- */}
            <Dialog open={isComponentFormOpen} onOpenChange={(open) => { if (!open) { setIsComponentFormOpen(false); setEditingComponentForEdit(null); } }}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>{t('editComponentDialogTitle', preferredLanguage)}</DialogTitle>
                        <DialogDescription className="sr-only">{t('editComponentDialogTitle', preferredLanguage)}</DialogDescription>
                    </DialogHeader>
                    {isComponentFormOpen && editingComponentForEdit && (
                        <ComponentForm componentToEdit={editingComponentForEdit} onSave={handleComponentFormSave} />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SignatureTreePicker;
