import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma, mockBuildCredentialPayload } = vi.hoisted(() => ({
  mockPrisma: {
    destinationCalendar: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
  mockBuildCredentialPayload: vi.fn().mockReturnValue({}),
}));

vi.mock("@calcom/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@calcom/lib/server/buildCredentialPayloadForCalendar", () => ({
  buildCredentialPayloadForPrisma: mockBuildCredentialPayload,
}));

vi.mock("@calcom/app-store/delegationCredential", () => ({
  enrichHostsWithDelegationCredentials: vi.fn(),
  getUsersCredentialsIncludeServiceAccountKey: vi.fn(),
  getCredentialForSelectedCalendar: vi.fn(),
}));

import { DestinationCalendarRepository } from "./destination-calendar-repository";

describe("DestinationCalendarRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("instance methods", () => {
    describe("fn: getCustomReminderByCredentialId", () => {
      it("should return custom reminder value when found", async () => {
        mockPrisma.destinationCalendar.findFirst.mockResolvedValue({
          customCalendarReminder: 15,
        });

        const repo = new DestinationCalendarRepository(mockPrisma as never);
        const result = await repo.getCustomReminderByCredentialId(1);

        expect(result).toBe(15);
        expect(mockPrisma.destinationCalendar.findFirst).toHaveBeenCalledWith({
          where: { credentialId: 1 },
          select: { customCalendarReminder: true },
        });
      });

      it("should return null when no destination calendar found", async () => {
        mockPrisma.destinationCalendar.findFirst.mockResolvedValue(null);

        const repo = new DestinationCalendarRepository(mockPrisma as never);
        const result = await repo.getCustomReminderByCredentialId(999);

        expect(result).toBeNull();
      });

      it("should return null when customCalendarReminder is null", async () => {
        mockPrisma.destinationCalendar.findFirst.mockResolvedValue({
          customCalendarReminder: null,
        });

        const repo = new DestinationCalendarRepository(mockPrisma as never);
        const result = await repo.getCustomReminderByCredentialId(1);

        expect(result).toBeNull();
      });
    });

    describe("fn: updateCustomReminder", () => {
      it("should update custom reminder for given user and credential", async () => {
        mockPrisma.destinationCalendar.updateMany.mockResolvedValue({ count: 1 });

        const repo = new DestinationCalendarRepository(mockPrisma as never);
        const result = await repo.updateCustomReminder({
          userId: 1,
          credentialId: 2,
          integration: "google_calendar",
          customCalendarReminder: 30,
        });

        expect(result).toEqual({ count: 1 });
        expect(mockPrisma.destinationCalendar.updateMany).toHaveBeenCalledWith({
          where: { userId: 1, credentialId: 2, integration: "google_calendar" },
          data: { customCalendarReminder: 30 },
        });
      });

      it("should set custom reminder to null", async () => {
        mockPrisma.destinationCalendar.updateMany.mockResolvedValue({ count: 1 });

        const repo = new DestinationCalendarRepository(mockPrisma as never);
        await repo.updateCustomReminder({
          userId: 1,
          credentialId: 2,
          integration: "google_calendar",
          customCalendarReminder: null,
        });

        expect(mockPrisma.destinationCalendar.updateMany).toHaveBeenCalledWith(
          expect.objectContaining({
            data: { customCalendarReminder: null },
          })
        );
      });
    });

    describe("fn: upsert", () => {
      it("should upsert with credential payload for both create and update", async () => {
        mockBuildCredentialPayload
          .mockReturnValueOnce({ credentialId: 5 })
          .mockReturnValueOnce({ credentialId: 5 });
        mockPrisma.destinationCalendar.upsert.mockResolvedValue({ id: 1 });

        const repo = new DestinationCalendarRepository(mockPrisma as never);
        await repo.upsert({
          where: { id: 1 },
          update: {
            integration: "google_calendar",
            externalId: "updated-cal",
            credentialId: 5,
          },
          create: {
            integration: "google_calendar",
            externalId: "new-cal",
            credentialId: 5,
          },
        });

        expect(mockBuildCredentialPayload).toHaveBeenCalledTimes(2);
        expect(mockPrisma.destinationCalendar.upsert).toHaveBeenCalledWith({
          where: { id: 1 },
          update: expect.objectContaining({ integration: "google_calendar", externalId: "updated-cal" }),
          create: expect.objectContaining({ integration: "google_calendar", externalId: "new-cal" }),
        });
      });

      it("should handle delegation credential in upsert", async () => {
        mockBuildCredentialPayload
          .mockReturnValueOnce({ delegationCredentialId: "del-123" })
          .mockReturnValueOnce({ delegationCredentialId: "del-123" });
        mockPrisma.destinationCalendar.upsert.mockResolvedValue({ id: 2 });

        const repo = new DestinationCalendarRepository(mockPrisma as never);
        await repo.upsert({
          where: { id: 2 },
          update: {
            integration: "google_calendar",
            externalId: "cal-1",
            credentialId: null,
            delegationCredentialId: "del-123",
          },
          create: {
            integration: "google_calendar",
            externalId: "cal-1",
            credentialId: null,
            delegationCredentialId: "del-123",
          },
        });

        expect(mockBuildCredentialPayload).toHaveBeenNthCalledWith(1, {
          credentialId: null,
          delegationCredentialId: "del-123",
        });
        expect(mockBuildCredentialPayload).toHaveBeenNthCalledWith(2, {
          credentialId: null,
          delegationCredentialId: "del-123",
        });
      });
    });
  });

  describe("additional instance methods", () => {
    describe("fn: create", () => {
      it("should create a destination calendar", async () => {
        const data = {
          integration: "google_calendar",
          externalId: "cal-123",
        };
        mockPrisma.destinationCalendar.create.mockResolvedValue({ id: 1, ...data });

        const repo = new DestinationCalendarRepository(mockPrisma as never);
        const result = await repo.create(data as never);

        expect(result).toEqual({ id: 1, ...data });
        expect(mockPrisma.destinationCalendar.create).toHaveBeenCalledWith({ data });
      });
    });

    describe("fn: getByUserId", () => {
      it("should find destination calendar by userId", async () => {
        const cal = { id: 1, userId: 5, integration: "google_calendar" };
        mockPrisma.destinationCalendar.findFirst.mockResolvedValue(cal);

        const repo = new DestinationCalendarRepository(mockPrisma as never);
        const result = await repo.getByUserId(5);

        expect(result).toEqual(cal);
        expect(mockPrisma.destinationCalendar.findFirst).toHaveBeenCalledWith({
          where: { userId: 5 },
        });
      });

      it("should return null when no calendar exists for user", async () => {
        mockPrisma.destinationCalendar.findFirst.mockResolvedValue(null);

        const repo = new DestinationCalendarRepository(mockPrisma as never);
        const result = await repo.getByUserId(999);

        expect(result).toBeNull();
      });
    });

    describe("fn: find", () => {
      it("should find destination calendar with custom where clause", async () => {
        const cal = { id: 3, integration: "google_calendar" };
        mockPrisma.destinationCalendar.findFirst.mockResolvedValue(cal);

        const repo = new DestinationCalendarRepository(mockPrisma as never);
        const result = await repo.find({
          where: { integration: "google_calendar", userId: 1 },
        });

        expect(result).toEqual(cal);
        expect(mockPrisma.destinationCalendar.findFirst).toHaveBeenCalledWith({
          where: { integration: "google_calendar", userId: 1 },
        });
      });

      it("should return null when no match found", async () => {
        mockPrisma.destinationCalendar.findFirst.mockResolvedValue(null);

        const repo = new DestinationCalendarRepository(mockPrisma as never);
        const result = await repo.find({
          where: { userId: 999 },
        });

        expect(result).toBeNull();
      });
    });

    describe("fn: findById", () => {
      it("should find destination calendar by id", async () => {
        const cal = { id: 1, userId: 5, integration: "google_calendar" };
        mockPrisma.destinationCalendar.findUnique.mockResolvedValue(cal);

        const repo = new DestinationCalendarRepository(mockPrisma as never);
        const result = await repo.findById(1);

        expect(result).toEqual(cal);
        expect(mockPrisma.destinationCalendar.findUnique).toHaveBeenCalledWith({
          where: { id: 1 },
        });
      });

      it("should return null when not found", async () => {
        mockPrisma.destinationCalendar.findUnique.mockResolvedValue(null);

        const repo = new DestinationCalendarRepository(mockPrisma as never);
        const result = await repo.findById(999);

        expect(result).toBeNull();
      });
    });

    describe("fn: deleteById", () => {
      it("should delete destination calendar by id", async () => {
        const cal = { id: 1, userId: 5 };
        mockPrisma.destinationCalendar.delete.mockResolvedValue(cal);

        const repo = new DestinationCalendarRepository(mockPrisma as never);
        const result = await repo.deleteById(1);

        expect(result).toEqual(cal);
        expect(mockPrisma.destinationCalendar.delete).toHaveBeenCalledWith({
          where: { id: 1 },
        });
      });
    });

    describe("fn: deleteByUserId", () => {
      it("should delete destination calendar by userId", async () => {
        const cal = { id: 1, userId: 5 };
        mockPrisma.destinationCalendar.delete.mockResolvedValue(cal);

        const repo = new DestinationCalendarRepository(mockPrisma as never);
        const result = await repo.deleteByUserId(5);

        expect(result).toEqual(cal);
        expect(mockPrisma.destinationCalendar.delete).toHaveBeenCalledWith({
          where: { userId: 5 },
        });
      });
    });

    describe("fn: updateByUserId", () => {
      it("should update destination calendar by userId", async () => {
        const updated = { id: 1, userId: 5, integration: "office365_calendar", externalId: "new-cal" };
        mockPrisma.destinationCalendar.update.mockResolvedValue(updated);

        const repo = new DestinationCalendarRepository(mockPrisma as never);
        const result = await repo.updateByUserId(5, {
          integration: "office365_calendar",
          externalId: "new-cal",
        });

        expect(result).toEqual(updated);
        expect(mockPrisma.destinationCalendar.update).toHaveBeenCalledWith({
          where: { userId: 5 },
          data: { integration: "office365_calendar", externalId: "new-cal" },
        });
      });

      it("should update with optional primaryEmail", async () => {
        mockPrisma.destinationCalendar.update.mockResolvedValue({ id: 1 });

        const repo = new DestinationCalendarRepository(mockPrisma as never);
        await repo.updateByUserId(5, {
          integration: "google_calendar",
          externalId: "cal-1",
          primaryEmail: "user@example.com",
        });

        expect(mockPrisma.destinationCalendar.update).toHaveBeenCalledWith({
          where: { userId: 5 },
          data: { integration: "google_calendar", externalId: "cal-1", primaryEmail: "user@example.com" },
        });
      });
    });

    describe("fn: findByUserIdWithoutEventType", () => {
      it("should find destination calendar for user without event type", async () => {
        const cal = { id: 1, userId: 5, eventTypeId: null };
        mockPrisma.destinationCalendar.findFirst.mockResolvedValue(cal);

        const repo = new DestinationCalendarRepository(mockPrisma as never);
        const result = await repo.findByUserIdWithoutEventType(5);

        expect(result).toEqual(cal);
        expect(mockPrisma.destinationCalendar.findFirst).toHaveBeenCalledWith({
          where: { userId: 5, eventTypeId: null },
        });
      });

      it("should return null when none found", async () => {
        mockPrisma.destinationCalendar.findFirst.mockResolvedValue(null);

        const repo = new DestinationCalendarRepository(mockPrisma as never);
        const result = await repo.findByUserIdWithoutEventType(999);

        expect(result).toBeNull();
      });
    });

  });
});
