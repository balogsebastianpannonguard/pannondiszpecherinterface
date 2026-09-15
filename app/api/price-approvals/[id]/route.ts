import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getBookingsCollection } from "@/lib/bookings";
import { ObjectId } from "mongodb";
// Itt megpróbáljuk használni az eredeti rendszer logikáját az email küldésre
// Mivel ez a projekt nem biztos hogy tartalmazza a nodemailer-t, egy minimalista update-et csinálunk
// Az email küldés opcionális itt, de legalább az adatbázisban átállítjuk a státuszt

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentSession();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { decision, comment } = body;

    if (decision !== "approved" && decision !== "rejected") {
      return NextResponse.json({ error: "Érvénytelen döntés" }, { status: 400 });
    }

    const col = await getBookingsCollection();
    const oid = new ObjectId(id);
    const booking = await col.findOne({ _id: oid } as any);

    if (!booking) {
      return NextResponse.json({ error: "Foglalás nem található" }, { status: 404 });
    }

    const now = Date.now();
    const updatePayload: any = {
      priceApprovalStatus: decision,
      priceApprovalResponse: {
        respondedBy: user.email,
        respondedAt: now,
        decision,
        comment,
      },
      updatedAt: now,
    };

    if (decision === "approved" && booking.priceApprovalRequest?.requestedPrice) {
      updatePayload.price = booking.priceApprovalRequest.requestedPrice;
    }

    const res = await col.findOneAndUpdate(
      { _id: oid } as any,
      { 
        $set: updatePayload,
        $push: {
          auditTrail: {
            timestamp: now,
            action: `price_approval.${decision}`,
            actor: user.email,
            details: comment || `Ár ${decision === 'approved' ? 'elfogadva' : 'elutasítva'}`,
          }
        }
      },
      { returnDocument: 'after' }
    );

    return NextResponse.json({ success: true, booking: res });
  } catch (err) {
    console.error("[PriceApproval PATCH Error]", err);
    return NextResponse.json({ error: "Szerver hiba" }, { status: 500 });
  }
}
