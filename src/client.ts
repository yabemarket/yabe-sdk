import { YabeApiError } from "./errors.js";
import type {
  BountyResponse,
  CreateBountyInput,
  ListBountiesParams,
  ListBountiesResponse,
  YabeClientOptions,
} from "./types.js";

const DEFAULT_BASE_URL = "https://api.yabemarket.com";
const MAX_ERROR_MESSAGE_LENGTH = 500;

export class YabeClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImplementation: typeof globalThis.fetch;

  constructor(options: YabeClientOptions) {
    if (!options.apiKey.trim()) throw new TypeError("apiKey is required");
    this.apiKey = options.apiKey.trim();
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.fetchImplementation = options.fetch ?? globalThis.fetch;
    if (!this.fetchImplementation) throw new TypeError("A fetch implementation is required");
  }

  createBounty(input: CreateBountyInput, attachments: File[] = []): Promise<BountyResponse> {
    if (attachments.length === 0) {
      return this.request("/create-bounty", { method: "POST", body: input });
    }

    if ((input.images?.length ?? 0) + attachments.length > 10) {
      throw new TypeError("A bounty can include no more than 10 images.");
    }

    const body = new FormData();
    body.set("bounty", JSON.stringify(input));
    for (const file of attachments) body.append("images", file, file.name);
    return this.request("/create-bounty", { method: "POST", body });
  }

  listBounties(params: ListBountiesParams = {}): Promise<ListBountiesResponse> {
    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    if (params.partner_user_ref) query.set("partner_user_ref", params.partner_user_ref);
    if (params.limit !== undefined) query.set("limit", String(params.limit));
    if (params.offset !== undefined) query.set("offset", String(params.offset));
    const suffix = query.size ? `?${query.toString()}` : "";
    return this.request(`/get-partner-bounties${suffix}`, { method: "GET" });
  }

  cancelBounty(bountyId: string): Promise<BountyResponse> {
    return this.request("/cancel-bounty", {
      method: "POST",
      body: { bounty_id: bountyId },
    });
  }

  private async request<T>(
    path: string,
    request: { method: "GET" | "POST"; body?: unknown },
  ): Promise<T> {
    const headers: Record<string, string> = { Authorization: `Bearer ${this.apiKey}` };
    let body: BodyInit | undefined;
    if (request.body instanceof FormData) {
      body = request.body;
    } else if (request.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(request.body);
    }

    const response = await this.fetchImplementation(`${this.baseUrl}${path}`, {
      method: request.method,
      headers,
      ...(body === undefined ? {} : { body }),
    });

    const payload: unknown = await response.json().catch(() => undefined);
    if (!response.ok) throw toApiError(response.status, payload);
    return payload as T;
  }
}

function toApiError(status: number, payload: unknown): YabeApiError {
  if (typeof payload === "object" && payload !== null) {
    const body = payload as { error?: unknown; code?: unknown; details?: unknown };
    const message = typeof body.error === "string" ? body.error : `Yabe API request failed (${status})`;
    return new YabeApiError(
      message.slice(0, MAX_ERROR_MESSAGE_LENGTH),
      status,
      typeof body.code === "string" ? body.code : undefined,
      body.details,
    );
  }
  return new YabeApiError(`Yabe API request failed (${status})`, status);
}