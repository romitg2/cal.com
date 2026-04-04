import type { IEventTypesRepository } from "@calcom/features/eventtypes/eventtypes.repository.interface";
import type { IUsersRepository } from "@calcom/features/users/users.repository.interface";
import type { PrismaClient } from "@calcom/prisma";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WebhookVersion } from "../interface/i-webhook-repository";
import { WebhookRepository } from "./webhook-repository";

vi.mock("@calcom/prisma", () => ({
  default: {},
  prisma: {},
}));

describe("WebhookRepository", () => {
  let mockPrisma: {
    $queryRaw: ReturnType<typeof vi.fn>;
    webhookScheduledTriggers: {
      create: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
  };
  let mockEventTypeRepo: { findParentEventTypeId: ReturnType<typeof vi.fn> };
  let mockUserRepo: Record<string, ReturnType<typeof vi.fn>>;
  let repository: WebhookRepository;

  beforeEach(() => {
    mockPrisma = {
      $queryRaw: vi.fn(),
      webhookScheduledTriggers: {
        create: vi.fn(),
        deleteMany: vi.fn(),
        delete: vi.fn(),
        findMany: vi.fn(),
      },
    };
    mockEventTypeRepo = {
      findParentEventTypeId: vi.fn().mockResolvedValue(null),
    };
    mockUserRepo = {};
    repository = new WebhookRepository(
      mockPrisma as unknown as PrismaClient,
      mockEventTypeRepo as unknown as IEventTypesRepository,
      mockUserRepo as unknown as IUsersRepository
    );
  });

  describe("getSubscribers", () => {
    it("should validate webhook version through parseWebhookVersion for valid versions", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          id: "webhook-1",
          subscriberUrl: "https://example.com/webhook",
          payloadTemplate: null,
          appId: null,
          secret: "test-secret",
          time: null,
          timeUnit: null,
          eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
          version: WebhookVersion.V_2021_10_20,
          priority: 1,
        },
      ]);

      const result = await repository.getSubscribers({
        userId: 1,
        triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
      });

      expect(result).toHaveLength(1);
      expect(result[0].version).toBe(WebhookVersion.V_2021_10_20);
    });

    it("should throw on invalid webhook version from database", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          id: "webhook-2",
          subscriberUrl: "https://example.com/webhook",
          payloadTemplate: null,
          appId: null,
          secret: null,
          time: null,
          timeUnit: null,
          eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
          version: "invalid-version",
          priority: 1,
        },
      ]);

      await expect(
        repository.getSubscribers({
          userId: 1,
          triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
        })
      ).rejects.toThrow('Invalid webhook version: "invalid-version"');
    });

    it("should validate version for all returned webhooks", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          id: "webhook-1",
          subscriberUrl: "https://example1.com/webhook",
          payloadTemplate: null,
          appId: null,
          secret: null,
          time: null,
          timeUnit: null,
          eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
          version: WebhookVersion.V_2021_10_20,
          priority: 1,
        },
        {
          id: "webhook-2",
          subscriberUrl: "https://example2.com/webhook",
          payloadTemplate: null,
          appId: null,
          secret: null,
          time: null,
          timeUnit: null,
          eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
          version: WebhookVersion.V_2021_10_20,
          priority: 2,
        },
      ]);

      const result = await repository.getSubscribers({
        userId: 1,
        triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
      });

      expect(result).toHaveLength(2);
      expect(result[0].version).toBe(WebhookVersion.V_2021_10_20);
      expect(result[1].version).toBe(WebhookVersion.V_2021_10_20);
    });
  });

  describe("createScheduledTrigger", () => {
    it("should create a scheduled trigger with the correct data", async () => {
      mockPrisma.webhookScheduledTriggers.create.mockResolvedValue({});

      await repository.createScheduledTrigger({
        payload: '{"triggerEvent":"BOOKING_CREATED"}',
        appId: "test-app",
        startAfter: new Date("2025-01-01"),
        subscriberUrl: "https://example.com/webhook",
        webhookId: "webhook-123",
        bookingId: 456,
      });

      expect(mockPrisma.webhookScheduledTriggers.create).toHaveBeenCalledWith({
        data: {
          payload: '{"triggerEvent":"BOOKING_CREATED"}',
          appId: "test-app",
          startAfter: new Date("2025-01-01"),
          subscriberUrl: "https://example.com/webhook",
          webhook: { connect: { id: "webhook-123" } },
          booking: { connect: { id: 456 } },
        },
      });
    });

    it("should create a scheduled trigger with null appId", async () => {
      mockPrisma.webhookScheduledTriggers.create.mockResolvedValue({});

      await repository.createScheduledTrigger({
        payload: '{"triggerEvent":"MEETING_ENDED"}',
        appId: null,
        startAfter: new Date("2025-01-01"),
        subscriberUrl: "https://example.com/webhook",
        webhookId: "webhook-456",
        bookingId: 789,
      });

      expect(mockPrisma.webhookScheduledTriggers.create).toHaveBeenCalledWith({
        data: {
          payload: '{"triggerEvent":"MEETING_ENDED"}',
          appId: null,
          startAfter: new Date("2025-01-01"),
          subscriberUrl: "https://example.com/webhook",
          webhook: { connect: { id: "webhook-456" } },
          booking: { connect: { id: 789 } },
        },
      });
    });
  });

  describe("deleteOldScheduledTriggers", () => {
    it("should delete triggers older than the specified date", async () => {
      mockPrisma.webhookScheduledTriggers.deleteMany.mockResolvedValue({ count: 5 });
      const olderThan = new Date("2025-01-01");

      const result = await repository.deleteOldScheduledTriggers(olderThan);

      expect(mockPrisma.webhookScheduledTriggers.deleteMany).toHaveBeenCalledWith({
        where: { startAfter: { lte: olderThan } },
      });
      expect(result.count).toBe(5);
    });

    it("should return count of 0 when no triggers match", async () => {
      mockPrisma.webhookScheduledTriggers.deleteMany.mockResolvedValue({ count: 0 });
      const olderThan = new Date("2020-01-01");

      const result = await repository.deleteOldScheduledTriggers(olderThan);

      expect(result.count).toBe(0);
    });
  });

  describe("deleteScheduledTriggersByBookingId", () => {
    it("should delete triggers by booking id", async () => {
      mockPrisma.webhookScheduledTriggers.deleteMany.mockResolvedValue({ count: 2 });

      const result = await repository.deleteScheduledTriggersByBookingId(123);

      expect(mockPrisma.webhookScheduledTriggers.deleteMany).toHaveBeenCalledWith({
        where: { bookingId: 123 },
      });
      expect(result.count).toBe(2);
    });

    it("should return count of 0 when booking has no triggers", async () => {
      mockPrisma.webhookScheduledTriggers.deleteMany.mockResolvedValue({ count: 0 });

      const result = await repository.deleteScheduledTriggersByBookingId(999);

      expect(result.count).toBe(0);
    });
  });

  describe("deleteScheduledTriggersByWebhookId", () => {
    it("should delete triggers by webhook id without trigger event filter", async () => {
      mockPrisma.webhookScheduledTriggers.deleteMany.mockResolvedValue({ count: 3 });

      const result = await repository.deleteScheduledTriggersByWebhookId("webhook-123");

      expect(mockPrisma.webhookScheduledTriggers.deleteMany).toHaveBeenCalledWith({
        where: { webhookId: "webhook-123" },
      });
      expect(result.count).toBe(3);
    });

    it("should delete triggers by webhook id with trigger event filter", async () => {
      mockPrisma.webhookScheduledTriggers.deleteMany.mockResolvedValue({ count: 1 });

      const result = await repository.deleteScheduledTriggersByWebhookId(
        "webhook-123",
        WebhookTriggerEvents.BOOKING_CREATED
      );

      expect(mockPrisma.webhookScheduledTriggers.deleteMany).toHaveBeenCalledWith({
        where: {
          webhookId: "webhook-123",
          payload: { contains: '"triggerEvent":"BOOKING_CREATED"' },
        },
      });
      expect(result.count).toBe(1);
    });
  });

  describe("deleteScheduledTriggersByAppIdAndOwner", () => {
    it("should delete triggers by app id and user id", async () => {
      mockPrisma.webhookScheduledTriggers.deleteMany.mockResolvedValue({ count: 4 });

      const result = await repository.deleteScheduledTriggersByAppIdAndOwner({
        appId: "test-app",
        userId: 123,
      });

      expect(mockPrisma.webhookScheduledTriggers.deleteMany).toHaveBeenCalledWith({
        where: {
          appId: "test-app",
          booking: { eventType: { userId: 123 } },
        },
      });
      expect(result.count).toBe(4);
    });

    it("should delete triggers by app id and team id", async () => {
      mockPrisma.webhookScheduledTriggers.deleteMany.mockResolvedValue({ count: 2 });

      const result = await repository.deleteScheduledTriggersByAppIdAndOwner({
        appId: "test-app",
        teamId: 456,
      });

      expect(mockPrisma.webhookScheduledTriggers.deleteMany).toHaveBeenCalledWith({
        where: {
          appId: "test-app",
          booking: { eventType: { teamId: 456 } },
        },
      });
      expect(result.count).toBe(2);
    });

    it("should prioritize userId over teamId when both are provided", async () => {
      mockPrisma.webhookScheduledTriggers.deleteMany.mockResolvedValue({ count: 1 });

      const result = await repository.deleteScheduledTriggersByAppIdAndOwner({
        appId: "test-app",
        userId: 123,
        teamId: 456,
      });

      expect(mockPrisma.webhookScheduledTriggers.deleteMany).toHaveBeenCalledWith({
        where: {
          appId: "test-app",
          booking: { eventType: { userId: 123 } },
        },
      });
      expect(result.count).toBe(1);
    });

    it("should throw error when neither userId nor teamId is provided", async () => {
      await expect(
        repository.deleteScheduledTriggersByAppIdAndOwner({
          appId: "test-app",
        })
      ).rejects.toThrow("Either userId or teamId must be provided");

      expect(mockPrisma.webhookScheduledTriggers.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe("deleteScheduledTriggerById", () => {
    it("should delete a single trigger by id", async () => {
      mockPrisma.webhookScheduledTriggers.delete.mockResolvedValue({});

      await repository.deleteScheduledTriggerById(123);

      expect(mockPrisma.webhookScheduledTriggers.delete).toHaveBeenCalledWith({
        where: { id: 123 },
      });
    });
  });

  describe("findScheduledTriggersReadyToRun", () => {
    it("should find triggers ready to run before specified date", async () => {
      const mockTriggers = [
        {
          id: 1,
          jobName: "job-1",
          payload: '{"triggerEvent":"BOOKING_CREATED"}',
          subscriberUrl: "https://example.com/webhook",
          webhook: { secret: "test-secret", version: "2021-10-20" },
        },
      ];
      mockPrisma.webhookScheduledTriggers.findMany.mockResolvedValue(mockTriggers);
      const beforeDate = new Date("2025-01-01");

      const result = await repository.findScheduledTriggersReadyToRun(beforeDate);

      expect(mockPrisma.webhookScheduledTriggers.findMany).toHaveBeenCalledWith({
        where: { startAfter: { lte: beforeDate } },
        select: {
          id: true,
          jobName: true,
          payload: true,
          subscriberUrl: true,
          webhook: { select: { secret: true, version: true } },
        },
      });
      expect(result).toEqual(mockTriggers);
    });

    it("should return empty array when no triggers are ready", async () => {
      mockPrisma.webhookScheduledTriggers.findMany.mockResolvedValue([]);
      const beforeDate = new Date("2020-01-01");

      const result = await repository.findScheduledTriggersReadyToRun(beforeDate);

      expect(result).toEqual([]);
    });

    it("should handle triggers with null webhook (legacy triggers)", async () => {
      const mockTriggers = [
        {
          id: 1,
          jobName: "legacy-app_webhook-123",
          payload: '{"triggerEvent":"MEETING_ENDED"}',
          subscriberUrl: "https://example.com/webhook",
          webhook: null,
        },
      ];
      mockPrisma.webhookScheduledTriggers.findMany.mockResolvedValue(mockTriggers);
      const beforeDate = new Date("2025-01-01");

      const result = await repository.findScheduledTriggersReadyToRun(beforeDate);

      expect(result).toEqual(mockTriggers);
      expect(result[0].webhook).toBeNull();
    });
  });
});
