


import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";

export async function GET() {
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.json(
      { error: "Authentication required to access order operations." },
      { status: 401 }
    );
  }

  if (session.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: ADMIN role required." },
      { status: 403 }
    );
  }

  try {
    const orders = await prisma.clientOrder.findMany({
      include: {
        package: {
          select: {
            name: true,
            slug: true,
            ghlTag: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    });

    const webhookLogs = await prisma.webhookLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return NextResponse.json({ orders, webhookLogs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch orders";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}