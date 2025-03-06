import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

// Declare the VS Code API
declare function acquireVsCodeApi(): any;

const root = createRoot(document.getElementById("app")!);
root.render(<App />);
