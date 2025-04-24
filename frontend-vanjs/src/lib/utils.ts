import van, { State } from 'vanjs-core'; // Import van for State type if used in debounce

// Debounce function - Not a hook in VanJS context, just a utility
// It returns a function that, when called, will only execute the original
// function after a specified delay without further calls.
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return (...args: Parameters<T>) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            func(...args);
            timeoutId = null; // Clear after execution
        }, delay);
    };
}

// Example usage:
// const debouncedSearch = debounce((term) => { console.log("Searching for:", term); }, 300);
// input({ oninput: (e) => debouncedSearch(e.target.value) })

// Other utility functions can be added here