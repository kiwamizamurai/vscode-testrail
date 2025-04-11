# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2024-07-01

### Added

- Test status management for test runs
- Feedback system for submitting bugs and feature requests
- GitHub issue creation from within the extension
- FeedbackView component in the webview UI
- Helper for safe VS Code webview API acquisition

### Changed

- Updated axios dependency from 1.7.9 to 1.8.4
- Improved ReactWebviewProvider to handle potential conflicts with VS Code API
- Updated string literals from single quotes to double quotes for consistency
- Removed default template, type, and priority variables from test case commands
- Enhanced result view with template-specific rendering
- Simplified command titles to unified shortcuts (`[c]`, `[e]`, `[d]`, `[x]`, `[v]`)

## [2.0.0] - 2024-03-08

### Added

- MilestoneCommands to `ExtensionManager` class.
- MilestoneView component to the switch case in the `App.tsx` file.
- Milestone, MilestoneCategoryItem, SuiteCategoryItem, RunsCategoryItem classes.
- Logic to display milestones, suites, and runs in the tree view.
- Logic to filter completed milestones and runs.
- Logic to display child milestones and sections in the tree view.
- Methods to fetch case types, priorities, and templates.
- Method to handle request for test case metadata.
- Input prompts for estimate and references in `handleAddTestCase`.
- File cleanup logic in `handleUploadAttachment`.
- New state variables for metadata and template fields.
- Error handling for undefined data in `ResultView` component.
- Functions to handle creating and saving a new result.
- Functions to handle canceling create and viewing attachments.

### Changed

- Updated version to 2.0.0.
- Updated wording in `README.md` for clarity and consistency.
- Updated `handleAddResult` method in `ResultCommands` class to handle direct result data objects from the webview.
- Updated `handleViewResults` method to handle direct data provided in a message.
- Updated `RunCommands` class to handle selecting a suite for `RunsCategoryItem` instances.
- Updated import statements in `treeView.ts`.
- Updated console.log statements and configuration retrieval to use double quotes.
- Updated styles in `styles.css` for various elements.

## [1.3.1] - 2024-03-07

### Added

### Changed

- Updated README.md

## [1.3.0] - 2024-03-07

### Added

### Changed

- Updated version to 1.3.0.
- Refactored webviews with react

## [1.2.0] - 2024-03-07

### Added

- Test Case Management: View, create, edit, delete, and duplicate test cases.
- Suite Management: Create, edit, and delete test suites.
- Section Management: Create, edit, and delete sections.
- Test Run Management: Create, edit, close, and delete test runs.
- Test Result Management: Add and view test results history.
- Drag and Drop Support: Reorganize test cases and sections.
- Webview loading spinner for test case details.
- Move test cases and sections functionality.

### Changed

- Updated version to 1.2.0.
- Enhanced webview content loading and error handling.
- Improved attachment handling and webview refresh logic.

## [1.0.0] - 2024-02-15

### Added

- Initial release of TestRail VSCode extension
- TestRail Explorer view for browsing test cases, suites, and sections
- Authentication management with TestRail API
- Test case management features:
  - View test case details
  - Create new test cases
  - Delete test cases
  - Duplicate test cases
- Test suite management features:
  - Create new suites
  - Edit existing suites
  - Delete suites
- Section management features:
  - Create new sections
  - Edit existing sections
  - Delete sections
- Basic commands:
  - Login/Logout functionality
  - Refresh tree view
