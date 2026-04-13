import createClient from "openapi-fetch";
import type { paths } from "./gen/api.d.ts";

export const apiClient = createClient<paths>({ baseUrl: "/" });

export type BlockSummary = NonNullable<
  paths["/api/blocks"]["get"]["responses"]["200"]["content"]["application/json"]
>[number];

export type Block = NonNullable<
  paths["/api/blocks/current"]["get"]["responses"]["200"]["content"]["application/json"]
>;
export type DayEntry = NonNullable<
  paths["/api/days"]["post"]["responses"]["201"]["content"]["application/json"]
>;
export type ShoppingItem = NonNullable<
  paths["/api/shopping"]["post"]["responses"]["201"]["content"]["application/json"]
>;
