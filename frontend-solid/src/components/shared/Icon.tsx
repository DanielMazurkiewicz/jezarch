import { Component, splitProps, JSX } from 'solid-js';
import * as icons from './icons'; // Import all icons from the icons file
import { cn } from '@/lib/utils';

export type IconName = keyof typeof icons;

interface IconProps extends JSX.SvgSVGAttributes<SVGSVGElement> { // Use correct Solid SVG attributes type
    name: IconName;
    class?: string;
    size?: string | number; // Allow string (e.g., "1.5em") or number (pixels)
    // color prop is handled via style or parent class now
}

export const Icon: Component<IconProps> = (props) => {
    const [local, rest] = splitProps(props, ['name', 'class', 'size']);

    const IconComponent = icons[local.name];

    if (!IconComponent) {
        console.warn(`Icon not found: ${local.name}`);
        // Return a default fallback icon or null
        const FallbackIcon = icons['HelpCircle']; // Use a fallback
        return (
            <FallbackIcon
                 class={cn('icon icon-fallback', local.class)} // Keep base class
                 style={{
                    width: typeof local.size === 'number' ? `${local.size}px` : local.size ?? '1em', // Handle number/string size
                    height: typeof local.size === 'number' ? `${local.size}px` : local.size ?? '1em',
                    display: 'inline-block', // Ensure proper alignment/sizing
                    'vertical-align': 'middle',
                    'flex-shrink': 0, // Prevent shrinking in flex contexts
                    ...(typeof rest.style === 'object' ? rest.style : {}), // Merge styles safely
                 }}
                 // Pass through standard SVG props
                 fill="none"
                 stroke="currentColor"
                 stroke-width="2"
                 stroke-linecap="round"
                 stroke-linejoin="round"
                 // Exclude style from rest if it exists
                 {...(() => { const { style, ...remaining } = rest; return remaining; })()}
            />
        );
    }

    return (
        <IconComponent
            class={cn('icon', `icon-${local.name}`, local.class)} // Keep base class
            style={{
                width: typeof local.size === 'number' ? `${local.size}px` : local.size ?? '1em', // Handle number/string size
                height: typeof local.size === 'number' ? `${local.size}px` : local.size ?? '1em',
                display: 'inline-block', // Ensure proper alignment/sizing
                'vertical-align': 'middle',
                'flex-shrink': 0,
                ...(typeof rest.style === 'object' ? rest.style : {}), // Merge styles safely
            }}
            // Pass through standard SVG props commonly used
             fill="none"
             stroke="currentColor"
             stroke-width="2"
             stroke-linecap="round"
             stroke-linejoin="round"
            // Spread remaining props like aria-label, title, etc.
            {...(() => { const { style, ...remaining } = rest; return remaining; })()}
        />
    );
};