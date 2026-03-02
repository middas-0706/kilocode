# Enhance Prompt

**Priority:** P3
**Status:** ❌ Not started
**Issue:** [Kilo-Org/kilo#594](https://github.com/Kilo-Org/kilo/issues/594) (private)
**Docs:** [Enhance Prompt — user-facing documentation](../../../../packages/kilo-docs/pages/code-with-ai/features/enhance-prompt.md)

## Summary

The old extension has an "Enhance Prompt" feature: the user types a draft message, clicks the ✨ (sparkle) icon in the chat input toolbar, and the draft is rewritten by an LLM into a clearer, more specific prompt before being sent. The enhanced version replaces the draft in the input box so the user can review, edit further, or send it.

The new extension does not have this feature yet. It needs to be implemented as a webview-side button that calls the CLI backend to perform the rewrite.

## Feature Behaviour (parity target)

1. **Trigger** — A sparkle (✨) icon button in the chat input toolbar, next to the send button.
2. **Input** — The current text in the chat input box. If the input is empty, the button should be disabled / no-op.
3. **Enhancement** — The draft is sent to an LLM with a system prompt that instructs it to rewrite the user's message into a more effective prompt. The system prompt is customisable by the user (see below).
4. **Result** — The enhanced text replaces the draft in the input box. The user can:
   - Review and further edit the enhanced prompt before sending.
   - Send it immediately (Enter or send button).
   - Undo the enhancement (Ctrl+Z / ⌘Z in the textarea should restore the original).
5. **Loading state** — While the enhancement request is in flight, the sparkle icon shows a spinner and the input box is read-only (or a subtle "Enhancing…" overlay appears). The user should be able to cancel.
6. **Customisable template** — The enhancement system prompt is editable in the "Prompts" settings tab (ENHANCE sub-tab). The default template includes a `${userInput}` placeholder that is replaced with the user's draft.
7. **Customisable provider** — Users can assign a dedicated API configuration profile to the enhance feature, allowing them to use a fast/cheap model (e.g. GPT-4.1 Nano) instead of the main session model.

## Architecture

### Where does the rewrite happen?

The CLI currently has **no dedicated enhance-prompt endpoint**. Two approaches:

| Approach                                                                                                                                                              | Pros                                                                                       | Cons                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| **A. CLI-side endpoint** — Add a `POST /session/enhance` (or similar) route that accepts the draft text + an optional template override and returns the enhanced text | Clean separation; reusable by TUI and web UI; template/provider config stays in CLI config | Requires CLI changes; new server route + SDK regeneration                                                                    |
| **B. Extension-side** — The extension opens a lightweight one-shot session (or calls the OpenAI-compatible API directly) with a meta-prompt                           | No CLI changes needed; faster to ship                                                      | Duplicates LLM-calling logic outside the CLI; harder to share the customisable template/provider settings with other clients |

**Recommendation:** Approach A. The CLI already owns provider/model configuration, and adding a one-shot enhancement endpoint keeps the extension thin. The endpoint can be added to `packages/opencode/src/server/routes/experimental.ts` initially and promoted later.

### Extension-side flow

```
User types draft  →  clicks ✨ button
                          ↓
            Webview sends "enhancePrompt" message to extension host
                          ↓
            Extension host calls  POST /session/enhance { text, template? }
                          ↓
            CLI streams / returns enhanced text
                          ↓
            Extension host sends "enhancePromptResult" message to webview
                          ↓
            Webview replaces input box content, restores focus
```

### Message types (webview ↔ extension host)

Add to `webview-ui/src/types/messages.ts`:

```ts
// Webview → Extension
{ type: "enhancePrompt", text: string }

// Extension → Webview
{ type: "enhancePromptResult", text: string }
{ type: "enhancePromptError", error: string }
```

### Webview changes

- **Chat input toolbar** — Add a `<button>` with the codicon `sparkle` icon to the right of the existing toolbar buttons. Disabled when input is empty or an enhancement is already in flight.
- **Loading state** — Replace the sparkle icon with a spinner (`codicon-loading~spin`) while waiting for the result.
- **Cancel** — Pressing Escape or clicking the spinner cancels the in-flight request.

### CLI-side endpoint (approach A)

A minimal endpoint in `experimental.ts` (or a new `enhance.ts` route):

```
POST /session/enhance
Body: { text: string, template?: string, provider?: string, model?: string }
Response: { enhanced: string }
```

- Uses the configured enhancement provider/model (or falls back to the session's default provider).
- Applies the configured enhancement template (or falls back to a built-in default).
- This is a **non-streaming one-shot call** — no session is created.

### Settings integration

The old extension stored the enhancement template and provider in its settings. In the new architecture:

- **Template** — Stored in CLI config under a key like `enhance.template`. Exposed in the extension's Settings UI → Prompts → ENHANCE tab. The default template should instruct the model to rewrite `${userInput}` into a clearer, more specific, and more actionable prompt without changing the user's intent.
- **Provider** — Stored in CLI config (e.g. `enhance.provider` / `enhance.model`). Exposed in Settings UI → Prompts → ENHANCE tab with a provider/model dropdown.

## Remaining Work

### CLI

- [ ] Add enhancement config schema (`enhance.template`, `enhance.provider`, `enhance.model`) to `config.ts`
- [ ] Implement `POST /session/enhance` in server routes
- [ ] Regenerate SDK (`./script/generate.ts`)

### Extension host

- [ ] Add `enhancePrompt` / `enhancePromptResult` / `enhancePromptError` message types
- [ ] Handle `enhancePrompt` message: call CLI endpoint, return result or error
- [ ] Add cancellation support (AbortController)

### Webview

- [ ] Add sparkle button to chat input toolbar
- [ ] Wire button to send `enhancePrompt` message with current input text
- [ ] Handle `enhancePromptResult`: replace input text, restore cursor/focus
- [ ] Handle `enhancePromptError`: show inline toast or notification
- [ ] Loading/spinner state while enhancement is in flight
- [ ] Disable button when input is empty

### Settings UI

- [ ] Add ENHANCE sub-tab under Prompts tab in Settings view
- [ ] Template text field with `${userInput}` placeholder
- [ ] Provider/model dropdown (reuse existing provider selector component)

### Testing

- [ ] Extension host: test message routing for enhance flow
- [ ] Webview: test button state transitions (empty → has text → loading → result)
- [ ] CLI: test enhance endpoint with default and custom templates

## Design Notes

- The feature should feel instant for short prompts — consider showing partial results if the CLI supports streaming in the future.
- The undo behaviour (Ctrl+Z restoring the original draft) comes for free if the replacement is done via the browser's `execCommand('insertText')` or by pushing to the textarea's undo stack. Solid.js signal-based replacement may bypass the native undo stack — test this and provide a manual undo path if needed (e.g. store the original draft and restore it on a second sparkle click or a dedicated "undo" button that appears after enhancement).
- Keep the feature optional and low-friction: users who never click the button should not notice any impact.
