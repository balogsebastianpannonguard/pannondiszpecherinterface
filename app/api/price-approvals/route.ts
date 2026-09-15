import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getBookingsCollection } from "@/lib/bookings";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentSession();
    if (!user) {
      return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 401 });
    }

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Csak adminoknak" }, { status: 403 });
    }

    const col = await getBookingsCollection();
    const docs = await col
      .find({ priceApprovalStatus: "pending_approval" })
      .sort({ updatedAt: -1, createdAt: -1 })
      .toArray();

    return NextResponse.json({ success: true, approvals: docs });
  } catch (err) {
    console.error("[PriceApprovals API Error]", err);
    return NextResponse.json({ error: "Szerver hiba" }, { status: 500 });
  }
}
