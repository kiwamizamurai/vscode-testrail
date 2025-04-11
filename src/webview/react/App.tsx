import React, { useState, useEffect } from "react";
import { TestCaseView } from "./views/TestCaseView";
import { SuiteView } from "./views/SuiteView";
import { SectionView } from "./views/SectionView";
import { RunView } from "./views/RunView";
import { TestView } from "./views/TestView";
import { ResultView } from "./views/ResultView";
import { MilestoneView } from "./views/MilestoneView";
import FeedbackView from "./views/FeedbackView";
import { vscode } from "./vscodeApi";

// Define the message types
interface VSCodeMessage {
  type: string;
  viewType: string;
  data: any;
}

export const App: React.FC = () => {
  const [viewType, setViewType] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for messages from the extension
    window.addEventListener("message", (event: MessageEvent) => {
      const message: VSCodeMessage = event.data;

      if (message.type === "init") {
        setViewType(message.viewType);
        setData(message.data);
        setLoading(false);
      } else if (message.type === "update") {
        setData(message.data);
      }
    });

    // Notify the extension that the webview is ready
    vscode.postMessage({ type: "ready" });
  }, []);

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner"></div>
      </div>
    );
  }

  // Render the appropriate view based on the viewType
  switch (viewType) {
    case "testCase":
      return <TestCaseView data={data} vscode={vscode} />;
    case "suite":
      return <SuiteView data={data} vscode={vscode} />;
    case "section":
      return <SectionView data={data} vscode={vscode} />;
    case "run":
      return <RunView data={data} vscode={vscode} />;
    case "test":
      return <TestView data={data} vscode={vscode} />;
    case "result":
      return <ResultView data={data} vscode={vscode} />;
    case "milestone":
      return <MilestoneView data={data} vscode={vscode} />;
    case "feedback":
      return <FeedbackView data={data} />;
    default:
      return <div>Unknown view type: {viewType}</div>;
  }
};
