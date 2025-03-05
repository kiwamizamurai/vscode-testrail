import { Run } from 'testrail-modern-client';
import { formatMarkdown, formatDate } from '../utils/format';
import { commonStyles } from './styles';

export function getRunWebviewContent(run: Run, host: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Run: ${run.name}</title>
      <style>${commonStyles}</style>
    </head>
    <body>
      <div class="header">
        <div class="section-header">
          <h1 id="name-content">${run.name}</h1>
          ${!run.is_completed ? `<button class="icon-button" onclick="editAllSections()"><span>✏️</span> Edit</button>` : ''}
        </div>
        <div id="name-edit" style="display: none;">
          <textarea id="name-textarea" style="min-height: 40px">${run.name}</textarea>
        </div>
        <div id="edit-mode-indicator" class="edit-mode-indicator">
          Editing Mode - Make your changes and click Save when done
        </div>
        <div class="meta-info">
          <div class="meta-item">
            <span class="meta-label">URL:</span>
            <a href="${host}/index.php?/runs/view/${run.id}" target="_blank">View in TestRail</a>
          </div>
          <div class="meta-item">
            <span class="meta-label">ID:</span>
            <span>R${run.id}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Created:</span>
            <span>${formatDate(run.created_on)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Updated:</span>
            <span>${run.updated_on ? formatDate(run.updated_on) : 'N/A'}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Status:</span>
            <span>${run.is_completed ? 'Completed' : 'Active'}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Project ID:</span>
            <span>P${run.project_id}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Suite ID:</span>
            <span>S${run.suite_id}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Milestone:</span>
            <span>${run.milestone_id ? `M${run.milestone_id}` : 'None'}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Include All:</span>
            <span>${run.include_all ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <span>Description</span>
        </div>
        <div id="description-content" class="section-content">${formatMarkdown(
          run.description || ''
        )}</div>
        <div id="description-edit" style="display: none;">
          <textarea id="description-textarea">${run.description || ''}</textarea>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <span>Test Results Summary</span>
        </div>
        <div class="section-content">
          <div class="meta-info">
            <div class="meta-item">
              <span class="meta-label">Passed:</span>
              <span>${run.passed_count}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Failed:</span>
              <span>${run.failed_count}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Blocked:</span>
              <span>${run.blocked_count}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Untested:</span>
              <span>${run.untested_count}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Retest:</span>
              <span>${run.retest_count}</span>
            </div>
          </div>
        </div>
      </div>

      ${!run.is_completed ? `
      <div class="edit-actions" id="edit-actions" style="display: none;">
        <button class="secondary" onclick="cancelAllEdits()">Cancel</button>
        <button class="primary" onclick="saveAllEdits()">Save Changes</button>
      </div>

      <div style="display: flex; gap: 12px; margin-top: 16px;">
        <button class="secondary" onclick="closeRun()" style="background: var(--vscode-statusBarItem-warningBackground);">Close Run</button>
        <button class="secondary" onclick="deleteRun()" style="background: var(--vscode-errorForeground);">Delete Run</button>
      </div>
      ` : `
      <div style="margin-top: 16px; padding: 10px; background-color: var(--vscode-editorInfo-background); border-radius: 4px;">
        <p>This run is completed. Completed runs cannot be edited, closed, or deleted via the API.</p>
        <p>To make changes, you need to reopen the run in TestRail web interface first.</p>
      </div>
      `}

      <script>
        const vscode = acquireVsCodeApi();
        const editableSections = ['name', 'description'];

        function editAllSections() {
          editableSections.forEach(section => {
            document.getElementById(\`\${section}-content\`).style.display = 'none';
            document.getElementById(\`\${section}-edit\`).style.display = 'block';
          });
          document.getElementById('edit-actions').style.display = 'flex';
          document.getElementById('edit-mode-indicator').style.display = 'block';
        }

        function cancelAllEdits() {
          editableSections.forEach(section => {
            document.getElementById(\`\${section}-content\`).style.display = 'block';
            document.getElementById(\`\${section}-edit\`).style.display = 'none';
          });
          document.getElementById('edit-actions').style.display = 'none';
          document.getElementById('edit-mode-indicator').style.display = 'none';
        }

        function saveAllEdits() {
          const saveButton = document.querySelector('.edit-actions button.primary');
          saveButton.textContent = 'Saving...';
          saveButton.disabled = true;
          
          const updates = {};
          
          editableSections.forEach(section => {
            const content = document.getElementById(\`\${section}-textarea\`).value;
            updates[section] = content;
          });
          
          vscode.postMessage({
            command: 'updateRun',
            data: updates
          });

          setTimeout(() => {
            cancelAllEdits();
            showSaveConfirmation();
          }, 500);
        }
        
        function showSaveConfirmation() {
          const confirmation = document.createElement('div');
          confirmation.style.position = 'fixed';
          confirmation.style.bottom = '20px';
          confirmation.style.right = '20px';
          confirmation.style.background = 'var(--vscode-editorInfo-background)';
          confirmation.style.color = 'var(--vscode-editorInfo-foreground)';
          confirmation.style.padding = '10px 16px';
          confirmation.style.borderRadius = '4px';
          confirmation.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
          confirmation.style.zIndex = '1000';
          confirmation.textContent = 'Changes saved successfully';
          
          document.body.appendChild(confirmation);
          
          setTimeout(() => {
            confirmation.style.opacity = '0';
            confirmation.style.transition = 'opacity 0.5s';
            setTimeout(() => confirmation.remove(), 500);
          }, 3000);
        }

        function closeRun() {
          vscode.postMessage({
            command: 'closeRun'
          });
        }

        function deleteRun() {
          vscode.postMessage({
            command: 'deleteRun'
          });
        }
      </script>
    </body>
    </html>
  `;
} 