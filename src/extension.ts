import * as vscode from 
'vscode';
import { RefactoringProvider } from './refactoringProvider';
import { AIService } from './services/aiService';

// Main entry point for the VS Code extension
// Handles command registration and extension activation/deactivation
export function activate(context: vscode.ExtensionContext) {
    const aiService = new AIService();
    const refactoringProvider = new RefactoringProvider(aiService);

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
        } catch (error) {
            vscode.window.showErrorMessage('Failed to refactor code: ' + error);
        }
    });

    context.subscriptions.push(refactorCommand);
}

export function deactivate() {} 