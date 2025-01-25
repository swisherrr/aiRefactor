import * as vscode from 'vscode';
import { BaseAIService } from '../services/baseAIService';
import { AIService as ClaudeService } from '../services/claudeService';
import { HuggingFaceService } from '../services/huggingFaceService';

export class RefactorPanel {
    public static currentPanel: RefactorPanel | undefined;
    private readonly _view: vscode.WebviewView;
    private _claudeService?: ClaudeService;
    private _huggingFaceService?: HuggingFaceService;
    private readonly _decorationType: vscode.TextEditorDecorationType;

    constructor(view: vscode.WebviewView) {
        try {
            console.log('Initializing RefactorPanel...');
            this._view = view;
            console.log('Setting up decorations...');
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
            console.log('Setting up HTML...');
            this._view.webview.html = this._getWebviewContent();
            console.log('Setting up message listener...');
            this.setupMessageListener();
            console.log('RefactorPanel initialization complete');
        } catch (error: unknown) {
            console.error('Detailed error in RefactorPanel constructor:', {
                error,
                message: (error as Error).message,
                stack: (error as Error).stack
            });
            throw error;
        }
    }

    public static register(context: vscode.ExtensionContext) {
        const provider = new RefactorViewProvider();
        const disposable = vscode.window.registerWebviewViewProvider(
            'ai-refactor-sidebar-view',
            provider
        );
        context.subscriptions.push(disposable);
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
                    .settings-group { margin-bottom: 15px; }
                    label { display: block; margin-bottom: 5px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h3>AI Code Refactorer</h3>
                    
                    <div class="settings-group">
                        <label>AI Model:</label>
                        <select id="aiModel">
                            <option value="claude" selected>Claude (Anthropic)</option>
                            <option value="huggingface">HuggingFace Code Model</option>
                        </select>
                    </div>

                    <div class="settings-group">
                        <label>Operation:</label>
                        <select id="operation">
                            <option value="refactor">Refactor Code</option>
                            <option value="complete">Complete Code</option>
                            <option value="tonecheck">Check Comment Tone</option>
                        </select>
                    </div>

                    <div class="settings-group">
                        <label>Optimization Goal:</label>
                        <select id="optimizationGoal">
                            <option value="readability">Readability</option>
                            <option value="performance">Performance</option>
                            <option value="security">Security</option>
                        </select>
                    </div>

                    <button id="actionBtn">Process Selected Code</button>
                    <div id="explanation">
                        <h4>Changes Explained</h4>
                        <pre id="explanationText"></pre>
                    </div>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    const modelSelect = document.getElementById('aiModel');
                    const operationSelect = document.getElementById('operation');
                    
                    operationSelect.addEventListener('change', () => {
                        // Disable model selection for code completion
                        modelSelect.disabled = operationSelect.value === 'complete';
                    });

                    document.getElementById('actionBtn').addEventListener('click', () => {
                        const goal = document.getElementById('optimizationGoal').value;
                        const model = document.getElementById('aiModel').value;
                        const operation = document.getElementById('operation').value;
                        vscode.postMessage({ 
                            command: operation, 
                            goal,
                            model 
                        });
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
            console.log('Received message:', message);
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                console.log('No active editor');
                vscode.window.showErrorMessage('No active editor found');
                return;
            }

            const selection = editor.selection;
            const selectedText = editor.document.getText(selection);

            if (!selectedText) {
                console.log('No text selected');
                vscode.window.showErrorMessage('Please select code to refactor');
                return;
            }

            try {
                console.log('Getting service for model:', message.model);
                const aiService = this.getSelectedService(message.model);

                let processedCode: string;
                switch (message.command) {
                    case 'refactor':
                        console.log('Calling refactorCode');
                        processedCode = await aiService.refactorCode(selectedText, message.goal);
                        break;
                    case 'complete':
                        console.log('Calling completeCode with HuggingFace');
                        if (!this._huggingFaceService) {
                            this._huggingFaceService = new HuggingFaceService();
                        }
                        // Force HuggingFace for code completion, ignore selected model
                        processedCode = await this._huggingFaceService.completeCode(selectedText);
                        break;
                    case 'tonecheck':
                        console.log('Checking comment tone');
                        if (!this._huggingFaceService) {
                            this._huggingFaceService = new HuggingFaceService();
                        }
                        const analysis = await this._huggingFaceService.checkCommentTone(selectedText);
                        this._view.webview.postMessage({ 
                            type: 'setExplanation', 
                            text: analysis 
                        });
                        return;  // Don't show diff view for tone check
                    default:
                        return;
                }
                
                // Skip diff view if code is identical
                if (processedCode === selectedText) {
                    return;
                }
                
                // Show inline diff only if there are actual changes
                const shouldApply = await this.showInlineDiff(editor, selection, processedCode);
                
                if (shouldApply) {
                    await editor.edit(editBuilder => {
                        editBuilder.replace(selection, processedCode);
                    });
                    this._view.webview.postMessage({ 
                        type: 'setExplanation', 
                        text: 'Changes applied successfully!' 
                    });
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to process code: ${error}`);
            }
        });
    }

    private getSelectedService(model: string): BaseAIService {
        if (model === 'claude') {
            if (!this._claudeService) {
                this._claudeService = new ClaudeService();
            }
            return this._claudeService;
        } else {
            if (!this._huggingFaceService) {
                this._huggingFaceService = new HuggingFaceService();
            }
            return this._huggingFaceService;
        }
    }
}

class RefactorViewProvider implements vscode.WebviewViewProvider {
    resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        try {
            console.log('Starting webview resolution...');
            webviewView.webview.options = {
                enableScripts: true
            };
            
            console.log('Creating panel...');
            const panel = new RefactorPanel(webviewView);
            console.log('Panel created successfully');
            
        } catch (error: unknown) {
            console.error('Detailed error in resolveWebviewView:', {
                error,
                message: (error as Error).message,
                stack: (error as Error).stack
            });
            throw error;
        }
    }
} 