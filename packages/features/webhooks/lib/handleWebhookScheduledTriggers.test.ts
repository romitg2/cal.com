import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { DEFAULT_WEBHOOK_VERSION } from "./interface/webhook-repository";
import type { IWebhookRepository } from "./interface/webhook-repository";

const mockRepository: Pick<
  IWebhookRepository,
  "deleteOldScheduledTriggers" | "findScheduledTriggersReadyToRun" | "deleteScheduledTriggerById"
> = {
  deleteOldScheduledTriggers: vi.fn(),
  findScheduledTriggersReadyToRun: vi.fn(),
  deleteScheduledTriggerById: vi.fn(),
};

const mockPrismaWebhookFindUniqueOrThrow = vi.fn();

vi.mock("@calcom/features/di/webhooks/containers/webhook", () => ({
  getWebhookFeature: () => ({
    repository: mockRepository,
  }),
}));

vi.mock("@calcom/prisma", () => ({
  prisma: {
    webhook: {
      findUniqueOrThrow: mockPrismaWebhookFindUniqueOrThrow,
    },
  },
}));

// Import after mocks are set up
const { handleWebhookScheduledTriggers } = await import("./handleWebhookScheduledTriggers");

describe("handleWebhookScheduledTriggers - X-Cal-Webhook-Version header", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
    });
    vi.mocked(mockRepository.deleteOldScheduledTriggers).mockResolvedValue({ count: 0 });
    vi.mocked(mockRepository.deleteScheduledTriggerById).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("should include X-Cal-Webhook-Version header with webhook version from database", async () => {
    const webhookVersion = "2021-10-20";
    vi.mocked(mockRepository.findScheduledTriggersReadyToRun).mockResolvedValue([
      {
        id: 1,
        jobName: null,
        subscriberUrl: "https://example.com/webhook",
        payload: JSON.stringify({ triggerEvent: "MEETING_ENDED" }),
        webhook: {
          secret: "test-secret",
          version: webhookVersion,
        },
      },
    ]);

    await handleWebhookScheduledTriggers();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];

    expect(url).toBe("https://example.com/webhook");
    expect(options.headers).toHaveProperty("X-Cal-Webhook-Version", webhookVersion);
    expect(options.headers).toHaveProperty("X-Cal-Signature-256");
  });

  it("should use DEFAULT_WEBHOOK_VERSION when webhook has no version", async () => {
    vi.mocked(mockRepository.findScheduledTriggersReadyToRun).mockResolvedValue([
      {
        id: 1,
        jobName: null,
        subscriberUrl: "https://example.com/webhook",
        payload: JSON.stringify({ triggerEvent: "MEETING_STARTED" }),
        webhook: {
          secret: "test-secret",
          version: null as unknown as string,
        },
      },
    ]);

    await handleWebhookScheduledTriggers();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, options] = mockFetch.mock.calls[0];

    expect(options.headers).toHaveProperty("X-Cal-Webhook-Version", DEFAULT_WEBHOOK_VERSION);
  });

  it("should use DEFAULT_WEBHOOK_VERSION when webhook relationship is null", async () => {
    vi.mocked(mockRepository.findScheduledTriggersReadyToRun).mockResolvedValue([
      {
        id: 1,
        jobName: null,
        subscriberUrl: "https://example.com/webhook",
        payload: JSON.stringify({ triggerEvent: "MEETING_STARTED" }),
        webhook: null,
      },
    ]);

    await handleWebhookScheduledTriggers();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, options] = mockFetch.mock.calls[0];

    expect(options.headers).toHaveProperty("X-Cal-Webhook-Version", DEFAULT_WEBHOOK_VERSION);
  });

  it("should fetch webhook version from database for legacy jobs using jobName", async () => {
    const webhookVersion = "2021-10-20";
    vi.mocked(mockRepository.findScheduledTriggersReadyToRun).mockResolvedValue([
      {
        id: 1,
        jobName: "appId_webhookId123",
        subscriberUrl: "https://example.com/webhook",
        payload: JSON.stringify({ triggerEvent: "MEETING_ENDED" }),
        webhook: null,
      },
    ]);

    mockPrismaWebhookFindUniqueOrThrow.mockResolvedValue({
      secret: "fetched-secret",
      version: webhookVersion,
    });

    await handleWebhookScheduledTriggers();

    expect(mockPrismaWebhookFindUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: "webhookId123", appId: "appId" },
      select: { secret: true, version: true },
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, options] = mockFetch.mock.calls[0];

    expect(options.headers).toHaveProperty("X-Cal-Webhook-Version", webhookVersion);
  });
});
