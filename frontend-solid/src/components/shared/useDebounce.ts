import { createSignal, createEffect, onCleanup, Accessor } from 'solid-js'; // Import Accessor type

// Accept an Accessor function as input
function useDebounce<T>(valueAccessor: Accessor<T>, delay: number): Accessor<T> {
  // Initialize debouncedValue with the initial value from the accessor
  const [debouncedValue, setDebouncedValue] = createSignal<T>(valueAccessor());
  let handler: any; // Use 'any' for timeout ID type

  createEffect(() => {
    // Read the signal via the accessor inside the effect
    const currentValue = valueAccessor();
    // Clear previous timeout if it exists
    if (handler) clearTimeout(handler);

    handler = setTimeout(() => {
      // Update the debounced value only if it has actually changed
      // This requires reading the current debounced value *inside* the setter function
      setDebouncedValue(prev => {
          // Basic check for primitives; complex objects might need deep comparison
          if (prev !== currentValue) {
              return currentValue;
          }
          return prev;
      });
    }, delay) as any; // Cast timeout ID to any

    // Cleanup function
    onCleanup(() => {
      if (handler) clearTimeout(handler);
    });
  }); // Rerun effect whenever the input value signal changes

  return debouncedValue; // Return the debounced signal accessor
}

export default useDebounce;