import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Frontend-facing equivalent of the future `POST /investigate` endpoint.
 * Accepts only the engine fact sheet; the API key stays on the server.
 */
export const investigateReport = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ facts: z.string().min(2).max(40_000) }).parse(d))
  .handler(async ({ data }) => {
    const { generateReport } = await import("./report.server");
    return generateReport(data.facts);
  });
