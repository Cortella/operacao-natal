import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { parseTemplateConfig } from "@/modules/templates/config";

export const ADMIN_PAGE_SIZE = 30;

export async function getDashboard() {
  const [pages, published, drafts, awaiting, paidOrders, pendingPayments, approvedPayments, users] =
    await Promise.all([
      db.giftPage.count(),
      db.giftPage.count({ where: { status: "PUBLISHED" } }),
      db.giftPage.count({ where: { status: "DRAFT" } }),
      db.giftPage.count({ where: { status: "PENDING_PAYMENT" } }),
      db.order.aggregate({
        where: { status: "PAID" },
        _count: true,
        _sum: { totalCents: true },
      }),
      db.payment.count({ where: { status: "PENDING" } }),
      db.payment.count({ where: { status: "APPROVED" } }),
      db.user.count({ where: { role: "USER" } }),
    ]);
  return {
    pages,
    published,
    drafts,
    awaiting,
    sales: paidOrders._count,
    revenueCents: paidOrders._sum.totalCents ?? 0,
    pendingPayments,
    approvedPayments,
    users,
  };
}

const PAGE_STATUSES = ["DRAFT", "PENDING_PAYMENT", "PUBLISHED", "DISABLED"] as const;
export type AdminPageStatus = (typeof PAGE_STATUSES)[number];

export const parsePageStatus = (value: string | undefined): AdminPageStatus | undefined =>
  PAGE_STATUSES.find((status) => status === value);

export async function listPages(options: { q?: string; status?: AdminPageStatus; page?: number }) {
  const q = options.q?.trim().slice(0, 80);
  const where: Prisma.GiftPageWhereInput = {
    ...(options.status ? { status: options.status } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { recipientName: { contains: q, mode: "insensitive" } },
            { senderName: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
            { owner: { name: { contains: q, mode: "insensitive" } } },
            { owner: { email: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const page = Math.max(1, options.page ?? 1);
  const [total, rows] = await Promise.all([
    db.giftPage.count({ where }),
    db.giftPage.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: {
        id: true,
        slug: true,
        status: true,
        blockedByAdmin: true,
        title: true,
        recipientName: true,
        senderName: true,
        updatedAt: true,
        expiresAt: true,
        owner: { select: { name: true, email: true } },
        _count: { select: { photos: true } },
      },
    }),
  ]);
  return { rows, total, page, pages: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)) };
}

export async function getAdminPage(id: string) {
  return db.giftPage.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      status: true,
      blockedByAdmin: true,
      title: true,
      senderName: true,
      recipientName: true,
      introText: true,
      mainMessage: true,
      expiresAt: true,
      createdAt: true,
      publishedAt: true,
      owner: { select: { name: true, email: true } },
      photos: { orderBy: { sortOrder: "asc" }, select: { id: true, url: true, caption: true } },
      messages: {
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { content: true, signature: true },
      },
      music: { select: { title: true } },
      template: { select: { name: true } },
      orders: {
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true, totalCents: true, createdAt: true },
      },
    },
  });
}

export async function listOrders(pageNumber = 1) {
  const page = Math.max(1, pageNumber);
  const [total, rows] = await Promise.all([
    db.order.count(),
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: {
        id: true,
        status: true,
        priceCents: true,
        discountCents: true,
        totalCents: true,
        createdAt: true,
        paidAt: true,
        user: { select: { name: true, email: true } },
        page: { select: { id: true, title: true, recipientName: true } },
        coupon: { select: { code: true } },
        payments: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            provider: true,
            providerPaymentId: true,
            method: true,
            status: true,
            statusDetail: true,
            amountCents: true,
            createdAt: true,
          },
        },
      },
    }),
  ]);
  return { rows, total, page, pages: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)) };
}

export const listCoupons = () => db.coupon.findMany({ orderBy: { createdAt: "desc" } });

export const listMusics = () =>
  db.music.findMany({
    where: { source: "PLATFORM" },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      artist: true,
      url: true,
      license: true,
      active: true,
      _count: { select: { pages: true } },
    },
  });

export async function listTemplates() {
  const rows = await db.template.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      config: true,
      active: true,
      sortOrder: true,
      _count: { select: { pages: true } },
    },
  });
  return rows.map((row) => ({ ...row, config: parseTemplateConfig(row.config) }));
}
