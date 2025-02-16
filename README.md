# TestRail VSCode Extension

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![VS Code Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/kiwamizamurai-vscode.testrail-vscode)](https://marketplace.visualstudio.com/items?itemName=kiwamizamurai-vscode.testrail-vscode)
[![VS Code Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/d/kiwamizamurai-vscode.testrail-vscode)](https://marketplace.visualstudio.com/items?itemName=kiwamizamurai-vscode.testrail-vscode)
[![VS Code Marketplace Rating](https://img.shields.io/visual-studio-marketplace/r/kiwamizamurai-vscode.testrail-vscode)](https://marketplace.visualstudio.com/items?itemName=kiwamizamurai-vscode.testrail-vscode)
[![VS Code Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/kiwamizamurai-vscode.testrail-vscode)](https://marketplace.visualstudio.com/items?itemName=kiwamizamurai-vscode.testrail-vscode)

Seamlessly integrate TestRail into your VS Code workflow. View, edit, and manage test cases without leaving your IDE.

This is an open-source alternative to the [Paid extension by Railflow](https://railflow.io/testrail/vscode-extension).

<img src="resources/logo.png" alt="logo" width="200">

</div>

## ✨ Features

- 🚀 **Quick Access** - One-click access to TestRail from VS Code
- 🌳 **Tree View Integration** - Browse TestRail projects, suites, and test cases in VS Code's sidebar
- 📋 **Easy Test Case Editor** - Quickly create new test cases by copying existing ones and edit test cases with full markdown support

## 🚀 Installation

1. Open VS Code
2. Press `Ctrl+P` / `Cmd+P`
3. Type `ext install testrail-vscode`

## 🔧 Setup

1. Click the TestRail icon in the activity bar
2. Click "Login" and enter your credentials:
   ```
   Host URL: https://example.testrail.io
   Email: your.email@example.com
   API Key:  Generate from TestRail > My Settings > API Keys
   ```
3. (optional) Specify the project you want to use. (If you only use a specific project, select the project. otherwise, sidebar will show all projects)

## 🛠️ Development

### Running & Debugging
1. Clone the repository
   ```bash
   git clone https://github.com/kiwamizamurai/vscode-testrail.git
   cd vscode-testrail
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Open in VS Code and press `F5` to start debugging

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [TestRail API Documentation](https://support.testrail.com/hc/en-us/articles/7077083596436-Introduction-to-the-TestRail-API)
- [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview)

---

<div align="center">
Made with ❤️ for TestRail users
</div>
