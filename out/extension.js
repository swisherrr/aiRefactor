"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const refactoringProvider_1 = require("./refactoringProvider");
const claudeService_1 = require("./services/claudeService");
const RefactorPanel_1 = require("./panels/RefactorPanel");
// Main entry point for the VS Code extension
// Handles command registration and extension activation/deactivation
function activate(context) {
    const aiService = new claudeService_1.AIService();
    const refactoringProvider = new refactoringProvider_1.RefactoringProvider(aiService);
    // Register the sidebar view
    RefactorPanel_1.RefactorPanel.register(context);
    let refactorCommand = vscode.commands.registerCommand('ai-code-refactorer.refactorCode', async () => {
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
            const refactoredCode = await refactoringProvider.refactorCode(selectedText);
            await editor.edit(editBuilder => {
                editBuilder.replace(selection, refactoredCode);
            });
            vscode.window.showInformationMessage('Code refactored successfully!');
        }
        catch (error) {
            vscode.window.showErrorMessage('Failed to refactor code: ' + error);
        }
    });
    // Register commands to set API keys
    let setAnthropicKey = vscode.commands.registerCommand('ai-code-refactorer.setAnthropicKey', async () => {
        const key = await vscode.window.showInputBox({
            prompt: "Enter your Anthropic API key",
            password: true
        });
        if (key) {
            await vscode.workspace.getConfiguration('aiCodeRefactorer').update('anthropicApiKey', key, true);
            vscode.window.showInformationMessage('Anthropic API key updated successfully');
        }
    });
    let setHuggingFaceKey = vscode.commands.registerCommand('ai-code-refactorer.setHuggingFaceKey', async () => {
        const key = await vscode.window.showInputBox({
            prompt: "Enter your HuggingFace API key",
            password: true
        });
        if (key) {
            await vscode.workspace.getConfiguration('aiCodeRefactorer').update('huggingfaceApiKey', key, true);
            vscode.window.showInformationMessage('HuggingFace API key updated successfully');
        }
    });
    context.subscriptions.push(refactorCommand, setAnthropicKey, setHuggingFaceKey);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map