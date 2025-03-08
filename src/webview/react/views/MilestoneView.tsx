import React, { useState } from "react";

interface Milestone {
  id: number;
  name: string;
  description: string | null;
  start_on: number | null;
  started_on: number | null;
  due_on: number | null;
  completed_on: number | null;
  parent_id: number | null;
  project_id: number;
  refs: string | null;
  url: string;
  is_completed: boolean;
  is_started: boolean;
  milestones: Milestone[];
}

interface MilestoneViewProps {
  data: {
    milestone: Milestone;
    host: string;
    allMilestones: Milestone[];
    projectId: number;
  };
  vscode: {
    postMessage(message: any): void;
    getState(): any;
    setState(state: any): void;
  };
}

export const MilestoneView: React.FC<MilestoneViewProps> = ({
  data,
  vscode,
}) => {
  const { milestone, allMilestones } = data;
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(milestone.name);
  const [description, setDescription] = useState(milestone.description || "");
  const [dueOn, setDueOn] = useState(
    milestone.due_on
      ? new Date(milestone.due_on * 1000).toISOString().split("T")[0]
      : ""
  );
  const [startOn, setStartOn] = useState(
    milestone.start_on
      ? new Date(milestone.start_on * 1000).toISOString().split("T")[0]
      : ""
  );
  const [isCompleted, setIsCompleted] = useState(milestone.is_completed);
  const [isStarted, setIsStarted] = useState(milestone.is_started);
  const [selectedParentId, setSelectedParentId] = useState<number | null>(
    milestone.parent_id
  );
  const [refs, setRefs] = useState(milestone.refs || "");

  // Get potential parent milestones (excluding current milestone and its children)
  const potentialParents = allMilestones.filter(
    (m: Milestone) =>
      m.id !== milestone.id &&
      !isChildMilestone(allMilestones, milestone.id, m.id)
  );

  // Check if a milestone is a child of another milestone
  function isChildMilestone(
    allMilestones: Milestone[],
    potentialParentId: number,
    childId: number
  ): boolean {
    const child = allMilestones.find((m) => m.id === childId);
    if (!child) return false;
    if (child.parent_id === potentialParentId) return true;
    if (child.parent_id === null) return false;
    return isChildMilestone(allMilestones, potentialParentId, child.parent_id);
  }

  const handleSave = () => {
    const dueOnTimestamp = dueOn ? new Date(dueOn).getTime() / 1000 : null;
    const startOnTimestamp = startOn
      ? new Date(startOn).getTime() / 1000
      : null;

    vscode.postMessage({
      type: "saveMilestone",
      data: {
        name,
        description,
        due_on: dueOnTimestamp,
        start_on: startOnTimestamp,
        is_completed: isCompleted,
        is_started: isStarted,
        parent_id: selectedParentId,
        refs,
      },
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setName(milestone.name);
    setDescription(milestone.description || "");
    setDueOn(
      milestone.due_on
        ? new Date(milestone.due_on * 1000).toISOString().split("T")[0]
        : ""
    );
    setStartOn(
      milestone.start_on
        ? new Date(milestone.start_on * 1000).toISOString().split("T")[0]
        : ""
    );
    setIsCompleted(milestone.is_completed);
    setIsStarted(milestone.is_started);
    setSelectedParentId(milestone.parent_id);
    setRefs(milestone.refs || "");
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (
      window.confirm(
        `Are you sure you want to delete milestone "${milestone.name}"?`
      )
    ) {
      vscode.postMessage({
        type: "deleteMilestone",
      });
    }
  };

  // Get status badge color
  const getStatusColor = () => {
    if (milestone.is_completed) return "var(--vscode-testing-iconPassed)";
    if (milestone.is_started) return "var(--vscode-testing-iconUnset)";
    return "var(--vscode-testing-iconQueued)";
  };

  // Get status text
  const getStatusText = () => {
    if (milestone.is_completed) return "Completed";
    if (milestone.is_started) return "In Progress";
    return "Upcoming";
  };

  // Render edit form
  const renderEditForm = () => {
    return (
      <div className="milestone-edit-form card">
        <div className="card-header">
          <h2>Edit Milestone</h2>
        </div>
        <div className="card-body">
          <div className="form-group">
            <label htmlFor="name">Name:</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description:</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-control"
              rows={5}
            />
          </div>

          <div className="form-row">
            <div className="col-md-6">
              <div className="form-group">
                <label htmlFor="startOn">Start Date:</label>
                <input
                  id="startOn"
                  type="date"
                  value={startOn}
                  onChange={(e) => setStartOn(e.target.value)}
                  className="form-control"
                />
              </div>
            </div>
            <div className="col-md-6">
              <div className="form-group">
                <label htmlFor="dueOn">Due Date:</label>
                <input
                  id="dueOn"
                  type="date"
                  value={dueOn}
                  onChange={(e) => setDueOn(e.target.value)}
                  className="form-control"
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Status:</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isStarted}
                  onChange={(e) => setIsStarted(e.target.checked)}
                />
                <span>Started</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isCompleted}
                  onChange={(e) => setIsCompleted(e.target.checked)}
                />
                <span>Completed</span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="parentMilestone">Parent Milestone:</label>
            <select
              id="parentMilestone"
              value={selectedParentId || ""}
              onChange={(e) =>
                setSelectedParentId(
                  e.target.value ? Number(e.target.value) : null
                )
              }
              className="form-control"
            >
              <option value="">None</option>
              {potentialParents.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="refs">References:</label>
            <input
              id="refs"
              type="text"
              value={refs}
              onChange={(e) => setRefs(e.target.value)}
              className="form-control"
              placeholder="Comma-separated references"
            />
          </div>
        </div>
        <div className="card-footer">
          <div className="button-group">
            <button onClick={handleSave} className="btn btn-primary">
              Save
            </button>
            <button onClick={handleCancel} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render milestone details view
  const renderDetailsView = () => {
    return (
      <>
        <div className="milestone-info card">
          <div className="card-header">
            <div
              className="status-badge"
              style={{
                backgroundColor: getStatusColor(),
              }}
            >
              {getStatusText()}
            </div>
          </div>
          <div className="card-body">
            <div className="milestone-details">
              <div className="detail-row">
                <div className="detail-label">Milestone ID:</div>
                <div className="detail-value">M{milestone.id}</div>
              </div>
              <div className="detail-row">
                <div className="detail-label">Project ID:</div>
                <div className="detail-value">{milestone.project_id}</div>
              </div>
              {milestone.start_on && (
                <div className="detail-row">
                  <div className="detail-label">Start Date:</div>
                  <div className="detail-value">
                    {new Date(milestone.start_on * 1000).toLocaleDateString()}
                  </div>
                </div>
              )}
              {milestone.due_on && (
                <div className="detail-row">
                  <div className="detail-label">Due Date:</div>
                  <div className="detail-value">
                    {new Date(milestone.due_on * 1000).toLocaleDateString()}
                  </div>
                </div>
              )}
              {milestone.parent_id && (
                <div className="detail-row">
                  <div className="detail-label">Parent Milestone:</div>
                  <div className="detail-value">
                    {allMilestones.find((m) => m.id === milestone.parent_id)
                      ?.name || "Unknown"}
                  </div>
                </div>
              )}
              {milestone.refs && (
                <div className="detail-row">
                  <div className="detail-label">References:</div>
                  <div className="detail-value">{milestone.refs}</div>
                </div>
              )}
              <div className="detail-row">
                <div className="detail-label">TestRail:</div>
                <div className="detail-value">
                  <a
                    href={milestone.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="testrail-link"
                  >
                    <i className="icon-external-link"></i> View in TestRail
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {milestone.description && (
          <div className="content-section card">
            <div className="card-header">
              <h3>Description</h3>
            </div>
            <div className="card-body">
              <div
                className="description-content"
                dangerouslySetInnerHTML={{ __html: milestone.description }}
              />
            </div>
          </div>
        )}

        {milestone.milestones && milestone.milestones.length > 0 && (
          <div className="content-section card">
            <div className="card-header">
              <h3>Child Milestones</h3>
            </div>
            <div className="card-body">
              <ul className="child-milestones-list">
                {milestone.milestones.map((childMilestone) => (
                  <li key={childMilestone.id} className="child-milestone-item">
                    <div className="child-milestone-name">
                      {childMilestone.name}
                    </div>
                    <div className="child-milestone-status">
                      <span
                        className="status-indicator"
                        style={{
                          backgroundColor: childMilestone.is_completed
                            ? "var(--vscode-testing-iconPassed)"
                            : childMilestone.is_started
                            ? "var(--vscode-testing-iconUnset)"
                            : "var(--vscode-testing-iconQueued)",
                        }}
                      ></span>
                      {childMilestone.is_completed
                        ? "Completed"
                        : childMilestone.is_started
                        ? "In Progress"
                        : "Upcoming"}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="container milestone-view">
      <div className="header">
        <h1 className="page-title">
          <i className="icon-milestone"></i> {milestone.name}
        </h1>
        <div className="actions">
          {isEditing ? (
            <div className="edit-mode-indicator">
              <i className="icon-edit"></i> Editing Milestone
            </div>
          ) : (
            <div className="button-group">
              <button
                onClick={() => setIsEditing(true)}
                className="btn btn-primary"
              >
                <i className="icon-edit"></i> Edit
              </button>
              <button onClick={handleDelete} className="btn btn-danger">
                <i className="icon-delete"></i> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <style>
        {`
        .milestone-view {
          padding: 20px;
          max-width: 100%;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        .page-title {
          margin: 0;
          font-size: 24px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .btn {
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          border: none;
        }
        
        .btn-primary {
          background-color: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
        }
        
        .btn-primary:hover {
          background-color: var(--vscode-button-hoverBackground);
        }
        
        .btn-secondary {
          background-color: var(--vscode-button-secondaryBackground);
          color: var(--vscode-button-secondaryForeground);
        }
        
        .btn-secondary:hover {
          background-color: var(--vscode-button-secondaryHoverBackground);
        }
        
        .btn-danger {
          background-color: var(--vscode-errorForeground);
          color: white;
        }
        
        .btn-danger:hover {
          opacity: 0.9;
        }
        
        .card {
          background-color: var(--vscode-editor-background);
          border: 1px solid var(--vscode-panel-border);
          border-radius: 6px;
          margin-bottom: 20px;
          overflow: hidden;
        }
        
        .card-header {
          background-color: var(--vscode-sideBar-background);
          padding: 10px 15px;
          border-bottom: 1px solid var(--vscode-panel-border);
          font-weight: bold;
          display: flex;
          align-items: center;
        }
        
        .card-header h2, .card-header h3 {
          margin: 0;
          font-size: 16px;
        }
        
        .card-body {
          padding: 15px;
        }
        
        .card-footer {
          padding: 10px 15px;
          border-top: 1px solid var(--vscode-panel-border);
          background-color: var(--vscode-sideBar-background);
        }
        
        .form-group {
          margin-bottom: 15px;
        }
        
        .form-row {
          display: flex;
          margin-left: -8px;
          margin-right: -8px;
          flex-wrap: wrap;
        }
        
        .col-md-6 {
          flex: 0 0 50%;
          max-width: 50%;
          padding: 0 8px;
        }
        
        label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
        }
        
        .checkbox-group {
          display: flex;
          gap: 20px;
        }
        
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }
        
        .form-control {
          width: 100%;
          padding: 6px 10px;
          background-color: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          border: 1px solid var(--vscode-input-border);
          border-radius: 4px;
        }
        
        .form-control:focus {
          outline: none;
          border-color: var(--vscode-focusBorder);
        }
        
        .button-group {
          display: flex;
          gap: 10px;
        }
        
        .edit-mode-indicator {
          background-color: var(--vscode-editorInfo-background);
          color: var(--vscode-editorInfo-foreground);
          padding: 8px 12px;
          border-radius: 3px;
          font-size: 0.9em;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .status-badge {
          padding: 4px 8px;
          border-radius: 4px;
          color: white;
          font-weight: 500;
          font-size: 14px;
        }
        
        .milestone-details {
          display: grid;
          grid-template-columns: 150px 1fr;
          gap: 8px;
        }
        
        .detail-row {
          display: contents;
        }
        
        .detail-label {
          font-weight: 500;
          color: var(--vscode-descriptionForeground);
        }
        
        .testrail-link {
          color: var(--vscode-textLink-foreground);
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        
        .testrail-link:hover {
          text-decoration: underline;
        }
        
        .description-content {
          line-height: 1.5;
        }
        
        .child-milestones-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .child-milestone-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        .child-milestone-item:last-child {
          border-bottom: none;
        }
        
        .child-milestone-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
        }
        
        .status-indicator {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        
        /* Icons */
        [class^="icon-"] {
          display: inline-block;
          width: 16px;
          height: 16px;
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
        }
        
        .icon-milestone:before {
          content: "🏁";
        }
        
        .icon-edit:before {
          content: "✏️";
        }
        
        .icon-delete:before {
          content: "🗑️";
        }
        
        .icon-external-link:before {
          content: "🔗";
        }
        `}
      </style>

      {isEditing ? renderEditForm() : renderDetailsView()}
    </div>
  );
};
