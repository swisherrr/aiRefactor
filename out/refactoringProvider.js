"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefactoringProvider = void 0;
const vscode = require("vscode");
class RefactoringProvider {
    constructor(aiService) {
        this.aiService = aiService;
    }
    async refactorCode(code) {
        try {
            // Get configuration
            const config = vscode.workspace.getConfiguration('aiCodeRefactorer');
            const optimizationGoal = config.get('optimizationGoal', 'readability');
            // Send to AI service for refactoring
            const refactoredCode = await this.aiService.refactorCode(code, optimizationGoal);
            return refactoredCode;
        }
        catch (error) {
            console.error('Refactoring error:', error);
            throw error;
        }
    }
}
exports.RefactoringProvider = RefactoringProvider;
//# sourceMappingURL=refactoringProvider.js.map