import { buildCredentialPayloadForPrisma } from "@calcom/lib/server/buildCredentialPayloadForCalendar";
import type { PrismaClient } from "@calcom/prisma";
import { prisma } from "@calcom/prisma";
import type { DestinationCalendar, Prisma } from "@calcom/prisma/client";

export class DestinationCalendarRepository {
  private prismaClient: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prismaClient = prismaClient ?? prisma;
  }

  async getCustomReminderByCredentialId(credentialId: number): Promise<number | null> {
    const destinationCalendar = await this.prismaClient.destinationCalendar.findFirst({
      where: { credentialId },
      select: { customCalendarReminder: true },
    });
    return destinationCalendar?.customCalendarReminder ?? null;
  }

  async updateCustomReminder({
    userId,
    credentialId,
    integration,
    customCalendarReminder,
  }: {
    userId: number;
    credentialId: number;
    integration: string;
    customCalendarReminder: number | null;
  }): Promise<Prisma.BatchPayload> {
    return await this.prismaClient.destinationCalendar.updateMany({
      where: { userId, credentialId, integration },
      data: { customCalendarReminder },
    });
  }

  async create(data: Prisma.DestinationCalendarCreateInput): Promise<DestinationCalendar> {
    return await this.prismaClient.destinationCalendar.create({ data });
  }

  async getByUserId(userId: number): Promise<DestinationCalendar | null> {
    return await this.prismaClient.destinationCalendar.findFirst({ where: { userId } });
  }

  async find({ where }: { where: Prisma.DestinationCalendarWhereInput }): Promise<DestinationCalendar | null> {
    return await this.prismaClient.destinationCalendar.findFirst({ where });
  }

  async findById(id: number): Promise<DestinationCalendar | null> {
    return await this.prismaClient.destinationCalendar.findUnique({ where: { id } });
  }

  async deleteById(id: number): Promise<DestinationCalendar> {
    return await this.prismaClient.destinationCalendar.delete({ where: { id } });
  }

  async deleteByUserId(userId: number): Promise<DestinationCalendar> {
    return await this.prismaClient.destinationCalendar.delete({ where: { userId } });
  }

  async updateByUserId(
    userId: number,
    data: {
      integration: string;
      externalId: string;
      primaryEmail?: string | null;
    }
  ): Promise<DestinationCalendar> {
    return await this.prismaClient.destinationCalendar.update({ where: { userId }, data });
  }

  async findByUserIdWithoutEventType(userId: number): Promise<DestinationCalendar | null> {
    return await this.prismaClient.destinationCalendar.findFirst({
      where: { userId, eventTypeId: null },
    });
  }

  async upsert({
    where,
    update,
    create,
  }: {
    where: Prisma.DestinationCalendarUpsertArgs["where"];
    update: {
      integration?: string;
      externalId?: string;
      credentialId?: number | null;
      primaryEmail?: string | null;
      delegationCredentialId?: string | null;
    };
    create: {
      integration: string;
      externalId: string;
      credentialId: number | null;
      primaryEmail?: string | null;
      delegationCredentialId?: string | null;
    };
  }): Promise<DestinationCalendar> {
    const credentialPayloadForUpdate = buildCredentialPayloadForPrisma({
      credentialId: update.credentialId,
      delegationCredentialId: update.delegationCredentialId,
    });

    const credentialPayloadForCreate = buildCredentialPayloadForPrisma({
      credentialId: create.credentialId,
      delegationCredentialId: create.delegationCredentialId,
    });

    return await this.prismaClient.destinationCalendar.upsert({
      where,
      update: { ...update, ...credentialPayloadForUpdate },
      create: { ...create, ...credentialPayloadForCreate },
    });
  }
}
