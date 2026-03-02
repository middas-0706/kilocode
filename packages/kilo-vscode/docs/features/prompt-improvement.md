# Enhance Prompt

**Priority:** P3
**Status:** 🔨 Partial
**Issue:** [Kilo-Org/kilo#594](https://github.com/Kilo-Org/kilo/issues/594) (private)
**Docs:** [Enhance Prompt — user-facing documentation](../../../../packages/kilo-docs/pages/code-with-ai/features/enhance-prompt.md)

## Summary

The old extension has an "Enhance Prompt" feature: the user types a draft message, clicks the ✨ (sparkle) icon in the chat input toolbar, and the draft is rewritten by an LLM into a clearer, more specific prompt before being sent. The enhanced version replaces the draft in the input box so the user can review, edit further, or send it.

## What's Implemented

### CLI
- `POST /enhance-prompt` endpoint at [`packages/opencode/src/server/routes/enhance-prompt.ts`](../../packages/opencode/src/server/routes/enhance-prompt.ts)
- One-shot LLM call using the small model in [`packages/opencode/src/kilocode/enhance-prompt.ts`](../../packages/opencode/src/kilocode/enhance-prompt.ts)
- Default template matches the legacy extension: "Generate an enhanced version of this prompt (reply with only the enhanced prompt - no conversation, explanations, lead-in, bullet points, placeholders, or surrounding quotes):\n\n${userInput}"
- SDK regenerated with `EnhancePrompt` class

### Extension host
- `HttpClient.enhancePrompt()` method
- `KiloProvider` handles `enhancePrompt` webview message → calls CLI → sends `enhancePromptResult` or `enhancePromptError` back

### Webview
- ✨ sparkle button in chat input toolbar (before send button)
- Sparkle icon spins while enhancement is in flight (CSS `animate-spin`, matching legacy `WandSparkles` behaviour)
- Enhanced text replaces the draft; focus is restored to textarea
- Error handling: `enhancing` state cleared on error
- **Empty input**: clicking ✨ with no text shows a description message explaining the feature (matching legacy)
- **Undo**: Ctrl+Z / ⌘Z immediately after enhancement restores the original draft. Cleared on any manual edit.
- All 16 i18n locales have `prompt.action.enhance` and `prompt.action.enhanceDescription` keys

### Message types
- `EnhancePromptRequest` (webview → extension): `{ type: "enhancePrompt", text, requestId }`
- `EnhancePromptResultMessage` (extension → webview): `{ type: "enhancePromptResult", text, requestId }`
- `EnhancePromptErrorMessage` (extension → webview): `{ type: "enhancePromptError", error, requestId }`

## Remaining Work

- [ ] Cancellation support (Escape to abort in-flight enhance request via AbortController)
- [ ] Customisable template editing in Settings UI (ENHANCE sub-tab) — deferred
- [ ] Customisable provider/model for enhancement — deferred
- [ ] Integration tests

## Architecture

### Flow

```
User types draft  →  clicks ✨ button
                          ↓
            Webview sends "enhancePrompt" message to extension host
                          ↓
            Extension host calls  POST /enhance-prompt { text, template? }
                          ↓
            CLI makes one-shot LLM call (small model)
                          ↓
            Extension host sends "enhancePromptResult" message to webview
                          ↓
            Webview replaces input box content, restores focus
            preEnhanceText stored for Ctrl+Z undo
```

## Design Notes

- The feature uses the small model for speed/cost (same pattern as commit message generation)
- Undo is implemented via a manual `preEnhanceText` variable since Solid.js signal-based text replacement bypasses the native textarea undo stack
- `preEnhanceText` is cleared on any manual input so Ctrl+Z doesn't interfere with normal editing after the user has modified the enhanced text
- The button is always enabled (even with empty input) — clicking with empty text shows the help description, matching the legacy extension
