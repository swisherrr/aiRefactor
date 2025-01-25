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
                    .container { display: flex; flex-direction: column; gap: 12px; }
                    select { 
                        padding: 8px;
                        border: 1px solid var(--vscode-button-border);
                        background: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        border-radius: 4px;
                    }
                    button { 
                        padding: 10px 16px;
                        border: none;
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border-radius: 4px;
                        cursor: pointer;
                        font-weight: 500;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                    }
                    button:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                    .settings-group { margin-bottom: 15px; }
                    label { 
                        display: block; 
                        margin-bottom: 6px;
                        color: var(--vscode-foreground);
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h3>aiRefactor</h3>
                    
                    <div class="settings-group">
                        <label>Optimization Goal:</label>
                        <select id="optimizationGoal">
                            <option value="readability">Readability</option>
                            <option value="performance">Performance</option>
                            <option value="security">Security</option>
                        </select>
                    </div>

                    <button id="refactorBtn">Refactor with Claude 3.5</button>
                    <button id="toneCheckBtn">Check Comment Tone with DistilBERT</button>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    const state = vscode.getState() || { goal: 'readability' };
                    
                    document.getElementById('optimizationGoal').value = state.goal;
                    
                    document.getElementById('optimizationGoal').addEventListener('change', (e) => {
                        state.goal = e.target.value;
                        vscode.setState(state);
                    });

                    document.getElementById('refactorBtn').addEventListener('click', () => {
                        vscode.postMessage({ 
                            command: 'refactor',
                            goal: document.getElementById('optimizationGoal').value
                        });
                    });

                    document.getElementById('toneCheckBtn').addEventListener('click', () => {
                        vscode.postMessage({ command: 'tonecheck' });
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
                switch (message.command) {
                    case 'refactor':
                        console.log('Calling refactorCode');
                        const aiService = new ClaudeService();  // Using Claude by default
                        const processedCode = await aiService.refactorCode(selectedText, message.goal);
                        
                        if (processedCode === selectedText) {
                            return;
                        }
                        
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
                        break;

                    case 'tonecheck':
                        console.log('Checking comment tone');
                        if (!this._huggingFaceService) {
                            this._huggingFaceService = new HuggingFaceService();
                        }
                        const analysis = await this._huggingFaceService.checkCommentTone(selectedText);
                        
                        // Show analysis in notification instead of panel
                        if (analysis.includes('✅')) {
                            vscode.window.showInformationMessage(analysis);
                        } else if (analysis.includes('⚠️')) {
                            vscode.window.showWarningMessage(analysis);
                        } else {
                            vscode.window.showInformationMessage(analysis);
                        }
                        break;
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