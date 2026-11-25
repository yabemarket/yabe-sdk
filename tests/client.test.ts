import { describe, expect, it, vi } from "vitest";
import { YabeApiError, YabeClient } from "../src/index.js";

describe("YabeClient", () => {
  it("creates a bounty with bearer auth and JSON payload", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ bounty: { status: "pending" } }), { status: 201 }),
    );
    const client = new YabeClient({ apiKey: "yabe_live_test", fetch: fetchMock });
    const input = {
      partner_user_ref: "user 1",
      title: "Wanted card",
      card_name: "Player",
      card_maker: "Topps",
      year: 1990,
      bounty_amount: 100,
      description: "Looking for a copy",
    };

    await expect(client.createBounty(input)).resolves.toEqual({ bounty: { status: "pending" } });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.yabemarket.com/create-bounty",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer yabe_live_test",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      }),
    );
  });

  it("sends attached files as multipart without overriding the generated content type", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ bounty: { status: "pending" } }), { status: 201 }),
    );
    const client = new YabeClient({ apiKey: "key", fetch: fetchMock });
    const input = {
      partner_user_ref: "user-2",
      title: "Wanted card",
      card_name: "Player",
      card_maker: "Topps",
      year: 1990,
      bounty_amount: 100,
      description: "Looking for a copy",
    };
    const image = new File(["image bytes"], "front.png", { type: "image/png" });

    await client.createBounty(input, [image]);

    const [, options] = fetchMock.mock.calls[0]!;
    expect(options?.headers).toEqual({ Authorization: "Bearer key" });
    expect(options?.body).toBeInstanceOf(FormData);
    const body = options?.body as FormData;
    expect(body.get("bounty")).toBe(JSON.stringify(input));
    expect(body.getAll("images")).toHaveLength(1);
    expect(body.get("images")).toMatchObject({ name: "front.png", type: "image/png" });
  });

  it("encodes list filters and pagination", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ bounties: [], total: 0, limit: 10, offset: 2 })),
    );
    const client = new YabeClient({ apiKey: "key", baseUrl: "https://example.test/", fetch: fetchMock });

    await client.listBounties({ status: "active", partner_user_ref: "user & one", limit: 10, offset: 2 });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.test/get-partner-bounties?status=active&partner_user_ref=user+%26+one&limit=10&offset=2",
      expect.objectContaining({ method: "GET", headers: { Authorization: "Bearer key" } }),
    );
  });

  it("returns structured errors for unsuccessful responses", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ error: "Invalid request", details: { title: ["Required"] } }), { status: 422 }),
    );
    const client = new YabeClient({ apiKey: "key", fetch: fetchMock });

    await expect(client.cancelBounty("not-a-uuid")).rejects.toMatchObject({
      name: "YabeApiError",
      status: 422,
      message: "Invalid request",
      details: { title: ["Required"] },
    } satisfies Partial<YabeApiError>);
  });

  it("rejects an empty API key", () => {
    expect(() => new YabeClient({ apiKey: " " })).toThrow("apiKey is required");
  });
});