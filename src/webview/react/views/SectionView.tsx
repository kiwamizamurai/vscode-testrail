import React, { useState } from "react";

interface Section {
  id: number;
  name: string;
  description: string;
  suite_id: number;
  parent_id: number | null;
  depth: number;
  display_order: number;
  created_on: number;
  updated_on: number;
}

interface SectionViewProps {
  data: {
    section: Section;
    host: string;
    allSections: Section[];
    suiteId: number;
  };
  vscode: {
    postMessage(message: any): void;
    getState(): any;
    setState(state: any): void;
  };
}

export const SectionView: React.FC<SectionViewProps> = ({ data, vscode }) => {
  const { section, host, allSections, suiteId } = data;
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(section.name);
  const [description, setDescription] = useState(section.description || "");
  const [selectedParentId, setSelectedParentId] = useState<number | undefined>(
    section.parent_id === null ? undefined : section.parent_id
  );

  // Get potential parent sections (excluding current section and its children)
  const potentialParents = allSections.filter(
    (s: Section) =>
      s.id !== section.id && !isChildSection(allSections, section.id, s.id)
  );

  // Check if a section is a child of another section
  function isChildSection(
    allSections: Section[],
    potentialParentId: number,
    childId: number
  ): boolean {
    const child = allSections.find((s) => s.id === childId);
    if (!child) return false;

    if (child.parent_id === potentialParentId) return true;

    if (child.parent_id) {
      return isChildSection(allSections, potentialParentId, child.parent_id);
    }

    return false;
  }

  // Function to handle saving the edited section
  const handleSave = () => {
    vscode.postMessage({
      type: "saveSection",
      data: {
        id: section.id,
        name,
        description,
      },
    });
    setIsEditing(false);
  };

  // Function to handle canceling the edit
  const handleCancel = () => {
    setName(section.name);
    setDescription(section.description || "");
    setSelectedParentId(
      section.parent_id === null ? undefined : section.parent_id
    );
    setIsEditing(false);
  };

  // Function to handle deleting the section
  const handleDelete = () => {
    vscode.postMessage({
      type: "deleteSection",
      data: {
        id: section.id,
      },
    });
  };

  // Handle moving the section
  const handleMove = () => {
    if (selectedParentId === section.parent_id) return;

    vscode.postMessage({
      type: "moveSection",
      data: {
        parent_id: selectedParentId || null,
        suite_id: suiteId,
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
              href={`${host}/index.php?/sections/view/${section.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View in TestRail
            </a>
          </div>
          <div className="meta-item">
            <span className="meta-label">ID:</span>
            <span>S{section.id}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Suite ID:</span>
            <span>{section.suite_id}</span>
          </div>
          {section.parent_id && (
            <div className="meta-item">
              <span className="meta-label">Parent Section:</span>
              <span>
                {allSections.find((s) => s.id === section.parent_id)?.name ||
                  `ID: ${section.parent_id}`}
              </span>
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

      {isEditing && (
        <div className="content-section">
          <div className="section-header">
            <h2>Move Section</h2>
          </div>
          <div className="section-content">
            <div className="form-group">
              <label htmlFor="parent-section">Parent Section:</label>
              <select
                id="parent-section"
                value={selectedParentId || ""}
                onChange={(e) =>
                  setSelectedParentId(
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
              >
                <option value="">No Parent (Root Level)</option>
                {potentialParents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleMove}
                disabled={selectedParentId === section.parent_id}
                className="move-button"
              >
                Move Section
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="content-section">
        <div className="section-header">
          <h2>Child Sections</h2>
        </div>
        <div className="section-content">
          {allSections.filter((s) => s.parent_id === section.id).length > 0 ? (
            <ul className="child-sections-list">
              {allSections
                .filter((s) => s.parent_id === section.id)
                .sort((a, b) => a.display_order - b.display_order)
                .map((childSection) => (
                  <li key={childSection.id}>
                    <span className="child-section-name">
                      {childSection.name}
                    </span>
                    <span className="child-section-id">
                      ID: {childSection.id}
                    </span>
                  </li>
                ))}
            </ul>
          ) : (
            <div className="no-children">No child sections found.</div>
          )}
        </div>
      </div>
    </div>
  );
};
