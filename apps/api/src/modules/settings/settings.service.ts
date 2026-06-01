import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

const DEFAULT_ORG_ID = 'c87f4e63-fd29-4ff5-823f-e4926daa0820';

const DEFAULT_BUY_BOX_SENDING = {
  startHour: 9,
  endHour: 18,
  maxPerMinute: 5,
  daysOfWeek: [1, 2, 3, 4, 5],
  timezoneMode: 'local',
  reminderCadenceDays: {
    reminder1: 2,
    reminder2: 4,
    reminder3: 7,
  },
};

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  private normalizeBuyBoxSending(input: any = {}) {
    const startHour = Number.isFinite(Number(input.startHour)) ? Number(input.startHour) : DEFAULT_BUY_BOX_SENDING.startHour;
    const endHour = Number.isFinite(Number(input.endHour)) ? Number(input.endHour) : DEFAULT_BUY_BOX_SENDING.endHour;
    const maxPerMinute = Number.isFinite(Number(input.maxPerMinute)) ? Number(input.maxPerMinute) : DEFAULT_BUY_BOX_SENDING.maxPerMinute;

    const rawDays = Array.isArray(input.daysOfWeek) ? input.daysOfWeek : DEFAULT_BUY_BOX_SENDING.daysOfWeek;
    const daysOfWeek = rawDays
      .map((d: any) => Number(d))
      .filter((d: number) => Number.isInteger(d) && d >= 0 && d <= 6);

    const rawCadence = input.reminderCadenceDays || {};
    const reminderCadenceDays = {
      reminder1: Math.min(30, Math.max(0, Number.isFinite(Number(rawCadence.reminder1)) ? Number(rawCadence.reminder1) : DEFAULT_BUY_BOX_SENDING.reminderCadenceDays.reminder1)),
      reminder2: Math.min(60, Math.max(0, Number.isFinite(Number(rawCadence.reminder2)) ? Number(rawCadence.reminder2) : DEFAULT_BUY_BOX_SENDING.reminderCadenceDays.reminder2)),
      reminder3: Math.min(90, Math.max(0, Number.isFinite(Number(rawCadence.reminder3)) ? Number(rawCadence.reminder3) : DEFAULT_BUY_BOX_SENDING.reminderCadenceDays.reminder3)),
    };

    return {
      startHour: Math.min(23, Math.max(0, startHour)),
      endHour: Math.min(23, Math.max(0, endHour)),
      maxPerMinute: Math.min(20, Math.max(1, maxPerMinute)),
      daysOfWeek: daysOfWeek.length ? Array.from(new Set(daysOfWeek)).sort() : DEFAULT_BUY_BOX_SENDING.daysOfWeek,
      timezoneMode: input.timezoneMode === 'eastern' ? 'eastern' : 'local',
      reminderCadenceDays,
    };
  }

  async getBuyBoxSendingSettings(orgId: string = DEFAULT_ORG_ID) {
    const org: any = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    } as any);

    const settings = (org?.settings && typeof org.settings === 'object') ? org.settings : {};
    return this.normalizeBuyBoxSending({
      ...DEFAULT_BUY_BOX_SENDING,
      ...(settings.buyBoxSending || {}),
    });
  }

  async updateBuyBoxSendingSettings(orgId: string = DEFAULT_ORG_ID, body: any = {}) {
    const org: any = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    } as any);

    const currentSettings = (org?.settings && typeof org.settings === 'object') ? org.settings : {};
    const nextBuyBoxSending = this.normalizeBuyBoxSending(body);

    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        settings: {
          ...currentSettings,
          buyBoxSending: nextBuyBoxSending,
        },
      },
    } as any);

    return nextBuyBoxSending;
  }
}
