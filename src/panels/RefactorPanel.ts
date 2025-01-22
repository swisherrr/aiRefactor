import * as vscode from 'vscode';
import { AIService } from '../services/aiService';

export class RefactorPanel {
    public static currentPanel: RefactorPanel | undefined;
    private readonly _view: vscode.WebviewView;
    private readonly _aiService: AIService;

    constructor(view: vscode.WebviewView) {
        this._view = view;
        this._aiService = new AIService();
        this._view.webview.html = this._getWebviewContent();
        this.setupMessageListener();
    }

    public static register(context: vscode.ExtensionContext) {
        const provider = new RefactorViewProvider();
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider('ai-refactor-sidebar-view', provider)
        );
    }

    private _getWebviewContent() {
        return `<!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { padding: 10px; }
                    .container { display: flex; flex-direction: column; gap: 10px; }
                    select, button { padding: 8px; }
                    button { cursor: pointer; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h3>AI Code Refactorer</h3>
                    <select id="optimizationGoal">
                        <option value="readability">Readability</option>
                        <option value="performance">Performance</option>
                        <option value="security">Security</option>
                    </select>
                    <button id="refactorBtn">Refactor Selected Code</button>
                    <div id="explanation">
                        <h4>Changes Explained</h4>
                        <pre id="explanationText"></pre>
                    </div>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    document.getElementById('refactorBtn').addEventListener('click', () => {
                        const goal = document.getElementById('optimizationGoal').value;
                        vscode.postMessage({ command: 'refactor', goal });
                    });
                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.type === 'setExplanation') {
                            document.getElementById('explanationText').textContent = message.text;
                        }
                    });
                </script>
            </body>
            </html>`;
    }

    private setupMessageListener() {
        this._view.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'refactor':
                    const editor = vscode.window.activeTextEditor;
                    if (!editor) {
                        vscode.window.showErrorMessage('No active editor found');
                        return;
                    }

                    const selection = editor.selection;
                    const selectedText = editor.document.getText(selection);

                    if (!selectedText) {
                        vscode.window.showErrorMessage('Please select code to refactor');
                        return;
                    }

                    try {
                        const refactoredCode = await this._aiService.refactorCode(selectedText, message.goal);
                        await editor.edit(editBuilder => {
                            editBuilder.replace(selection, refactoredCode);
                        });
                        this._view.webview.postMessage({ type: 'setExplanation', text: 'Code refactored successfully!' });
                    } catch (error) {
                        vscode.window.showErrorMessage('Failed to refactor code: ' + error);
                    }
                    break;
            }
        });
    }
}

class RefactorViewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
        };
        new RefactorPanel(webviewView);
    }
} 