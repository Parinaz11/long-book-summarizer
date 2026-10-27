import { DEMO_MODE } from "../config";
import type { ApiClient } from "./client";
import { demoClient } from "./demo";
import { httpClient } from "./http";

export const api: ApiClient = DEMO_MODE ? demoClient : httpClient;
export type { ApiClient, ExportFormat } from "./client";
