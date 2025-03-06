import React, { useState } from "react";
import { formatDate } from "../../../utils/format";

interface Suite {
  id: number;
  name: string;
  description: string;
  created_on: number;
  updated_on: number;
  is_completed: boolean;
  is_baseline: boolean;
  is_master: boolean;
  project_id: number;
  url: string;
  completed_on?: number;
}

interface SuiteViewProps {
  data: {
    suite: Suite;
    host: string;
  };
  vscode: {
    postMessage(message: any): void;
    getState(): any;
    setState(state: any): void;
  };
}

export const SuiteView: React.FC<SuiteViewProps> = ({ data, vscode }) => {
  const { suite, host } = data;
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(suite.name);
  const [description, setDescription] = useState(suite.description || "");

  // Function to handle saving the edited suite
  const handleSave = () => {
    vscode.postMessage({
      type: "saveSuite",
      data: {
        id: suite.id,
        name,
        description,
      },
    });
    setIsEditing(false);
  };

  // Handle canceling changes
  const handleCancel = () => {
    setName(suite.name);
    setDescription(suite.description || "");
    setIsEditing(false);
  };

  // Handle deleting the suite
  const handleDelete = () => {
    vscode.postMessage({
      type: "deleteSuite",
    });
  };

  // Function to handle adding a section
  const handleAddSection = () => {
    vscode.postMessage({
      type: "addSection",
      data: {
        suiteId: suite.id,
      },
    });
  };

  // Function to handle adding a test case
  const handleAddTestCase = () => {
    vscode.postMessage({
      type: "addTestCase",
      data: {
        suiteId: suite.id,
      },
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
              href={`${host}/index.php?/suites/view/${suite.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View in TestRail
            </a>
          </div>
          <div className="meta-item">
            <span className="meta-label">ID:</span>
            <span>S{suite.id}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Project ID:</span>
            <span>{suite.project_id}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Type:</span>
            <span>{suite.is_master ? "Master" : "Regular"}</span>
          </div>
          {suite.is_baseline && (
            <div className="meta-item">
              <span className="meta-label">Baseline:</span>
              <span>Yes</span>
            </div>
          )}
          {suite.is_completed && suite.completed_on && (
            <div className="meta-item">
              <span className="meta-label">Completed:</span>
              <span>{formatDate(suite.completed_on)}</span>
            </div>
          )}
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
          <h2>Actions</h2>
        </div>
        <div className="section-content">
          <div className="action-buttons">
            <button className="action-button" onClick={handleAddSection}>
              <span>➕</span> Add Section
            </button>
            <button className="action-button" onClick={handleAddTestCase}>
              <span>➕</span> Add Test Case
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
