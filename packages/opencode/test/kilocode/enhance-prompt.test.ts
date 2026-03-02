import { describe, it, expect } from "bun:test"
import { clean, buildMessages } from "../../src/kilocode/enhance-prompt"

describe("enhance-prompt", () => {
  describe("clean", () => {
    it("trims whitespace", () => {
      expect(clean("  hello world  ")).toBe("hello world")
    })

    it("strips code block markers", () => {
      expect(clean("```\nhello world\n```")).toBe("hello world")
    })

    it("strips code block with language tag", () => {
      expect(clean("```text\nhello world\n```")).toBe("hello world")
    })

    it("strips surrounding double quotes", () => {
      expect(clean('"hello world"')).toBe("hello world")
    })

    it("strips surrounding single quotes", () => {
      expect(clean("'hello world'")).toBe("hello world")
    })

    it("strips code blocks and quotes together", () => {
      expect(clean('```\n"hello world"\n```')).toBe("hello world")
    })

    it("returns plain text unchanged", () => {
      expect(clean("hello world")).toBe("hello world")
    })

    it("handles empty string", () => {
      expect(clean("")).toBe("")
    })

    it("handles whitespace-only string", () => {
      expect(clean("   ")).toBe("")
    })

    it("does not strip internal quotes", () => {
      expect(clean('say "hello" to the world')).toBe('say "hello" to the world')
    })

    it("does not strip mismatched quotes", () => {
      expect(clean("\"hello world'")).toBe("\"hello world'")
    })
  })

  describe("buildMessages", () => {
    it("uses default template with ${userInput} placeholder", () => {
      const messages = buildMessages("fix the bug")
      expect(messages).toHaveLength(1)
      expect(messages[0].role).toBe("user")
      expect(messages[0].content).toContain("fix the bug")
      expect(messages[0].content).toContain("enhanced version")
      expect(messages[0].content).not.toContain("${userInput}")
    })

    it("uses custom template when provided", () => {
      const template = "Rewrite this: ${userInput}"
      const messages = buildMessages("fix the bug", template)
      expect(messages[0].content).toBe("Rewrite this: fix the bug")
    })

    it("handles multi-line input", () => {
      const messages = buildMessages("line 1\nline 2\nline 3")
      expect(messages[0].content).toContain("line 1\nline 2\nline 3")
    })
  })
})
