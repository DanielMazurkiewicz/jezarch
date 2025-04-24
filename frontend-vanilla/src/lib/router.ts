import type { authService as AuthServiceType } from './auth-service'; // Import AuthService type

interface Route {
    path: string;
    component: string; // Tag name of the component
    params?: { [key: string]: string }; // Extracted route parameters
    regex: RegExp;
    paramNames: string[];
    requiresAdmin?: boolean;
    requiresAuth?: boolean;
}

interface RouterOptions {
    authService: AuthServiceType;
}

/**
 * Simple client-side router using History API.
 * Handles route definitions, navigation, parameter extraction, and auth guards.
 */
export class Router {
    private routes: Route[] = [];
    private rootElement: HTMLElement;
    private notFoundComponent: string = 'not-found-page'; // Default 404 component tag name
    private authService: AuthServiceType;

    constructor(rootElement: HTMLElement, options?: Partial<RouterOptions>) {
        this.rootElement = rootElement;
        if (!this.rootElement) {
            throw new Error("Router: Root element not found.");
        }
        // Get authService instance, expecting it to be passed or globally available
        this.authService = options?.authService ?? (window as any).authService; // Fallback to global if needed
        if (!this.authService) {
            console.warn("Router: AuthService instance not provided or found globally. Auth guards will not function correctly.");
            // Create a dummy service if absolutely necessary, or throw error
             this.authService = {
                 isAuthenticated: false,
                 isAdmin: false,
                 isLoading: false,
                 // Add dummy methods/getters if needed to prevent runtime errors elsewhere
                 // eslint-disable-next-line @typescript-eslint/no-empty-function
                 ensureInitialized: async () => {},
            } as any; // Cast needed for dummy service
        }
        this.handlePopState = this.handlePopState.bind(this);
    }

    /**
     * Adds a route definition.
     * @param path - The route path (e.g., '/', '/users/:id').
     * @param component - The tag name of the web component for this route.
     * @param requiresAdmin - If true, route requires admin privileges.
     * @param requiresAuth - If true, route requires authentication (ignored if requiresAdmin is true).
     */
    addRoute(path: string, component: string, requiresAdmin: boolean = false, requiresAuth: boolean = false): this {
        const paramNames: string[] = [];
        const regexPath = path.replace(/:(\w+)/g, (_, paramName) => {
            paramNames.push(paramName);
            return '([^\\/]+)'; // Capture group for parameter
        }) + '$'; // Match end of string

        this.routes.push({
            path,
            component,
            regex: new RegExp(`^${regexPath}`),
            paramNames,
            requiresAdmin,
            requiresAuth: requiresAdmin || requiresAuth, // Admin implicitly requires auth
        });
        return this;
    }

    /**
     * Sets the component tag name for the 404 Not Found page.
     * @param component - The tag name of the 404 component.
     */
    setNotFound(component: string): this {
        this.notFoundComponent = component;
        return this;
    }

    /**
     * Starts listening to popstate events for browser navigation (back/forward buttons).
     */
    listen(): this {
        window.addEventListener('popstate', this.handlePopState);
        // Initial load handling is done after auth check in index.ts
        // this.navigateTo(window.location.pathname + window.location.search);
        return this;
    }

    /**
     * Stops listening to popstate events.
     */
    stopListening(): void {
        window.removeEventListener('popstate', this.handlePopState);
    }

    /**
     * Navigates to a given path using the History API.
     * @param path - The path to navigate to (e.g., '/users/123?sort=name').
     */
    navigate(path: string): void {
        history.pushState(null, '', path);
        this.navigateTo(path);
    }

    /** Handles browser back/forward navigation. */
    private handlePopState(): void {
        this.navigateTo(window.location.pathname + window.location.search);
    }

    /**
     * Matches the current path against defined routes and renders the appropriate component.
     * Handles parameter extraction and authentication guards.
     * @param currentPath - The path to navigate to, including query string.
     */
    async navigateTo(currentPath: string): Promise<void> {
         // Wait for auth service to finish loading its initial state
         // This ensures guards have the correct info on initial load or refresh
         await this.authService.ensureInitialized();

         // console.log(`Router: Navigating to ${currentPath}. Auth state:`, {
         //     isLoading: this.authService.isLoading,
         //     isAuthenticated: this.authService.isAuthenticated,
         //     isAdmin: this.authService.isAdmin,
         // });

         // Separate path and query string
         const url = new URL(currentPath, window.location.origin);
         const pathOnly = url.pathname;
         const queryParams = new URLSearchParams(url.search);


        let matchedRoute: Route | null = null;

        for (const route of this.routes) {
            const match = pathOnly.match(route.regex);
            if (match) {
                matchedRoute = route;
                matchedRoute.params = {}; // Initialize params
                route.paramNames.forEach((name, index) => {
                    if (matchedRoute?.params) {
                        matchedRoute.params[name] = decodeURIComponent(match[index + 1]);
                    }
                });
                break;
            }
        }

        // --- Authentication & Authorization Guards ---
        if (matchedRoute) {
             if (matchedRoute.requiresAdmin && !this.authService.isAdmin) {
                 console.warn(`Router: Admin access denied for route "${matchedRoute.path}". Redirecting to login or home.`);
                 // Redirect to login if not authenticated, or home if authenticated but not admin
                 this.navigate(this.authService.isAuthenticated ? '/' : '/login');
                 return;
             }
             if (matchedRoute.requiresAuth && !this.authService.isAuthenticated) {
                  console.warn(`Router: Authentication required for route "${matchedRoute.path}". Redirecting to login.`);
                 this.navigate('/login');
                 return;
             }
        }

        // --- Render Component ---
        this.rootElement.innerHTML = ''; // Clear previous content

        const componentTag = matchedRoute ? matchedRoute.component : this.notFoundComponent;
        const componentElement = document.createElement(componentTag);

        // Pass route parameters and query parameters as attributes
        if (matchedRoute?.params) {
            Object.entries(matchedRoute.params).forEach(([key, value]) => {
                componentElement.setAttribute(`param-${key}`, value);
            });
        }
         queryParams.forEach((value, key) => {
             componentElement.setAttribute(`query-${key}`, value);
         });


        this.rootElement.appendChild(componentElement);
        // console.log(`Router: Rendered component "${componentTag}" for path "${currentPath}"`);
    }
}