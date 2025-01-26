import Anthropic from '@anthropic-ai/sdk';
import * as vscode from 'vscode';
import { BaseAIService } from './baseAIService';

// Handles communication with AI services
// Integrates with Anthropic's Claude API for code refactoring
export class AIService implements BaseAIService {
    private anthropic: Anthropic;

    constructor() {
        const config = vscode.workspace.getConfiguration('aiCodeRefactorer');
        const apiKey = config.get<string>('anthropicApiKey') || '';
        if (!apiKey) {
            throw new Error('Anthropic API key not configured. Please add it in settings.');
        }
        this.anthropic = new Anthropic({ apiKey });
    }

    async refactorCode(code: string, optimizationGoal: string): Promise<string> {
        try {
            let prompt = `As a code refactoring assistant, analyze this code for ${optimizationGoal} improvements.\n\n`;

            switch (optimizationGoal) {
                case 'performance':
                    prompt += `Performance Analysis Instructions:
1. Check for algorithmic inefficiencies:
   - O(n²) loops that could be O(n)
   - Redundant operations
   - Unnecessary array traversals
   - Inefficient data structures
2. Look for specific performance issues:
   - Nested loops that could be simplified or stacked instead
   - Multiple array iterations that could be combined
   - Using includes() inside loops
   - Redundant calculations
3. Consider using:
   - Hash maps/Sets for lookups
   - Single-pass solutions
   - More efficient data structures

IMPORTANT: Return ONLY the refactored code with no explanations or comments.
If no improvements needed, return 'NO_CHANGES_NEEDED'.

Original code:
${code}`;
                    break;

                case 'readability':
                    prompt += `Readability Analysis Instructions:
1. Check for naming issues:
   - Single-letter variable names
   - Unclear function names
   - Abbreviations without context
   - Inconsistent naming patterns

2. Check for formatting issues:
   - Missing spaces around operators
   - Inconsistent indentation
   - Missing line breaks
   - Code not properly spaced
   - Long lines that should be split

3. Check for structural issues:
   - Unclear parameter names
   - Missing or unclear block structure
   - Nested logic that could be simplified
   - Inconsistent brace style
   - Magic numbers without context

4. Improve by:
   - Using descriptive variable names
   - Adding proper spacing and indentation
   - Breaking long lines into readable chunks
   - Using consistent formatting
   - Making logic flow clear

IMPORTANT: Return ONLY the refactored code with no explanations or comments.
If no improvements needed, return 'NO_CHANGES_NEEDED'.

Original code:
${code}`;
                    break;

                case 'security':
                    prompt += `Security Analysis Instructions:
1. Check for critical vulnerabilities:
   - Hardcoded credentials or API keys
   - Use of eval() or similar dangerous functions
   - Unsanitized input handling
   - XSS vulnerabilities
   - Insecure HTTP usage
   - SQL injection risks
   - Prototype pollution
   - Unsafe object assignments

2. Check for data exposure:
   - Sensitive data in frontend code
   - Exposed credentials
   - Insecure storage of secrets
   - Logging of sensitive information
   - Unencrypted data transmission

3. Check for unsafe practices:
   - Direct DOM manipulation with user input
   - Use of innerHTML with untrusted data
   - Lack of input validation
   - Insecure URL handling
   - Dangerous string concatenation

4. Required fixes:
   - Remove hardcoded credentials
   - Use environment variables for secrets
   - Sanitize all user inputs
   - Use HTTPS for all requests
   - Implement proper input validation
   - Use safe DOM methods
   - Add security headers
   - Use secure string operations

IMPORTANT: Return ONLY the refactored code with no explanations or comments.
If no improvements needed, return 'NO_CHANGES_NEEDED'.

Original code:
${code}`;
                    break;

                case 'modernization':
                    prompt += `Modernization Analysis Instructions:
1. Check for outdated patterns:
   - var instead of let/const
   - Traditional functions vs arrow functions
   - Callbacks instead of Promises/async-await
   - Old loop patterns vs modern iterators
   - Manual DOM manipulation vs modern APIs

2. Update to modern JavaScript:
   - Convert to ES6+ syntax
   - Use template literals
   - Implement destructuring
   - Use optional chaining
   - Convert to nullish coalescing
   - Use modern array methods
   - Implement async/await
   - Use modern class syntax

3. Apply modern best practices:
   - Use strict mode
   - Implement modules
   - Use proper imports/exports
   - Convert to TypeScript syntax
   - Use modern event handling`;
                    break;

                case 'testability':
                    prompt += `Testability Analysis Instructions:
1. Check for testability issues:
   - Functions with side effects
   - Hard-to-mock dependencies
   - Global state usage
   - Tight coupling
   - Mixed concerns
   - Untestable conditionals

2. Improve for testing:
   - Extract pure functions
   - Add dependency injection
   - Separate side effects
   - Break down complex functions
   - Make dependencies explicit
   - Improve function isolation

3. Enable better testing:
   - Add parameter validation
   - Make return values consistent
   - Remove hidden state
   - Extract configuration
   - Make side effects obvious`;
                    break;

                case 'error-handling':
                    prompt += `Error Handling Analysis Instructions:
1. Check for error handling issues:
   - Missing try-catch blocks
   - Swallowed exceptions
   - Unclear error messages
   - Unhandled edge cases
   - Missing error types
   - Silent failures

2. Improve error handling:
   - Add proper try-catch
   - Use custom error classes
   - Add meaningful error messages
   - Handle all edge cases
   - Implement error recovery
   - Add error logging

3. Error handling best practices:
   - Proper error propagation
   - Consistent error patterns
   - Descriptive error types
   - Graceful degradation
   - User-friendly messages`;
                    break;
            }

            prompt += `\n\nIMPORTANT: Return ONLY the refactored code with no explanations or comments.
If no improvements needed, return 'NO_CHANGES_NEEDED'.

Original code:
${code}`;

            const response = await this.anthropic.messages.create({
                model: 'claude-3-haiku-20240307',
                max_tokens: 1500,
                messages: [{ role: 'user', content: prompt }],
                system: "You are a code refactoring assistant. Return ONLY the refactored code with no explanations. If no changes are needed, return exactly 'NO_CHANGES_NEEDED'."
            });

            if (response.content[0].type === 'text') {
                let refactoredCode = response.content[0].text;
                
                // Clean up the response
                refactoredCode = refactoredCode
                    .replace(/```[\w]*\n/g, '')
                    .replace(/```\n?/g, '')
                    .replace(/Here['']s the refactored code:?\n*/gi, '')
                    .replace(/Explanation:[\s\S]*$/i, '')  // Remove any explanation section
                    .replace(/^[\s\S]*?function/, 'function')  // Remove any text before the function
                    .trim();

                // Check if AI decided no changes were needed
                if (refactoredCode.includes('NO_CHANGES_NEEDED')) {
                    vscode.window.showInformationMessage(`No refactoring needed - code is already optimized for ${optimizationGoal}`);
                    return code;
                }

                return refactoredCode;
            }
            throw new Error('Unexpected response format from AI service');
        } catch (error: any) {
            console.error('AI Service error:', error);
            throw error;
        }
    }

    async explainRefactoring(originalCode: string, refactoredCode: string): Promise<string> {
        // TODO: Implement explanation generation
        return "Explanation of refactoring changes will be implemented here.";
    }

    async addComments(code: string): Promise<string> {
        try {
            const prompt = `Add clear, helpful comments to this code. The comments should:
1. Explain what the code does
2. Highlight any important logic or edge cases
3. Use consistent comment style
4. Don't state the obvious
5. Return the code with added comments only

Original code:
${code}`;

            const response = await this.anthropic.messages.create({
                model: 'claude-3-haiku-20240307',
                max_tokens: 1500,
                messages: [{ role: 'user', content: prompt }],
                system: "You are a code documentation expert. Add helpful comments that explain the code's purpose and logic. Don't modify the code itself."
            });

            if (response.content[0].type === 'text') {
                let commentedCode = response.content[0].text;
                commentedCode = commentedCode.replace(/```[\w]*\n/g, '');
                commentedCode = commentedCode.replace(/```\n?/g, '');
                commentedCode = commentedCode.trim();
                return commentedCode;
            }
            throw new Error('Unexpected response format from AI service');
        } catch (error: any) {
            console.error('AI Service error:', error);
            throw error;
        }
    }
} 