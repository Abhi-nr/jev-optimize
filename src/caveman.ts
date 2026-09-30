import { execa } from "execa";
import type { AppConfig } from "./config.js";
import type {
  CompressContentInput,
  CompressContentOutput,
} from "./types.js";

export class CavemanEngine {
  private config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;
  }

  async compress(
    input: CompressContentInput
  ): Promise<CompressContentOutput> {
    const originalLength = input.text.length;

    if (!this.config.cavemanCliPath) {
      // Simple built-in caveman-like compression
      const compressedText =
        this.simpleCavemanCompress(input);
      const compressedLength = compressedText.length;
      return {
        original_length: originalLength,
        compressed_length: compressedLength,
        compression_ratio:
          originalLength === 0
            ? 0
            : 1 - compressedLength / originalLength,
        compressed_text: compressedText,
        compression_applied: true,
      };
    }

    try {
      const { stdout } = await execa(
        this.config.cavemanCliPath,
        [
          "compress",
          "--mode",
          input.mode,
          input.preserve_code ? "--preserve-code" : "",
        ],
        {
          input: input.text,
          timeout: 3000,
          maxBuffer: 10 * 1024 * 1024,
        }
      );

      const compressedLength = stdout.length;
      return {
        original_length: originalLength,
        compressed_length: compressedLength,
        compression_ratio:
          originalLength === 0
            ? 0
            : 1 - compressedLength / originalLength,
        compressed_text: stdout,
        compression_applied: true,
        handle: `cmp_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 8)}`,
      };
    } catch {
      // Fallback: return original
      return {
        original_length: originalLength,
        compressed_length: originalLength,
        compression_ratio: 0,
        compressed_text: input.text,
        compression_applied: false,
      };
    }
  }

  private simpleCavemanCompress(
    input: CompressContentInput
  ): string {
    let text = input.text;

    // Very basic rules; replace with real Caveman logic if desired
    text = text.replace(/\bactually\b/gi, "");
    text = text.replace(/\bbasically\b/gi, "");
    text = text.replace(/\bin order to\b/gi, "to");
    text = text.replace(/\bdue to the fact that\b/gi, "because");
    text = text.replace(
      /\bit is important to note that\b/gi,
      ""
    );

    if (input.mode === "ultra") {
      text = text
        .split("\n")
        .filter((l) => l.trim().length > 0)
        .slice(0, 40)
        .join("\n");
    } else if (input.mode === "full") {
      text = text
        .split("\n")
        .filter((l) => l.trim().length > 0)
        .slice(0, 80)
        .join("\n");
    }

    return text.trim();
  }
}