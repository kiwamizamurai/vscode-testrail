import React, { useState } from "react";

interface Test {
  id: number;
  title: string;
  status_id: number;
  case_id: number;
  run_id: number;
  assignedto_id: number | null;
  created_on: number;
  updated_on: number;
  custom_preconds?: string;
  custom_steps?: string;
  custom_expected?: string;
}

interface Status {
  id: number;
  name: string;
  label?: string;
  color_dark?: string;
  color_medium?: string;
  color_bright?: string;
}

interface TestViewProps {
  data: {
    test: Test;
    host: string;
    statuses: { [key: number]: string };
  };
  vscode: {
    postMessage(message: any): void;
    getState(): any;
    setState(state: any): void;
  };
}

export const TestView: React.FC<TestViewProps> = ({ data, vscode }) => {
  const { test, host, statuses } = data;
  const [selectedStatus, _setSelectedStatus] = useState(test.status_id);
  const [comment, _setComment] = useState("");

  // Create a map of status IDs to status objects for easy lookup
  const statusMap = new Map<number, Status>();
  const statusesArray = Object.entries(statuses).map(([id, name]) => ({
    id: Number(id),
    name,
  }));
  statusesArray.forEach((status) => statusMap.set(status.id, status));

  // Helper function to get status name
  const getStatusName = (statusId: number): string => {
    const status = statusMap.get(statusId);
    return status ? status.name : `Status ID: ${statusId}`;
  };

  // Helper function to get status class
  const getStatusClass = (statusId: number): string => {
    switch (statusId) {
      case 1:
        return "status-passed";
      case 2:
        return "status-blocked";
      case 3:
        return "status-untested";
      case 4:
        return "status-retest";
      case 5:
        return "status-failed";
      default:
        return "status-unknown";
    }
  };

  // Function to handle adding a result
  const handleAddResult = () => {
    vscode.postMessage({
      type: "addResult",
      data: {
        test_id: test.id,
        status_id: selectedStatus,
        comment: comment,
      },
    });
  };

  // Function to handle viewing results
  const handleViewResults = () => {
    vscode.postMessage({
      type: "viewResults",
      data: {
        test_id: test.id,
      },
    });
  };

  return (
    <div className="container">
      <div className="header">
        <h1>{test.title}</h1>
        <div className="actions">
          <button onClick={handleAddResult}>Add Result</button>
          <button onClick={handleViewResults}>View Results</button>
        </div>
      </div>

      <div className="test-info">
        <div className="test-details">
          <div>Test ID:</div>
          <div>{test.id}</div>
          <div>Case ID:</div>
          <div>{test.case_id}</div>
          <div>Run:</div>
          <div>{test.run_id}</div>
          <div>Status:</div>
          <div className={getStatusClass(test.status_id)}>
            {getStatusName(test.status_id)}
          </div>
          <div>TestRail:</div>
          <div>
            <a
              href={`${host}/index.php?/tests/view/${test.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View in TestRail
            </a>
          </div>
        </div>
      </div>

      {test.custom_preconds && (
        <div className="test-section">
          <h3>Preconditions</h3>
          <div
            className="test-section-content"
            dangerouslySetInnerHTML={{
              __html: test.custom_preconds.replace(/\n/g, "<br>"),
            }}
          />
        </div>
      )}

      {test.custom_steps && (
        <div className="test-section">
          <h3>Steps</h3>
          <div
            className="test-section-content"
            dangerouslySetInnerHTML={{
              __html: test.custom_steps.replace(/\n/g, "<br>"),
            }}
          />
        </div>
      )}

      {test.custom_expected && (
        <div className="test-section">
          <h3>Expected Results</h3>
          <div
            className="test-section-content"
            dangerouslySetInnerHTML={{
              __html: test.custom_expected.replace(/\n/g, "<br>"),
            }}
          />
        </div>
      )}
    </div>
  );
};
