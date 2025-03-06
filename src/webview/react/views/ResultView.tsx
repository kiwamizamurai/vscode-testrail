import React from "react";
import { formatDate } from "../../../utils/format";

// Add type declarations to avoid linter errors
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

interface Result {
  id: number;
  test_id: number;
  status_id: number;
  created_on: number;
  created_by: number;
  comment: string;
  defects: string;
  version: string;
  elapsed: string;
}

interface ResultViewProps {
  data: {
    result: Result;
    host: string;
    statuses: { [key: number]: string };
  };
  vscode: {
    postMessage(message: any): void;
    getState(): any;
    setState(state: any): void;
  };
}

export const ResultView: React.FC<ResultViewProps> = ({ data }) => {
  const { result, host, statuses } = data;

  // Get the status name
  const getStatusName = (statusId: number) => {
    return statuses[statusId] || `Status ID: ${statusId}`;
  };

  // Get the status class
  const getStatusClass = (statusId: number) => {
    const statusName = getStatusName(statusId).toLowerCase();
    return `status-${statusName.replace(/\s+/g, "-")}`;
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Test Result</h1>
      </div>

      <div className="result-info">
        <div className="result-details">
          <div>Result ID:</div>
          <div>{result.id}</div>
          <div>Test ID:</div>
          <div>{result.test_id}</div>
          <div>Status:</div>
          <div className={getStatusClass(result.status_id)}>
            {getStatusName(result.status_id)}
          </div>
          <div>Created:</div>
          <div>{formatDate(result.created_on)}</div>
          <div>TestRail:</div>
          <div>
            <a
              href={`${host}/index.php?/results/view/${result.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View in TestRail
            </a>
          </div>
        </div>
      </div>

      {result.comment && (
        <div className="content-section">
          <div className="section-header">
            <h2>Comment</h2>
          </div>
          <div className="section-content">
            <div
              dangerouslySetInnerHTML={{
                __html: result.comment.replace(/\n/g, "<br>"),
              }}
            />
          </div>
        </div>
      )}

      {result.defects && (
        <div className="content-section">
          <div className="section-header">
            <h2>Defects</h2>
          </div>
          <div className="section-content">
            <div>{result.defects}</div>
          </div>
        </div>
      )}

      {result.version && (
        <div className="content-section">
          <div className="section-header">
            <h2>Version</h2>
          </div>
          <div className="section-content">
            <div>{result.version}</div>
          </div>
        </div>
      )}

      {result.elapsed && (
        <div className="content-section">
          <div className="section-header">
            <h2>Elapsed Time</h2>
          </div>
          <div className="section-content">
            <div>{result.elapsed}</div>
          </div>
        </div>
      )}
    </div>
  );
};
