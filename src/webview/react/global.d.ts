// Type declarations for VS Code webview API
declare function acquireVsCodeApi(): {
  postMessage(message: any): void;
  getState(): any;
  setState(state: any): void;
};

// Declare modules for CSS imports
declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}

// Fix for React and JSX
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
