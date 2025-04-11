import React, { useState, useEffect } from "react";
import { formatDate, formatMarkdown } from "../../../utils/format";

// Template type constants
const TEMPLATE_TEXT = 1; // Test Case (Text)
const TEMPLATE_STEPS = 2; // Test Case (Steps)
const TEMPLATE_EXPLORATORY = 3; // Exploratory Session
const TEMPLATE_BDD = 4; // Behaviour Driven Development

interface Run {
  id: number;
  name: string;
  description: string;
  created_on: number;
  created_by: number;
  is_completed: boolean;
  completed_on: number | null;
  passed_count: number;
  blocked_count: number;
  untested_count: number;
  retest_count: number;
  failed_count: number;
  project_id: number;
  plan_id: number | null;
  suite_id: number;
  milestone_id: number | null;
  assignedto_id: number | null;
  include_all: boolean;
  custom_status_count?: Record<string, number>;
  url: string;
}

interface Test {
  id: number;
  title: string;
  status_id: number;
  case_id: number;
  run_id: number;
  assignedto_id: number | null;
  created_on: number;
  custom_preconds?: string;
  custom_steps?: string;
  custom_expected?: string;
}

interface TestCase {
  id: number;
  title: string;
  custom_preconds?: string;
  custom_steps?: string;
  custom_expected?: string;
  custom_steps_separated?: {
    content: string;
    expected: string;
  }[];
  custom_bdd_scenario?: string;
  custom_mission?: string;
  custom_goals?: string;
  custom_testdata?: string;
  custom_automation_tag?: string;
  custom_automation_id?: string;
  custom_testrail_bdd_scenario?: string;
  custom_autotag?: string;
  template_id: number;
}

interface Status {
  id: number;
  name: string;
  color?: string;
  is_untested?: boolean;
  is_system?: boolean;
  label?: string;
}

interface RunViewProps {
  data: {
    run: Run;
    host: string;
    tests?: Test[];
    statuses?: Status[];
    testCases?: Record<number, TestCase>;
  };
  vscode: {
    postMessage(message: any): void;
    getState(): any;
    setState(state: any): void;
  };
}

export const RunView: React.FC<RunViewProps> = ({ data, vscode }) => {
  const { run, host, tests = [], statuses = [], testCases = {} } = data;
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(run.name);
  const [description, setDescription] = useState(run.description || "");
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [defects, setDefects] = useState("");
  const [elapsed, setElapsed] = useState("");
  const [isAddingResult, setIsAddingResult] = useState(false);

  useEffect(() => {
    if (selectedTest) {
      setSelectedStatus(selectedTest.status_id);
    }
  }, [selectedTest]);

  // Build a status map for easier lookup
  const statusMap = new Map<number, Status>();
  statuses.forEach((status) => statusMap.set(status.id, status));

  // Helper function to get status name
  const getStatusName = (statusId: number): string => {
    const status = statusMap.get(statusId);
    return status ? status.name : `Status ID: ${statusId}`;
  };

  // Helper function to get status color
  const getStatusColor = (statusId: number): string => {
    switch (statusId) {
      case 1: // Passed
        return "#36b37e";
      case 2: // Blocked
        return "#f0ad4e";
      case 3: // Untested
        return "#909090";
      case 4: // Retest
        return "#5bc0de";
      case 5: // Failed
        return "#ff5630";
      default:
        return "#909090";
    }
  };

  // Calculate total test count
  const totalTests =
    (run.passed_count || 0) +
    (run.blocked_count || 0) +
    (run.untested_count || 0) +
    (run.retest_count || 0) +
    (run.failed_count || 0);

  // Function to handle saving the edited run
  const handleSave = () => {
    vscode.postMessage({
      type: "saveRun",
      data: {
        id: run.id,
        name,
        description,
      },
    });
    setIsEditing(false);
  };

  // Function to handle canceling the edit
  const handleCancel = () => {
    setName(run.name);
    setDescription(run.description || "");
    setIsEditing(false);
  };

  // Function to handle closing the run
  const handleClose = () => {
    vscode.postMessage({
      type: "closeRun",
      data: {
        id: run.id,
      },
    });
  };

  // Handle deleting the run
  const handleDelete = () => {
    vscode.postMessage({
      type: "deleteRun",
    });
  };

  // Handle adding a test result
  const handleAddResult = () => {
    if (!selectedTest || !selectedStatus) return;

    vscode.postMessage({
      type: "addResult",
      data: {
        test_id: selectedTest.id,
        status_id: selectedStatus,
        comment: comment,
        defects: defects,
        elapsed: elapsed,
      },
    });

    // Reset form
    setComment("");
    setDefects("");
    setElapsed("");
    setIsAddingResult(false);
  };

  // Function to request updated test data after saving a result
  const handleRefreshTests = () => {
    vscode.postMessage({
      type: "getTests",
      data: {
        run_id: run.id,
      },
    });
  };

  // Render test case details
  const renderTestCaseDetails = () => {
    if (!selectedTest) {
      return (
        <div className="no-selection">
          Select a test from the list to view details
        </div>
      );
    }

    const testCase = testCases[selectedTest.case_id];

    if (!testCase) {
      return (
        <div className="test-header">
          <h3>{selectedTest.title}</h3>
          <div className="loading-message">Loading test case details...</div>
        </div>
      );
    }

    return (
      <div className="test-case-details">
        <div className="test-header">
          <h3>{testCase.title}</h3>
          <div
            className="status-badge"
            style={{ backgroundColor: getStatusColor(selectedTest.status_id) }}
          >
            {getStatusName(selectedTest.status_id)}
          </div>
        </div>

        {/* Handle different template types */}
        {testCase.template_id === TEMPLATE_STEPS &&
        testCase.custom_steps_separated &&
        testCase.custom_steps_separated.length > 0 ? (
          <>
            {testCase.custom_preconds && (
              <div className="test-section">
                <h4>Preconditions</h4>
                <div
                  className="test-section-content"
                  dangerouslySetInnerHTML={{
                    __html: formatMarkdown(testCase.custom_preconds),
                  }}
                />
              </div>
            )}
            <div className="test-section">
              <h4>Steps</h4>
              <div className="steps-separated">
                {testCase.custom_steps_separated.map((step, index) => (
                  <div key={index} className="step-item">
                    <div className="step-number">Step {index + 1}</div>
                    <div className="step-content">
                      <div className="step-label">Description:</div>
                      <div
                        dangerouslySetInnerHTML={{
                          __html: formatMarkdown(step.content),
                        }}
                      />
                    </div>
                    <div className="step-expected">
                      <div className="step-label">Expected Result:</div>
                      <div
                        dangerouslySetInnerHTML={{
                          __html: formatMarkdown(step.expected),
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : testCase.template_id === TEMPLATE_BDD ? (
          <>
            {/* BDD Template */}
            {testCase.custom_preconds && (
              <div className="test-section">
                <h4>Preconditions</h4>
                <div
                  className="test-section-content"
                  dangerouslySetInnerHTML={{
                    __html: formatMarkdown(testCase.custom_preconds),
                  }}
                />
              </div>
            )}
            {/* BDD Scenario */}
            {testCase.custom_bdd_scenario && (
              <div className="test-section">
                <h4>BDD Scenario</h4>
                <div
                  className="test-section-content"
                  dangerouslySetInnerHTML={{
                    __html: formatMarkdown(testCase.custom_bdd_scenario),
                  }}
                />
              </div>
            )}
            {testCase.custom_expected && (
              <div className="test-section">
                <h4>Expected Result</h4>
                <div
                  className="test-section-content"
                  dangerouslySetInnerHTML={{
                    __html: formatMarkdown(testCase.custom_expected),
                  }}
                />
              </div>
            )}
          </>
        ) : testCase.template_id === TEMPLATE_EXPLORATORY ? (
          <>
            {/* Exploratory Template */}
            {testCase.custom_preconds && (
              <div className="test-section">
                <h4>Preconditions</h4>
                <div
                  className="test-section-content"
                  dangerouslySetInnerHTML={{
                    __html: formatMarkdown(testCase.custom_preconds),
                  }}
                />
              </div>
            )}
            {/* Mission */}
            {testCase.custom_mission && (
              <div className="test-section">
                <h4>Mission</h4>
                <div
                  className="test-section-content"
                  dangerouslySetInnerHTML={{
                    __html: formatMarkdown(testCase.custom_mission),
                  }}
                />
              </div>
            )}
            {/* Goals */}
            {testCase.custom_goals && (
              <div className="test-section">
                <h4>Goals</h4>
                <div
                  className="test-section-content"
                  dangerouslySetInnerHTML={{
                    __html: formatMarkdown(testCase.custom_goals),
                  }}
                />
              </div>
            )}
            {/* Steps and Expected */}
            {testCase.custom_steps && (
              <div className="test-section">
                <h4>Steps</h4>
                <div
                  className="test-section-content"
                  dangerouslySetInnerHTML={{
                    __html: formatMarkdown(testCase.custom_steps),
                  }}
                />
              </div>
            )}
            {testCase.custom_expected && (
              <div className="test-section">
                <h4>Expected Result</h4>
                <div
                  className="test-section-content"
                  dangerouslySetInnerHTML={{
                    __html: formatMarkdown(testCase.custom_expected),
                  }}
                />
              </div>
            )}
          </>
        ) : testCase.template_id === TEMPLATE_TEXT ? (
          <>
            {/* Default Text Template */}
            {testCase.custom_preconds && (
              <div className="test-section">
                <h4>Preconditions</h4>
                <div
                  className="test-section-content"
                  dangerouslySetInnerHTML={{
                    __html: formatMarkdown(testCase.custom_preconds),
                  }}
                />
              </div>
            )}
            {testCase.custom_steps && (
              <div className="test-section">
                <h4>Steps</h4>
                <div
                  className="test-section-content"
                  dangerouslySetInnerHTML={{
                    __html: formatMarkdown(testCase.custom_steps),
                  }}
                />
              </div>
            )}
            {testCase.custom_expected && (
              <div className="test-section">
                <h4>Expected Result</h4>
                <div
                  className="test-section-content"
                  dangerouslySetInnerHTML={{
                    __html: formatMarkdown(testCase.custom_expected),
                  }}
                />
              </div>
            )}
          </>
        ) : (
          <>
            {/* Fallback for any other template type */}
            {testCase.custom_preconds && (
              <div className="test-section">
                <h4>Preconditions</h4>
                <div
                  className="test-section-content"
                  dangerouslySetInnerHTML={{
                    __html: formatMarkdown(testCase.custom_preconds),
                  }}
                />
              </div>
            )}
            {testCase.custom_steps && (
              <div className="test-section">
                <h4>Steps</h4>
                <div
                  className="test-section-content"
                  dangerouslySetInnerHTML={{
                    __html: formatMarkdown(testCase.custom_steps),
                  }}
                />
              </div>
            )}
            {testCase.custom_expected && (
              <div className="test-section">
                <h4>Expected Result</h4>
                <div
                  className="test-section-content"
                  dangerouslySetInnerHTML={{
                    __html: formatMarkdown(testCase.custom_expected),
                  }}
                />
              </div>
            )}
          </>
        )}

        <div className="result-actions">
          {!isAddingResult ? (
            <button
              className="add-result-button"
              onClick={() => setIsAddingResult(true)}
            >
              Add Result
            </button>
          ) : (
            <div className="result-form">
              <h4>Add Test Result</h4>
              <div className="form-group">
                <label htmlFor="status">Status:</label>
                <select
                  id="status"
                  value={selectedStatus || ""}
                  onChange={(e) => setSelectedStatus(Number(e.target.value))}
                  className="form-control"
                >
                  {statuses
                    .filter((s) => !s.is_untested)
                    .map((status) => (
                      <option key={status.id} value={status.id}>
                        {status.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="comment">Comment:</label>
                <textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="form-control"
                  placeholder="Enter result comment"
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label htmlFor="defects">Defects:</label>
                <input
                  id="defects"
                  type="text"
                  value={defects}
                  onChange={(e) => setDefects(e.target.value)}
                  className="form-control"
                  placeholder="e.g., JIRA-123, BUG-456"
                />
              </div>
              <div className="form-group">
                <label htmlFor="elapsed">Elapsed Time:</label>
                <input
                  id="elapsed"
                  type="text"
                  value={elapsed}
                  onChange={(e) => setElapsed(e.target.value)}
                  className="form-control"
                  placeholder="e.g., 30s, 1m 45s"
                />
              </div>
              <div className="form-actions">
                <button className="primary-button" onClick={handleAddResult}>
                  Save Result
                </button>
                <button
                  className="cancel-button"
                  onClick={() => {
                    setIsAddingResult(false);
                    setComment("");
                    setDefects("");
                    setElapsed("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container">
      <div className="header">
        <div className="section-header">
          {isEditing ? (
            <textarea
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ minHeight: "40px" }}
            />
          ) : (
            <h1>{name}</h1>
          )}
          <div className="button-group">
            {isEditing ? (
              <div className="edit-actions">
                <button className="primary" onClick={handleSave}>
                  Save Changes
                </button>
                <button onClick={handleCancel}>Cancel</button>
              </div>
            ) : (
              <>
                <button
                  className="icon-button"
                  onClick={() => setIsEditing(true)}
                >
                  <span>✏️</span> Edit
                </button>
                {!run.is_completed && (
                  <button className="icon-button" onClick={handleClose}>
                    <span>✓</span> Close Run
                  </button>
                )}
                <button className="icon-button danger" onClick={handleDelete}>
                  <span>🗑️</span> Delete
                </button>
              </>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="edit-mode-indicator">
            Editing Mode - Make your changes and click Save when done
          </div>
        )}

        <div className="meta-info">
          <div className="meta-item">
            <span className="meta-label">URL:</span>
            <a
              href={`${host}/index.php?/runs/view/${run.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View in TestRail
            </a>
          </div>
          <div className="meta-item">
            <span className="meta-label">ID:</span>
            <span>R{run.id}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Created:</span>
            <span>{formatDate(run.created_on)}</span>
          </div>
          {run.is_completed && run.completed_on && (
            <div className="meta-item">
              <span className="meta-label">Completed:</span>
              <span>{formatDate(run.completed_on)}</span>
            </div>
          )}
          <div className="meta-item">
            <span className="meta-label">Status:</span>
            <span
              className={
                run.is_completed ? "status-completed" : "status-active"
              }
            >
              {run.is_completed ? "Completed" : "Active"}
            </span>
          </div>
        </div>
      </div>

      <div className="content-section">
        <div className="section-header">
          <h2>Description</h2>
        </div>
        <div className="section-content">
          {isEditing ? (
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="full-width-textarea"
            />
          ) : (
            <div>{description || "No description provided."}</div>
          )}
        </div>
      </div>

      <div className="content-section">
        <div className="section-header">
          <h2>Test Results Summary</h2>
        </div>
        <div className="section-content">
          <div className="test-summary">
            <div className="test-summary-item">
              <span className="test-summary-label">Total Tests:</span>
              <span className="test-summary-value">{totalTests}</span>
            </div>
            {run.passed_count !== undefined && (
              <div className="test-summary-item status-passed">
                <span className="test-summary-label">Passed:</span>
                <span className="test-summary-value">{run.passed_count}</span>
              </div>
            )}
            {run.failed_count !== undefined && (
              <div className="test-summary-item status-failed">
                <span className="test-summary-label">Failed:</span>
                <span className="test-summary-value">{run.failed_count}</span>
              </div>
            )}
            {run.blocked_count !== undefined && (
              <div className="test-summary-item status-blocked">
                <span className="test-summary-label">Blocked:</span>
                <span className="test-summary-value">{run.blocked_count}</span>
              </div>
            )}
            {run.retest_count !== undefined && (
              <div className="test-summary-item status-retest">
                <span className="test-summary-label">Retest:</span>
                <span className="test-summary-value">{run.retest_count}</span>
              </div>
            )}
            {run.untested_count !== undefined && (
              <div className="test-summary-item status-untested">
                <span className="test-summary-label">Untested:</span>
                <span className="test-summary-value">{run.untested_count}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="content-section">
        <div className="section-header">
          <h2>Tests</h2>
          <button className="refresh-button" onClick={handleRefreshTests}>
            <span>🔄</span> Refresh
          </button>
        </div>
        <div className="section-content tests-section">
          {tests.length > 0 ? (
            <div className="test-view-container">
              <div className="test-list">
                {tests.map((test) => (
                  <div
                    key={test.id}
                    className={`test-item ${
                      selectedTest?.id === test.id ? "selected" : ""
                    }`}
                    onClick={() => setSelectedTest(test)}
                  >
                    <div className="test-title">{test.title}</div>
                    <div
                      className="status-indicator"
                      style={{
                        backgroundColor: getStatusColor(test.status_id),
                      }}
                    >
                      {getStatusName(test.status_id)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="test-details-pane">{renderTestCaseDetails()}</div>
            </div>
          ) : (
            <div className="no-tests">
              No tests found in this run. Tests will appear here after they are
              added to the run.
            </div>
          )}
        </div>
      </div>

      <style>
        {`
          .tests-section {
            padding: 0;
          }
          
          .test-view-container {
            display: flex;
            height: 500px;
            border: 1px solid var(--vscode-panel-border);
          }
          
          .test-list {
            width: 30%;
            overflow-y: auto;
            border-right: 1px solid var(--vscode-panel-border);
          }
          
          .test-item {
            padding: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .test-item:hover {
            background-color: var(--vscode-list-hoverBackground);
          }
          
          .test-item.selected {
            background-color: var(--vscode-list-activeSelectionBackground);
            color: var(--vscode-list-activeSelectionForeground);
          }
          
          .test-title {
            flex-grow: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          .status-indicator {
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 12px;
            color: white;
            margin-left: 8px;
          }
          
          .test-details-pane {
            flex-grow: 1;
            padding: 15px;
            overflow-y: auto;
          }
          
          .no-selection, .no-tests, .loading-message {
            display: flex;
            height: 100%;
            align-items: center;
            justify-content: center;
            color: var(--vscode-descriptionForeground);
          }
          
          .test-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
          }
          
          .test-header h3 {
            margin: 0;
          }
          
          .status-badge {
            padding: 4px 8px;
            border-radius: 4px;
            color: white;
            font-size: 14px;
          }
          
          .test-section {
            margin-bottom: 20px;
          }
          
          .test-section h4 {
            margin-top: 0;
            margin-bottom: 8px;
            font-size: 16px;
          }
          
          .test-section-content {
            line-height: 1.5;
          }
          
          .steps-separated .step-item {
            margin-bottom: 15px;
            padding: 10px;
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
          }
          
          .step-number {
            font-weight: bold;
            margin-bottom: 8px;
          }
          
          .step-label {
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .step-content, .step-expected {
            margin-bottom: 10px;
          }
          
          .result-actions {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid var(--vscode-panel-border);
          }
          
          .add-result-button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
          }
          
          .result-form {
            background-color: var(--vscode-editor-background);
            padding: 15px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
          }
          
          .result-form h4 {
            margin-top: 0;
            margin-bottom: 15px;
          }
          
          .form-group {
            margin-bottom: 12px;
          }
          
          .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
          }
          
          .form-control {
            width: 100%;
            padding: 8px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 4px;
          }
          
          .form-actions {
            display: flex;
            gap: 10px;
            margin-top: 15px;
          }
          
          .primary-button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
          }
          
          .cancel-button {
            background-color: var(--vscode-button-secondaryBackground, #f1f1f1);
            color: var(--vscode-button-secondaryForeground, #333);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
          }
          
          .refresh-button {
            background-color: transparent;
            border: 1px solid var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 4px;
          }
        `}
      </style>
    </div>
  );
};
