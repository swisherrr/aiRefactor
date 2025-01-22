"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const refactoringProvider_1 = require("./refactoringProvider");
const aiService_1 = require("./services/aiService");
function activate(context) {
    const aiService = new aiService_1.AIService();
    const refactoringProvider = new refactoringProvider_1.RefactoringProvider(aiService);
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
    context.subscriptions.push(refactorCommand);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map