import React, { useState } from "react";
import { formatDate } from "../../../utils/format";

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

interface RunViewProps {
  data: {
    run: Run;
    host: string;
  };
  vscode: {
    postMessage(message: any): void;
    getState(): any;
    setState(state: any): void;
  };
}

export const RunView: React.FC<RunViewProps> = ({ data, vscode }) => {
  const { run, host } = data;
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(run.name);
  const [description, setDescription] = useState(run.description || "");

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
    </div>
  );
};
