Execute git commit with intelligent staging behavior.

Steps:
1. Run `git status` to check current state
2. Determine staging strategy:
   - If there are staged changes → Only commit those staged files
   - If NO staged changes → Stage ALL modified files using `git add -u` and commit everything
3. Generate commit message:
   - If you have context from current work session → Use that context to write the message
   - If no context → Read the changed files to understand what changed
   - Use conventional commit format (feat/fix/refactor/docs/chore/etc.)
   - Include clear, descriptive summary and details
   - Always end with:
     ```
     🤖 Generated with [Claude Code](https://claude.com/claude-code)

     Co-Authored-By: Claude <noreply@anthropic.com>
     ```
   - Use heredoc format for the commit message
4. Execute the commit directly (DO NOT ask for approval)
5. Run `git status` after commit to verify
6. Report to user what was committed with the commit message

Important:
- DO commit directly without asking for approval
- After committing, clearly show the user the commit message that was used
