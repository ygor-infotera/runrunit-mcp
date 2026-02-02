import { createEnv } from "@t3-oss/env-core";
import "dotenv/config";
import { z } from "zod";

export const env = createEnv({
  server: {
    RUNRUNIT_APP_KEY: z
      .string()
      .min(1)
      .transform((v) => v.trim()),
    RUNRUNIT_USER_TOKEN: z
      .string()
      .min(1)
      .transform((v) => v.trim()),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
