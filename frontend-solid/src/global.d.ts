// src/global.d.ts
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.css' {
  // If you also import plain CSS files and need to handle them,
  // you might add a basic declaration here, although it's often
  // handled by the bundler without specific TS types.
  // Example: const content: string; export default content;
}

// You can add other global type declarations here if needed