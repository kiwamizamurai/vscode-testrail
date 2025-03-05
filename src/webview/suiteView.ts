import { Suite } from 'testrail-modern-client';
import { formatMarkdown } from '../utils/format';
import { commonStyles } from './styles';

export function getSuiteWebviewContent(suite: Suite, host: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Suite: ${suite.name}</title>
      <style>${commonStyles}</style>
    </head>
    <body>
      <div class="header">
        <div class="section-header">
          <h1 id="name-content">${suite.name}</h1>
          <button class="icon-button" onclick="editAllSections()"><span>✏️</span> Edit</button>
        </div>
        <div id="name-edit" style="display: none;">
          <textarea id="name-textarea" style="min-height: 40px">${suite.name}</textarea>
        </div>
        <div id="edit-mode-indicator" class="edit-mode-indicator">
          Editing Mode - Make your changes and click Save when done
        </div>
        <div class="meta-info">
          <div class="meta-item">
            <span class="meta-label">URL:</span>
            <a href="${host}/index.php?/suites/view/${suite.id}" target="_blank">View in TestRail</a>
          </div>
          <div class="meta-item">
            <span class="meta-label">ID:</span>
            <span>S${suite.id}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <span>Description</span>
        </div>
        <div id="description-content" class="section-content">${formatMarkdown(
          suite.description || ''
        )}</div>
        <div id="description-edit" style="display: none;">
          <textarea id="description-textarea">${suite.description || ''}</textarea>
        </div>
      </div>

      <div class="edit-actions" id="edit-actions" style="display: none;">
        <button class="secondary" onclick="cancelAllEdits()">Cancel</button>
        <button class="primary" onclick="saveAllEdits()">Save Changes</button>
      </div>

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
            command: 'updateSuite',
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

        function deleteSuite() {
          vscode.postMessage({
            command: 'deleteSuite'
          });
        }
      </script>
    </body>
    </html>
  `;
} 