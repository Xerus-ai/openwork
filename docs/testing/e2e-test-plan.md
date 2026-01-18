# End-to-End Test Plan

## Overview

This document outlines the end-to-end testing scenarios for Claude Cowork Windows, validating that all integrated components work correctly together.

## Prerequisites

- Node.js 20.19+ or 22.12+
- `npm run build` completes successfully
- ANTHROPIC_API_KEY environment variable set (for agent tests)
- Test workspace directory with write permissions

## Test Environment Setup

```bash
# 1. Build all components
npm run build

# 2. Start development server
npm run dev

# 3. In another terminal, start electron
npm run electron:dev
```

---

## Test Scenarios

### 1. Application Startup

**Objective**: Verify the application starts correctly and shows the main UI.

**Steps**:
1. Run `npm run electron:dev`
2. Wait for the Electron window to appear

**Expected Results**:
- [ ] Electron window opens
- [ ] Three-pane layout visible (Chat, Execution, State)
- [ ] Model selector shows default model (Sonnet 4.5)
- [ ] Workspace selector is visible and functional
- [ ] Quick action tiles display in empty chat

**Status**: Not tested

---

### 2. Workspace Selection

**Objective**: Verify workspace folder selection and persistence.

**Steps**:
1. Click the workspace folder selector
2. Browse to a valid directory
3. Select and confirm
4. Close and reopen the app

**Expected Results**:
- [ ] Folder browser dialog opens
- [ ] Selected path appears in the selector
- [ ] File tree updates to show workspace contents
- [ ] Workspace persists after app restart

**Status**: Not tested

---

### 3. Basic Chat Interaction

**Objective**: Verify basic chat functionality with the agent.

**Steps**:
1. Select a workspace folder
2. Type a simple message: "Hello, can you hear me?"
3. Press Enter or click Send

**Expected Results**:
- [ ] User message appears in chat
- [ ] Typing indicator shows while waiting
- [ ] Agent response appears
- [ ] Chat history scrolls appropriately

**Status**: Not tested

---

### 4. File Creation Workflow

**Objective**: Verify the agent can create files in the workspace.

**Steps**:
1. Select a workspace folder
2. Send: "Create a file called test.txt with the content 'Hello World'"
3. Wait for agent response

**Expected Results**:
- [ ] Agent acknowledges the request
- [ ] File operation shows in ExecutionPane
- [ ] File appears in workspace file tree
- [ ] Artifact appears in StatePane artifacts section
- [ ] Download button works for the artifact

**Status**: Not tested

---

### 5. File Reading Workflow

**Objective**: Verify the agent can read files from the workspace.

**Steps**:
1. Create a file manually in the workspace (or use file from previous test)
2. Send: "Read the contents of test.txt"
3. Wait for agent response

**Expected Results**:
- [ ] Agent reads the file successfully
- [ ] File contents shown in response
- [ ] Read operation logged in ExecutionPane

**Status**: Not tested

---

### 6. File Editing Workflow

**Objective**: Verify the agent can edit existing files.

**Steps**:
1. Use existing test.txt from previous tests
2. Send: "Change 'Hello World' to 'Hello Universe' in test.txt"
3. Wait for agent response

**Expected Results**:
- [ ] Agent confirms the edit
- [ ] str_replace operation shows in ExecutionPane
- [ ] File contents actually changed (verify by reading)

**Status**: Not tested

---

### 7. TodoList Progress Visualization

**Objective**: Verify TodoList operations show in StatePane.

**Steps**:
1. Send: "Create a todo list with 3 items: 1) Write code, 2) Test code, 3) Deploy code"
2. Wait for agent to create tasks

**Expected Results**:
- [ ] Progress section in StatePane shows todos
- [ ] Each todo item visible with status
- [ ] Progress indicator updates appropriately

**Status**: Not tested

---

### 8. AskUserQuestion Interaction

**Objective**: Verify the question UI appears and works correctly.

**Steps**:
1. Send a request that requires clarification
2. Example: "Create a document" (without specifying type)

**Expected Results**:
- [ ] Question UI appears in chat
- [ ] Multiple choice options displayed
- [ ] Selecting an option continues the workflow
- [ ] Agent proceeds with the selected choice

**Status**: Not tested

---

### 9. File Attachment Upload

**Objective**: Verify file attachments can be sent to the agent.

**Steps**:
1. Click the attachment button in the chat input
2. Select a text file from the system
3. Send a message referencing the attachment

**Expected Results**:
- [ ] File selector dialog opens
- [ ] Selected file shows as attachment preview
- [ ] Agent receives and processes the file content
- [ ] Agent response references the file content

**Status**: Not tested

---

### 10. Skills Context Loading

**Objective**: Verify skills are loaded based on request context.

**Steps**:
1. Send a document-related request
2. Example: "Help me create a Word document"

**Expected Results**:
- [ ] Skill loading indicator appears in StatePane context section
- [ ] Appropriate skill (docx) loads
- [ ] Agent has skill-specific knowledge in response

**Status**: Not tested

---

### 11. Model Selection

**Objective**: Verify switching between AI models.

**Steps**:
1. Check current model in selector
2. Switch to Opus 4.5
3. Send a message
4. Verify response comes from selected model

**Expected Results**:
- [ ] Model selector dropdown works
- [ ] Selected model persists
- [ ] Responses come from the correct model

**Status**: Not tested

---

### 12. Error Handling - Invalid Workspace

**Objective**: Verify graceful handling of invalid workspace paths.

**Steps**:
1. Try to select a non-existent or read-only folder
2. Observe error handling

**Expected Results**:
- [ ] Error message displayed to user
- [ ] App remains stable
- [ ] User can select a different folder

**Status**: Not tested

---

### 13. Error Handling - API Key Missing

**Objective**: Verify behavior when ANTHROPIC_API_KEY is not set.

**Steps**:
1. Unset ANTHROPIC_API_KEY environment variable
2. Start the app
3. Try to send a message

**Expected Results**:
- [ ] Clear error message about missing API key
- [ ] Instructions on how to set the key
- [ ] App handles this gracefully

**Status**: Not tested

---

### 14. Error Handling - Network Issues

**Objective**: Verify behavior during network problems.

**Steps**:
1. Disconnect from network
2. Send a message
3. Reconnect and retry

**Expected Results**:
- [ ] Error message indicates network issue
- [ ] No crash or hang
- [ ] Retry works after reconnecting

**Status**: Not tested

---

### 15. Shell Command Execution (Windows)

**Objective**: Verify PowerShell/cmd commands work on Windows.

**Steps**:
1. Send: "Run 'echo Hello from PowerShell' in the terminal"
2. Wait for execution

**Expected Results**:
- [ ] Command executes via PowerShell
- [ ] Output shows in ExecutionPane
- [ ] Agent reports success

**Status**: Not tested

---

## Test Results Summary

| Test | Status | Notes |
|------|--------|-------|
| 1. Application Startup | Not tested | |
| 2. Workspace Selection | Not tested | |
| 3. Basic Chat Interaction | Not tested | |
| 4. File Creation Workflow | Not tested | |
| 5. File Reading Workflow | Not tested | |
| 6. File Editing Workflow | Not tested | |
| 7. TodoList Progress Visualization | Not tested | |
| 8. AskUserQuestion Interaction | Not tested | |
| 9. File Attachment Upload | Not tested | |
| 10. Skills Context Loading | Not tested | |
| 11. Model Selection | Not tested | |
| 12. Error Handling - Invalid Workspace | Not tested | |
| 13. Error Handling - API Key Missing | Not tested | |
| 14. Error Handling - Network Issues | Not tested | |
| 15. Shell Command Execution | Not tested | |

---

## Known Issues

(To be filled in during testing)

---

## Environment Notes

- **OS**: Windows
- **Node Version**: 22.9.0
- **Build Status**: Passing
- **Date**: 2026-01-18
