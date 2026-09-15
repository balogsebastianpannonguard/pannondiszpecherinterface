import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getBookingsForMonth } from "@/lib/bookings";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const yearStr = searchParams.get("year");
    const monthStr = searchParams.get("month");

    if (!yearStr || !monthStr) {
      return NextResponse.json({ error: "Missing year/month" }, { status: 400 });
    }

    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10); // 0-indexed

    const bookings = await getBookingsForMonth(year, month);

    return NextResponse.json({ success: true, bookings });
  } catch (err) {
    console.error("[Bookings API Error]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
