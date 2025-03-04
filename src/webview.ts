import { TestCase, Suite, Attachment, Section, Run, Test, Result, Status } from 'testrail-modern-client';
import { formatMarkdown, formatDate, formatFileSize } from './utils/format';

const commonStyles = `
  body { 
    padding: 16px; 
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }
  .header { 
    margin-bottom: 24px; 
    border-bottom: 1px solid var(--vscode-panel-border);
    padding-bottom: 16px;
  }
  .meta-info { 
    display: grid; 
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); 
    gap: 12px;
    margin: 16px 0;
  }
  .meta-item { 
    display: flex; 
    gap: 8px;
    align-items: center;
  }
  .meta-label { 
    font-weight: 500; 
    color: var(--vscode-descriptionForeground);
  }
  .section { 
    margin-bottom: 24px; 
    background: var(--vscode-editor-background);
    border-radius: 6px;
    padding: 16px;
  }
  .section-header { 
    font-weight: 500; 
    margin-bottom: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .section-content {
    min-height: 100px; 
    white-space: pre-wrap;
    font-family: var(--vscode-editor-font-family);
    font-size: var(--vscode-editor-font-size);
  }
  button {
    padding: 4px 12px; 
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  button:hover {
    background: var(--vscode-button-hoverBackground);
  }
  textarea {
    width: 100%; 
    min-height: 100px; 
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    padding: 8px;
    font-family: var(--vscode-editor-font-family);
    font-size: var(--vscode-editor-font-size);
    resize: vertical;
  }
  .edit-actions {
    margin-top: 8px; 
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
  a {
    color: var(--vscode-textLink-foreground);
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
  .bdd-content {
    font-family: var(--vscode-editor-font-family);
    font-size: var(--vscode-editor-font-size);
    white-space: pre-wrap;
    margin: 0;
    padding: 8px;
    background: var(--vscode-textCodeBlock-background);
    border-radius: 4px;
  }
  .attachments {
    display: grid; 
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
  }
  .attachment-card {
    display: flex; 
    flex-direction: column;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    overflow: hidden;
  }
  .attachment-preview {
    height: 120px; 
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--vscode-editor-background);
    border-bottom: 1px solid var(--vscode-panel-border);
    cursor: pointer;
  }
  .preview-image {
    max-width: 100%; 
    max-height: 100%;
    object-fit: contain;
  }
  .file-icon {
    font-size: 32px;
  }
  .attachment-info {
    padding: 8px;
  }
  .attachment-name {
    font-weight: 500; 
    margin-bottom: 4px;
    word-break: break-all;
  }
  .attachment-meta {
    font-size: 12px; 
    color: var(--vscode-descriptionForeground);
  }
  .delete-attachment-button {
    margin: 8px; 
    background: var(--vscode-errorForeground);
  }
  .delete-attachment-button:hover {
    background: var(--vscode-errorForeground);
    opacity: 0.8;
  }
  .modal {
    display: none; 
    position: fixed;
    z-index: 1;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.9);
  }
  .modal-content {
    margin: auto; 
    display: block;
    max-width: 90%;
    max-height: 90%;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
  .close {
    position: absolute; 
    right: 32px;
    top: 16px;
    color: #f1f1f1;
    font-size: 40px;
    font-weight: bold;
    cursor: pointer;
  }
  .close:hover {
    color: #bbb;
  }
  .upload-button {
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
  }
  .upload-button:hover {
    background: var(--vscode-button-secondaryHoverBackground);
  }
  .no-results {
    padding: 20px;
    text-align: center;
    color: var(--vscode-disabledForeground);
  }
  .test-section {
    margin-bottom: 20px;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    overflow: hidden;
  }
  .test-section h3 {
    margin: 0;
    padding: 10px;
    background-color: var(--vscode-editor-inactiveSelectionBackground);
    border-bottom: 1px solid var(--vscode-panel-border);
  }
  .test-section-content {
    padding: 10px;
    white-space: pre-wrap;
    font-family: var(--vscode-editor-font-family);
    font-size: var(--vscode-editor-font-size);
    line-height: 1.5;
  }
`;

function getBDDSection(testCase: TestCase): string {
  return `
  <div class="section">
    <div class="section-header">
      <span>BDD Scenario</span>
    </div>
    <pre class="bdd-content">${testCase.custom_testrail_bdd_scenario || ''}</pre>
  </div>`;
}

function getAttachmentsSection(attachments: Attachment[]): string {
  return `
  <div class="section">
    <div class="section-header">
      <span>Attachments</span>
      <button class="upload-button" data-section="attachments">Upload</button>
    </div>
    <div class="section-content">
      <div class="attachments">
        ${attachments
          .map(
            (attachment) => `
          <div class="attachment-card">
            <div class="attachment-preview">
              ${
                attachment.is_image
                  ? `<img src="data:image/*;base64,${attachment.id}" class="preview-image" alt="${attachment.filename}" />`
                  : `<div class="file-icon">📄</div>`
              }
            </div>
            <div class="attachment-info">
              <div class="attachment-name">${attachment.filename}</div>
              <div class="attachment-meta">
                ${formatFileSize(attachment.size)} • 
                ${new Date(attachment.created_on * 1000).toLocaleDateString()}
              </div>
            </div>
            <button class="delete-attachment-button" data-id="${attachment.id}">Delete</button>
          </div>
        `
          )
          .join('')}
      </div>
    </div>
  </div>
  <div id="imageModal" class="modal">
    <span class="close">&times;</span>
    <img class="modal-content" id="modalImage" />
  </div>`;
}

export function getWebviewContent(
  testCase: TestCase,
  host: string,
  attachments: Attachment[] = []
): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>TestCase: ${testCase.title}</title>
      <style>${commonStyles}</style>
    </head>
    <body>
      <div class="header">
        <div class="section-header">
          <h1 id="title-content">${testCase.title}</h1>
          <button onclick="editSection('title')">Edit</button>
        </div>
        <div id="title-edit" style="display: none;">
          <textarea id="title-textarea" style="min-height: 40px">${testCase.title}</textarea>
          <div class="edit-actions">
            <button onclick="cancelEdit('title')">Cancel</button>
            <button onclick="saveEdit('title')">Save</button>
          </div>
        </div>
        <div class="meta-info">
          <div class="meta-item">
            <span class="meta-label">URL:</span>
            <a href="${host}/index.php?/cases/view/${testCase.id}" target="_blank">View in TestRail</a>
          </div>
          <div class="meta-item">
            <span class="meta-label">ID:</span>
            <span>C${testCase.id}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Created:</span>
            <span>${formatDate(testCase.created_on)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Updated:</span>
            <span>${formatDate(testCase.updated_on)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Type:</span>
            <span>Type ${testCase.type_id}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Priority:</span>
            <span>P${testCase.priority_id}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <span>References</span>
          <button onclick="editSection('refs')">Edit</button>
        </div>
        <div id="refs-content" class="section-content">${formatMarkdown(testCase.refs || '')}</div>
        <div id="refs-edit" style="display: none;">
          <textarea id="refs-textarea">${testCase.refs || ''}</textarea>
          <div class="edit-actions">
            <button onclick="cancelEdit('refs')">Cancel</button>
            <button onclick="saveEdit('refs')">Save</button>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <span>Preconditions</span>
          <button onclick="editSection('custom_preconds')">Edit</button>
        </div>
        <div id="custom_preconds-content" class="section-content">${formatMarkdown(
          testCase.custom_preconds || ''
        )}</div>
        <div id="custom_preconds-edit" style="display: none;">
          <textarea id="custom_preconds-textarea">${testCase.custom_preconds || ''}</textarea>
          <div class="edit-actions">
            <button onclick="cancelEdit('custom_preconds')">Cancel</button>
            <button onclick="saveEdit('custom_preconds')">Save</button>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <span>Steps</span>
          <button onclick="editSection('custom_steps')">Edit</button>
        </div>
        <div id="custom_steps-content" class="section-content">${formatMarkdown(
          testCase.custom_steps || ''
        )}</div>
        <div id="custom_steps-edit" style="display: none;">
          <textarea id="custom_steps-textarea">${testCase.custom_steps || ''}</textarea>
          <div class="edit-actions">
            <button onclick="cancelEdit('custom_steps')">Cancel</button>
            <button onclick="saveEdit('custom_steps')">Save</button>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <span>Expected Result</span>
          <button onclick="editSection('custom_expected')">Edit</button>
        </div>
        <div id="custom_expected-content" class="section-content">${formatMarkdown(
          testCase.custom_expected || ''
        )}</div>
        <div id="custom_expected-edit" style="display: none;">
          <textarea id="custom_expected-textarea">${testCase.custom_expected || ''}</textarea>
          <div class="edit-actions">
            <button onclick="cancelEdit('custom_expected')">Cancel</button>
            <button onclick="saveEdit('custom_expected')">Save</button>
          </div>
        </div>
      </div>

      ${getBDDSection(testCase)}
      ${getAttachmentsSection(attachments)}

      <script>
        (() => {
          const vscode = acquireVsCodeApi();

          function editSection(section) {
            document.getElementById(\`\${section}-content\`).style.display = 'none';
            document.getElementById(\`\${section}-edit\`).style.display = 'block';
          }

          function cancelEdit(section) {
            document.getElementById(\`\${section}-content\`).style.display = 'block';
            document.getElementById(\`\${section}-edit\`).style.display = 'none';
          }

          function saveEdit(section) {
            const content = document.getElementById(\`\${section}-textarea\`).value;
            vscode.postMessage({
              command: 'updateTestCase',
              data: { [section]: content }
            });
            document.getElementById(\`\${section}-content\`).innerHTML = content;
            cancelEdit(section);
          }

          function deleteTestCase() {
            vscode.postMessage({
              command: 'deleteTestCase'
            });
          }

          // Add upload button click handler
          const uploadButton = document.querySelector('.upload-button');
          uploadButton?.addEventListener('click', () => {
            vscode.postMessage({
              command: 'upload'
            });
          });

          // Add delete attachment button click handlers
          const deleteAttachmentButtons = document.querySelectorAll('.delete-attachment-button');
          deleteAttachmentButtons.forEach(button => {
            button.addEventListener('click', (e) => {
              const target = e.target;
              if (!target || !(target instanceof HTMLElement)) return;
              
              const idStr = target.dataset.id;
              console.log('Delete button clicked, ID:', idStr);
              if (!idStr) return;
              
              vscode.postMessage({
                command: 'confirmDeleteAttachment',
                id: idStr
              });
            });
          });

          // Image preview modal
          const modal = document.getElementById('imageModal');
          const modalImg = document.getElementById('modalImage');
          const closeBtn = document.querySelector('.close');
          
          // Handle attachment data messages
          window.addEventListener('message', event => {
            const message = event.data;
            if (message.type === 'attachmentData') {
              const images = document.querySelectorAll(\`img[src="data:image/*;base64,\${message.id}"]\`);
              images.forEach(img => {
                img.src = \`data:image/*;base64,\${message.data}\`;
              });
            } else if (message.type === 'refreshAttachments') {
              const attachmentsContainer = document.querySelector('.attachments');
              if (attachmentsContainer) {
                attachmentsContainer.innerHTML = message.attachments
                  .map(
                    (attachment) => \`
                  <div class="attachment-card">
                    <div class="attachment-preview">
                      \${
                        attachment.is_image
                          ? \`<img src="data:image/*;base64,\${attachment.id}" class="preview-image" alt="\${attachment.filename}" />\`
                          : \`<div class="file-icon">📄</div>\`
                      }
                    </div>
                    <div class="attachment-info">
                      <div class="attachment-name">\${attachment.filename}</div>
                      <div class="attachment-meta">
                        \${formatFileSize(attachment.size)} • 
                        \${new Date(attachment.created_on * 1000).toLocaleDateString()}
                      </div>
                    </div>
                    <button class="delete-attachment-button" data-id="\${attachment.data_id}">Delete</button>
                  </div>
                \`
                  )
                  .join('');

                // Re-attach event listeners
                attachEventListeners();
              }
            }
          });

          function attachEventListeners() {
            // Remove existing event listeners first
            document.querySelectorAll('.delete-attachment-button').forEach(button => {
              button.replaceWith(button.cloneNode(true));
            });
            document.querySelectorAll('.preview-image').forEach(img => {
              img.replaceWith(img.cloneNode(true));
            });

            // Attach preview image click handlers
            document.querySelectorAll('.preview-image').forEach(img => {
              img.addEventListener('click', function() {
                modal.style.display = "block";
                modalImg.src = this.src;
              });
            });

            // Attach delete button handlers
            document.querySelectorAll('.delete-attachment-button').forEach(button => {
              button.addEventListener('click', (e) => {
                const target = e.target;
                if (!target || !(target instanceof HTMLElement)) return;
                
                const idStr = target.dataset.id;
                console.log('Delete button clicked, ID:', idStr);
                if (!idStr) return;
                
                vscode.postMessage({
                  command: 'confirmDeleteAttachment',
                  id: idStr
                });
              });
            });

            // Request attachment data for all images
            document.querySelectorAll('img[src^="data:image/*;base64,"]').forEach(img => {
              const id = img.src.split(',')[1];
              vscode.postMessage({
                command: 'getAttachment',
                id
              });
            });
          }

          // Attach initial event listeners
          attachEventListeners();

          // Modal close handlers
          closeBtn.addEventListener('click', function() {
            modal.style.display = "none";
          });
          
          modal.addEventListener('click', function(e) {
            if (e.target === modal) {
              modal.style.display = "none";
            }
          });
        })();
      </script>
    </body>
    </html>
  `;
}

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
          <button onclick="editSection('name')">Edit</button>
        </div>
        <div id="name-edit" style="display: none;">
          <textarea id="name-textarea" style="min-height: 40px">${suite.name}</textarea>
          <div class="edit-actions">
            <button onclick="cancelEdit('name')">Cancel</button>
            <button onclick="saveEdit('name')">Save</button>
          </div>
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
          <button onclick="editSection('description')">Edit</button>
        </div>
        <div id="description-content" class="section-content">${formatMarkdown(
          suite.description || ''
        )}</div>
        <div id="description-edit" style="display: none;">
          <textarea id="description-textarea">${suite.description || ''}</textarea>
          <div class="edit-actions">
            <button onclick="cancelEdit('description')">Cancel</button>
            <button onclick="saveEdit('description')">Save</button>
          </div>
        </div>
      </div>

      <script>
        const vscode = acquireVsCodeApi();
        const suiteId = ${suite.id};

        function editSection(section) {
          document.getElementById(\`\${section}-content\`).style.display = 'none';
          document.getElementById(\`\${section}-edit\`).style.display = 'block';
        }

        function cancelEdit(section) {
          document.getElementById(\`\${section}-content\`).style.display = 'block';
          document.getElementById(\`\${section}-edit\`).style.display = 'none';
        }

        function saveEdit(section) {
          const content = document.getElementById(\`\${section}-textarea\`).value;
          const data = { 
            [section]: content,
            id: suiteId
          };
          console.log('Sending updateSuite message with data:', data);
          vscode.postMessage({
            command: 'updateSuite',
            data
          });
          document.getElementById(\`\${section}-content\`).innerHTML = content;
          cancelEdit(section);
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

export function getSectionWebviewContent(section: Section, host: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Section: ${section.name}</title>
      <style>${commonStyles}</style>
    </head>
    <body>
      <div class="header">
        <div class="section-header">
          <h1 id="name-content">${section.name}</h1>
          <button onclick="editSection('name')">Edit</button>
        </div>
        <div id="name-edit" style="display: none;">
          <textarea id="name-textarea" style="min-height: 40px">${section.name}</textarea>
          <div class="edit-actions">
            <button onclick="cancelEdit('name')">Cancel</button>
            <button onclick="saveEdit('name')">Save</button>
          </div>
        </div>
        <div class="meta-info">
          <div class="meta-item">
            <span class="meta-label">URL:</span>
            <a href="${host}/index.php?/sections/view/${section.id}" target="_blank">View in TestRail</a>
          </div>
          <div class="meta-item">
            <span class="meta-label">ID:</span>
            <span>SE${section.id}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <span>Description</span>
          <button onclick="editSection('description')">Edit</button>
        </div>
        <div id="description-content" class="section-content">${formatMarkdown(
          section.description || ''
        )}</div>
        <div id="description-edit" style="display: none;">
          <textarea id="description-textarea">${section.description || ''}</textarea>
          <div class="edit-actions">
            <button onclick="cancelEdit('description')">Cancel</button>
            <button onclick="saveEdit('description')">Save</button>
          </div>
        </div>
      </div>

      <script>
        const vscode = acquireVsCodeApi();

        function editSection(section) {
          document.getElementById(\`\${section}-content\`).style.display = 'none';
          document.getElementById(\`\${section}-edit\`).style.display = 'block';
        }

        function cancelEdit(section) {
          document.getElementById(\`\${section}-content\`).style.display = 'block';
          document.getElementById(\`\${section}-edit\`).style.display = 'none';
        }

        function saveEdit(section) {
          const content = document.getElementById(\`\${section}-textarea\`).value;
          vscode.postMessage({
            command: 'updateSection',
            data: { [section]: content }
          });
          document.getElementById(\`\${section}-content\`).innerHTML = content;
          cancelEdit(section);
        }

        function deleteSection() {
          vscode.postMessage({
            command: 'deleteSection'
          });
        }
      </script>
    </body>
    </html>
  `;
}

export async function getRunWebviewContent(run: Run, host: string): Promise<string> {
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
          ${!run.is_completed ? `<button onclick="editSection('name')">Edit</button>` : ''}
        </div>
        <div id="name-edit" style="display: none;">
          <textarea id="name-textarea" style="min-height: 40px">${run.name}</textarea>
          <div class="edit-actions">
            <button onclick="cancelEdit('name')">Cancel</button>
            <button onclick="saveEdit('name')">Save</button>
          </div>
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
          ${!run.is_completed ? `<button onclick="editSection('description')">Edit</button>` : ''}
        </div>
        <div id="description-content" class="section-content">${formatMarkdown(
          run.description || ''
        )}</div>
        <div id="description-edit" style="display: none;">
          <textarea id="description-textarea">${run.description || ''}</textarea>
          <div class="edit-actions">
            <button onclick="cancelEdit('description')">Cancel</button>
            <button onclick="saveEdit('description')">Save</button>
          </div>
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
      <div style="display: flex; gap: 8px; margin-top: 16px;">
        <button onclick="closeRun()" style="background: var(--vscode-statusBarItem-warningBackground);">Close Run</button>
        <button onclick="deleteRun()" style="background: var(--vscode-errorForeground);">Delete Run</button>
      </div>
      ` : `
      <div style="margin-top: 16px; padding: 10px; background-color: var(--vscode-editorInfo-background); border-radius: 4px;">
        <p>This run is completed. Completed runs cannot be edited, closed, or deleted via the API.</p>
        <p>To make changes, you need to reopen the run in TestRail web interface first.</p>
      </div>
      `}

      <script>
        const vscode = acquireVsCodeApi();

        function editSection(section) {
          document.getElementById(\`\${section}-content\`).style.display = 'none';
          document.getElementById(\`\${section}-edit\`).style.display = 'block';
        }

        function cancelEdit(section) {
          document.getElementById(\`\${section}-content\`).style.display = 'block';
          document.getElementById(\`\${section}-edit\`).style.display = 'none';
        }

        function saveEdit(section) {
          const content = document.getElementById(\`\${section}-textarea\`).value;
          vscode.postMessage({
            command: 'updateRun',
            data: { [section]: content }
          });
          document.getElementById(\`\${section}-content\`).innerHTML = content;
          cancelEdit(section);
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

export async function getResultWebviewContent(
  test: Test, 
  results: Result[], 
  statuses: Status[], 
  host: string,
  parentRun?: Run
): Promise<string> {
  const statusMap = new Map<number, Status>();
  statuses.forEach(status => statusMap.set(status.id, status));
  
  const getStatusName = (statusId: number): string => {
    const status = statusMap.get(statusId);
    return status ? status.name : 'Unknown';
  };
  
  const getStatusClass = (statusId: number): string => {
    switch (statusId) {
      case 1: return 'status-passed';
      case 2: return 'status-blocked';
      case 3: return 'status-untested';
      case 4: return 'status-retest';
      case 5: return 'status-failed';
      default: return 'status-unknown';
    }
  };
  
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleString();
  };
  
  const resultsHtml = results.length > 0 
    ? results.map((result, _index) => `
      <div class="result-card ${getStatusClass(result.status_id)}">
        <div class="result-header">
          <span class="result-status">${getStatusName(result.status_id)}</span>
          <span class="result-date">${formatDate(result.created_on)}</span>
        </div>
        <div class="result-body">
          ${result.comment ? `<div class="result-comment"><strong>Comment:</strong> ${result.comment}</div>` : ''}
          ${result.defects ? `<div class="result-defects"><strong>Defects:</strong> ${result.defects}</div>` : ''}
          ${result.elapsed ? `<div class="result-elapsed"><strong>Elapsed:</strong> ${result.elapsed}</div>` : ''}
          ${result.version ? `<div class="result-version"><strong>Version:</strong> ${result.version}</div>` : ''}
        </div>
        <div class="result-footer">
          <button class="view-in-testrail" onclick="openInTestRail(${result.id})">View in TestRail</button>
        </div>
      </div>
    `).join('')
    : '<div class="no-results">No results found for this test.</div>';
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Test Results</title>
      <style>
        body {
          font-family: var(--vscode-font-family);
          color: var(--vscode-foreground);
          background-color: var(--vscode-editor-background);
          padding: 20px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 1px solid var(--vscode-panel-border);
          padding-bottom: 10px;
        }
        .test-info {
          margin-bottom: 20px;
        }
        .test-title {
          font-size: 1.5em;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .test-details {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 8px;
          margin-bottom: 20px;
        }
        .test-details div:nth-child(odd) {
          font-weight: bold;
        }
        .results-container {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        .result-card {
          border: 1px solid var(--vscode-panel-border);
          border-radius: 4px;
          overflow: hidden;
        }
        .result-header {
          display: flex;
          justify-content: space-between;
          padding: 10px;
          border-bottom: 1px solid var(--vscode-panel-border);
        }
        .result-body {
          padding: 10px;
        }
        .result-footer {
          padding: 10px;
          display: flex;
          justify-content: flex-end;
          border-top: 1px solid var(--vscode-panel-border);
        }
        .result-status {
          font-weight: bold;
        }
        .status-passed {
          border-left: 5px solid #4CAF50;
        }
        .status-failed {
          border-left: 5px solid #F44336;
        }
        .status-blocked {
          border-left: 5px solid #FF9800;
        }
        .status-untested {
          border-left: 5px solid #9E9E9E;
        }
        .status-retest {
          border-left: 5px solid #2196F3;
        }
        .status-unknown {
          border-left: 5px solid #9C27B0;
        }
        .no-results {
          padding: 20px;
          text-align: center;
          color: var(--vscode-disabledForeground);
        }
        .test-section {
          margin-bottom: 20px;
          border: 1px solid var(--vscode-panel-border);
          border-radius: 4px;
          overflow: hidden;
        }
        .test-section h3 {
          margin: 0;
          padding: 10px;
          background-color: var(--vscode-editor-inactiveSelectionBackground);
          border-bottom: 1px solid var(--vscode-panel-border);
        }
        .test-section-content {
          padding: 10px;
          white-space: pre-wrap;
          font-family: var(--vscode-editor-font-family);
          font-size: var(--vscode-editor-font-size);
          line-height: 1.5;
        }
        button {
          background-color: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          padding: 6px 12px;
          border-radius: 2px;
          cursor: pointer;
        }
        button:hover {
          background-color: var(--vscode-button-hoverBackground);
        }
        .actions {
          display: flex;
          gap: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Test Results</h1>
        <div class="actions">
          <button id="addResultBtn">Add Result</button>
          <button id="refreshBtn">Refresh</button>
        </div>
      </div>
      
      <div class="test-info">
        <div class="test-title">${test.title}</div>
        <div class="test-details">
          <div>Test ID:</div>
          <div>${test.id}</div>
          <div>Run:</div>
          <div>${parentRun ? parentRun.name : 'Unknown'}</div>
          <div>Status:</div>
          <div class="${getStatusClass(test.status_id)}">${getStatusName(test.status_id)}</div>
          ${test.case_id ? `
            <div>Case ID:</div>
            <div>${test.case_id}</div>
          ` : ''}
          <div>TestRail:</div>
          <div><a href="${host}/index.php?/tests/view/${test.id}" target="_blank">View in TestRail</a></div>
        </div>
      </div>
      
      ${(test as any).custom_preconds ? `
      <div class="test-section">
        <h3>前提条件 (Preconditions)</h3>
        <div class="test-section-content">${(test as any).custom_preconds.replace(/\n/g, '<br>')}</div>
      </div>
      ` : ''}
      
      ${(test as any).custom_steps ? `
      <div class="test-section">
        <h3>テスト手順 (Steps)</h3>
        <div class="test-section-content">${(test as any).custom_steps.replace(/\n/g, '<br>')}</div>
      </div>
      ` : ''}
      
      ${(test as any).custom_expected ? `
      <div class="test-section">
        <h3>期待される結果 (Expected Results)</h3>
        <div class="test-section-content">${(test as any).custom_expected.replace(/\n/g, '<br>')}</div>
      </div>
      ` : ''}
      
      <h2>Results History (${results.length})</h2>
      <div class="results-container">
        ${resultsHtml}
      </div>
      
      <script>
        (function() {
          const vscode = acquireVsCodeApi();
          
          document.getElementById('addResultBtn').addEventListener('click', () => {
            vscode.postMessage({
              command: 'addResult'
            });
          });
          
          document.getElementById('refreshBtn').addEventListener('click', () => {
            vscode.postMessage({
              command: 'refresh'
            });
          });
          
          window.openInTestRail = (resultId) => {
            window.open('${host}/index.php?/results/view/' + resultId, '_blank');
          };
        })();
      </script>
    </body>
    </html>
  `;
}
