import * as vscode from 'vscode';
import { AIService } from '../services/aiService';

export class RefactorPanel {
    public static currentPanel: RefactorPanel | undefined;
    private readonly _view: vscode.WebviewView;
    private readonly _aiService: AIService;
    private readonly _decorationType: vscode.TextEditorDecorationType;

    constructor(view: vscode.WebviewView) {
        this._view = view;
        this._aiService = new AIService();
        this._decorationType = vscode.window.createTextEditorDecorationType({
            after: {
                margin: '0 0 0 1em',
                color: 'lightgreen'
            },
            light: {
                backgroundColor: 'rgba(200, 250, 200, 0.2)'
            },
            dark: {
                backgroundColor: 'rgba(100, 150, 100, 0.2)'
            }
        });
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

    private async showInlineDiff(editor: vscode.TextEditor, selection: vscode.Selection, refactoredCode: string) {
        try {
            // Create decorations for removed and added lines
            const removedDecoration = vscode.window.createTextEditorDecorationType({
                backgroundColor: new vscode.ThemeColor('diffEditor.removedTextBackground'),
                textDecoration: 'line-through',
                isWholeLine: true
            });

            const addedDecoration = vscode.window.createTextEditorDecorationType({
                backgroundColor: new vscode.ThemeColor('diffEditor.insertedTextBackground'),
                isWholeLine: true,
                before: {
                    contentText: '+ ',
                    color: 'green'
                }
            });

            // Get the original text and prepare both versions
            const originalText = editor.document.getText(selection);
            const diffRange = selection;

            // Show the diff
            await editor.edit(editBuilder => {
                // First add the new version
                editBuilder.insert(diffRange.end, '\n\n' + refactoredCode);
            });

            // Apply decorations
            const originalRange = selection;
            const newRange = new vscode.Range(
                diffRange.end.translate(2, 0),
                diffRange.end.translate(2 + refactoredCode.split('\n').length, 0)
            );

            editor.setDecorations(removedDecoration, [originalRange]);
            editor.setDecorations(addedDecoration, [newRange]);

            // Show accept/reject buttons
            const action = await vscode.window.showInformationMessage(
                'Apply refactoring?',
                'Accept',
                'Reject'
            );

            // Clean up decorations
            editor.setDecorations(removedDecoration, []);
            editor.setDecorations(addedDecoration, []);

            // Clean up the text
            await editor.edit(editBuilder => {
                if (action === 'Accept') {
                    // Replace original with refactored
                    editBuilder.replace(originalRange, refactoredCode);
                    // Delete the preview
                    const previewRange = new vscode.Range(
                        diffRange.end,
                        diffRange.end.translate(refactoredCode.split('\n').length + 2, 0)
                    );
                    editBuilder.delete(previewRange);
                } else {
                    // Just delete the preview
                    const previewRange = new vscode.Range(
                        diffRange.end,
                        diffRange.end.translate(refactoredCode.split('\n').length + 2, 0)
                    );
                    editBuilder.delete(previewRange);
                }
            });

            return action === 'Accept';
        } catch (error: any) {
            console.error('Diff error:', error);
            vscode.window.showErrorMessage('Error showing diff: ' + error.message);
            return false;
        }
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
                        
                        // Show inline diff and get user confirmation
                        const shouldApply = await this.showInlineDiff(editor, selection, refactoredCode);
                        
                        if (shouldApply) {
                            await editor.edit(editBuilder => {
                                editBuilder.replace(selection, refactoredCode);
                            });
                            this._view.webview.postMessage({ 
                                type: 'setExplanation', 
                                text: 'Changes applied successfully!' 
                            });
                        }
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