import van, { State } from "vanjs-core";

const { div, a } = van.tags;

// --- Minimal Type Definitions (if VanJS doesn't export them) ---
type PropValue = string | number | boolean | null | undefined | Function | object;
type PropValueOrDerived = PropValue | State<PropValue>;
type VanChild = Node | State<Node | null> | string | number | boolean | null | undefined | readonly VanChild[];
interface VanTag<ElementType extends Element = HTMLElement> {
    // Allows any string key for attributes
    [key: string]: PropValueOrDerived | any;
    // Standard HTML properties (optional)
    class?: PropValueOrDerived;
    style?: PropValueOrDerived;
}


// --- Router Types ---
type RouteComponent = () => HTMLElement | State<HTMLElement | null> | null; // Allow returning state or null
type RouteParams = Record<string, string>;
type Route = {
  path: string; // e.g., /users/:userId
  regex: RegExp;
  component: RouteComponent;
  keys: string[]; // Parameter keys, e.g., ['userId']
};

// --- Router State ---
const currentPath = van.state(window.location.pathname);
const currentParams = van.state<RouteParams>({});
const currentQuery = van.state<URLSearchParams>(new URLSearchParams(window.location.search));

// Update state on popstate (back/forward buttons)
window.addEventListener("popstate", () => {
  console.log("Router: popstate event ->", window.location.pathname);
  currentPath.val = window.location.pathname;
  currentQuery.val = new URLSearchParams(window.location.search);
  // Param re-matching happens in the Router component based on new path
});

// --- Navigation Function ---
export function navigate(to: string, options?: { replace?: boolean; state?: any }) {
    const current = window.location.pathname + window.location.search;
    if (to === current && !options?.state) return; // Avoid navigating to the same URL without new state

    console.log(`Router: Navigating ${options?.replace ? ' (replace)' : ''} to -> ${to}`);
    if (options?.replace) {
        window.history.replaceState(options?.state ?? null, "", to); // Use options?.state
    } else {
        window.history.pushState(options?.state ?? null, "", to); // Use options?.state
    }
    // Update VanJS states
    const url = new URL(to, window.location.origin);
    currentPath.val = url.pathname;
    currentQuery.val = url.searchParams;
    // Param re-matching happens in the Router component
}

// --- Link Component ---
interface LinkProps extends Omit<Partial<HTMLAnchorElement>, 'href' | 'class' | 'onclick' | 'children'> { // Use Partial HTMLAnchorElement attributes
    to: string;
    replace?: boolean;
    state?: any;
    activeClass?: string; // Class to add when link is active
    class?: string | State<string>; // Allow string or State<string> for class
    [key: string]: any; // Allow other attributes
}
export const Link = (props: LinkProps, ...children: VanChild[]) => {
    const {
        to,
        replace,
        state,
        activeClass = "active", // Default active class name
        class: className, // Rename prop to avoid conflict
        ...rest
    } = props;

    const handleClick = (e: MouseEvent) => {
        // Allow cmd/ctrl/shift click for new tabs/windows
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(to, { replace, state });
    };

    // Derive active state based on currentPath
    const isActive = van.derive(() => {
        const pathVal = currentPath.val;
        // Exact match or prefix match (e.g., /archive active for /archive/...)
        return pathVal === to || (to !== '/' && pathVal.startsWith(to + '/'));
    });

    // Dynamically compute the class string
    const computedClass = van.derive(() => {
         // Resolve className if it's a state
        const baseClass = typeof className === 'object' && className !== null && 'val' in className
                         ? className.val
                         : className || '';
        return `${baseClass}${isActive.val && activeClass ? ` ${activeClass}` : ''}`.trim();
    });

    // Derive attributes object for the anchor tag
    const attrs = van.derive(() => ({
        ...rest,
        href: to,
        class: computedClass.val, // Use the derived class value
        onclick: handleClick,
        'aria-current': isActive.val ? 'page' : undefined, // Use derived isActive value
    }));

    return a(attrs, children); // Pass derived attributes object
};

// --- Route Matching Logic ---
function parsePath(path: string): { regex: RegExp; keys: string[] } {
  const keys: string[] = [];
  const pattern = path
    .replace(/:(\w+)/g, (_, key) => {
      keys.push(key);
      return "([^\\/]+)"; // Capture group for the parameter
    })
    .replace(/\*/g, "(.*)") // Wildcard support
    .replace(/\/?$/, "\\/?") // Optional trailing slash
    .replace(/^/, "^") // Start of string
    .concat("$"); // End of string
  return { regex: new RegExp(pattern), keys };
}

function matchRoute(routes: Route[], path: string): { route: Route | null; params: RouteParams } {
  for (const route of routes) {
    const match = path.match(route.regex);
    if (match) {
      const params = route.keys.reduce((acc, key, index) => {
        acc[key] = match[index + 1]; // +1 because match[0] is the full string
        return acc;
      }, {} as RouteParams);
      return { route, params };
    }
  }
  return { route: null, params: {} };
}

// --- Router Component ---
interface RouterProps {
    routes: { path: string; component: RouteComponent }[];
    notFoundComponent?: RouteComponent;
}
export function Router({ routes: routeDefs, notFoundComponent }: RouterProps) {
    const parsedRoutes: Route[] = routeDefs.map(r => ({
        ...r,
        ...parsePath(r.path)
    }));

    const NotFound = notFoundComponent || (() => div("404 - Not Found"));

    // Derive the component to render based on the current path
    const CurrentContent = van.derive(() => {
        console.log("Router: Path changed, matching route for ->", currentPath.val);
        const { route, params } = matchRoute(parsedRoutes, currentPath.val);
        currentParams.val = params; // Update params state
        console.log("Router: Matched Route ->", route?.path, "Params ->", params);
        const Component = route ? route.component : NotFound;
        const rendered = Component(); // Execute the component function
        // Check if it returned a state, otherwise return the direct element/null
        if (rendered && typeof rendered === 'object' && 'val' in rendered && 'oldVal' in rendered) {
            return (rendered as State<HTMLElement | null>); // Return the state itself if component returns state
        }
        return rendered as HTMLElement | null; // Return the direct result (element or null)
    });

    // Render the derived component's result (which is now HTMLElement or null or State)
    // VanJS handles rendering states directly within children.
    return div(() => CurrentContent.val);
}


// --- Hook-like functions to access router state ---
export const useLocation = (): { path: State<string>, query: State<URLSearchParams> } => {
  return { path: currentPath, query: currentQuery };
};

export const useParams = (): State<RouteParams> => {
  return currentParams;
};

export const useSearchParams = (): [State<URLSearchParams>, (newParams: URLSearchParams | Record<string, string>, options?: { replace?: boolean }) => void] => {
  const setSearchParams = (newParams: URLSearchParams | Record<string, string>, options?: { replace?: boolean }) => {
    const params = newParams instanceof URLSearchParams ? newParams : new URLSearchParams(newParams);
    const newSearch = params.toString();
    const newUrl = `${currentPath.val}${newSearch ? `?${newSearch}` : ''}`;
    navigate(newUrl, options);
  };
  return [currentQuery, setSearchParams];
};

export const useNavigate = () => navigate;