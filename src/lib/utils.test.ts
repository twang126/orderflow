import { describe, it, expect } from "vitest"
import { cn, formatTime, formatDuration } from "./utils"

describe("cn (className merge utility)", () => {
  it("should merge class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar")
  })

  it("should handle conditional classes", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz")
    expect(cn("foo", true && "bar", "baz")).toBe("foo bar baz")
  })

  it("should merge tailwind classes correctly", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4")
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500")
  })

  it("should handle arrays", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar")
  })

  it("should handle undefined and null", () => {
    expect(cn("foo", undefined, null, "bar")).toBe("foo bar")
  })

  it("should handle empty strings", () => {
    expect(cn("foo", "", "bar")).toBe("foo bar")
  })
})

describe("formatTime", () => {
  it("should format Date object to time string", () => {
    const date = new Date("2024-01-15T14:30:00")
    const result = formatTime(date)
    // Result should be in format like "2:30 PM"
    expect(result).toMatch(/^\d{1,2}:\d{2}\s?(AM|PM)$/i)
  })

  it("should format ISO string to time string", () => {
    const result = formatTime("2024-01-15T09:00:00")
    expect(result).toMatch(/^\d{1,2}:\d{2}\s?(AM|PM)$/i)
  })

  it("should handle midnight", () => {
    const date = new Date("2024-01-15T00:00:00")
    const result = formatTime(date)
    expect(result).toMatch(/12:00\s?AM/i)
  })

  it("should handle noon", () => {
    const date = new Date("2024-01-15T12:00:00")
    const result = formatTime(date)
    expect(result).toMatch(/12:00\s?PM/i)
  })
})

describe("formatDuration", () => {
  describe("seconds only", () => {
    it("should format 0 milliseconds as 0s", () => {
      expect(formatDuration(0)).toBe("0s")
    })

    it("should format less than a second", () => {
      expect(formatDuration(500)).toBe("0s")
      expect(formatDuration(999)).toBe("0s")
    })

    it("should format exact seconds", () => {
      expect(formatDuration(1000)).toBe("1s")
      expect(formatDuration(30000)).toBe("30s")
      expect(formatDuration(59000)).toBe("59s")
    })
  })

  describe("minutes and seconds", () => {
    it("should format exactly one minute", () => {
      expect(formatDuration(60000)).toBe("1m 0s")
    })

    it("should format minutes with seconds", () => {
      expect(formatDuration(90000)).toBe("1m 30s")
      expect(formatDuration(125000)).toBe("2m 5s")
    })

    it("should format multiple minutes", () => {
      expect(formatDuration(300000)).toBe("5m 0s") // 5 minutes
      expect(formatDuration(330000)).toBe("5m 30s") // 5.5 minutes
    })
  })

  describe("edge cases", () => {
    it("should handle very small durations", () => {
      expect(formatDuration(1)).toBe("0s")
      expect(formatDuration(100)).toBe("0s")
    })

    it("should handle large durations", () => {
      expect(formatDuration(3600000)).toBe("60m 0s") // 1 hour
      expect(formatDuration(7200000)).toBe("120m 0s") // 2 hours
    })

    it("should floor partial seconds", () => {
      expect(formatDuration(1500)).toBe("1s")
      expect(formatDuration(61500)).toBe("1m 1s")
    })
  })

  describe("real-world scenarios", () => {
    it("should format typical prep times", () => {
      // 2 minutes 15 seconds
      expect(formatDuration(135000)).toBe("2m 15s")

      // 4 minutes 30 seconds
      expect(formatDuration(270000)).toBe("4m 30s")
    })

    it("should format typical wait times", () => {
      // 45 seconds
      expect(formatDuration(45000)).toBe("45s")

      // 1 minute 20 seconds
      expect(formatDuration(80000)).toBe("1m 20s")
    })
  })

  describe("regression tests for bug fix", () => {
    it("should correctly format milliseconds (not minutes)", () => {
      // This was the bug: avgPrepTime was divided by 60000 before passing to formatDuration
      // So 5 minutes (300000ms) became 5, which formatDuration treated as 5ms = 0s

      const fiveMinutesMs = 5 * 60 * 1000 // 300000ms
      expect(formatDuration(fiveMinutesMs)).toBe("5m 0s")

      // NOT this (which was the bug):
      const buggyInput = fiveMinutesMs / 60000 // 5
      expect(formatDuration(buggyInput)).toBe("0s") // This is wrong for 5 minutes!
    })

    it("should handle 0 correctly (no NaN or undefined)", () => {
      expect(formatDuration(0)).toBe("0s")
      expect(formatDuration(0)).not.toBe("NaN")
      expect(formatDuration(0)).not.toBe("undefined")
    })
  })
})
