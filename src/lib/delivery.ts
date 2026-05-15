import mongoose from "mongoose";
import Delivery from "@/models/delivery.model";
import DeliveryBoy from "@/models/deliveryboy.model";

export function generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Sends a delivery request to the nearest available delivery boy.
 * The order goes into "pendingAcceptance" status and the Delivery record
 * is created with status="pending". The delivery boy must explicitly
 * accept/reject via /api/delivery/accept.
 *
 * If no delivery boy is available, returns { assigned: false }.
 */
export async function assignDeliveryBoyToOrder(order: any) {
    if (!order || order.type !== "online" || order.deliveryBoyId) {
        return { assigned: false, reason: "order-not-assignable" };
    }

    const lat = order.address?.latitude;
    const lng = order.address?.longitude;
    let deliveryBoy: any = null;

    if (typeof lat === "number" && typeof lng === "number") {
        deliveryBoy = await DeliveryBoy.findOne({
            status: "available",
            isActive: true,
            currentLocation: {
                $near: {
                    $geometry: { type: "Point", coordinates: [lng, lat] },
                    $maxDistance: 15000,
                },
            },
        });
    }

    if (!deliveryBoy) {
        deliveryBoy = await DeliveryBoy.findOne({ status: "available", isActive: true })
            .sort({ totalDeliveries: 1 });
    }

    if (!deliveryBoy) {
        return { assigned: false, reason: "no-available-delivery-boy" };
    }

    const otp = generateOtp();

    // Create a PENDING delivery request — delivery boy must accept
    const delivery = await Delivery.create({
        order_id: order._id,
        delivery_boy_id: deliveryBoy._id,
        store_id: order.store_id,
        otp,
        status: "pending",
        assignedAt: new Date(),
    });

    // Mark order as pending acceptance and link the delivery boy
    order.deliveryBoyId = deliveryBoy._id;
    order.deliveryOtp = otp;
    order.orderStatus = "pendingAcceptance";

    await order.save();

    return {
        assigned: true,
        deliveryId: delivery._id?.toString(),
        deliveryBoyId: deliveryBoy._id.toString(),
        deliveryBoyName: deliveryBoy.name,
        otp,
    };
}

/**
 * Re-assign an order to the next available delivery boy after a rejection.
 * The previous delivery boy is excluded from the search.
 */
export async function reassignDeliveryBoyToOrder(order: any, excludeBoyIds: string[] = []) {
    const lat = order.address?.latitude;
    const lng = order.address?.longitude;
    let deliveryBoy: any = null;

    const excludeFilter = {
        _id: { $nin: excludeBoyIds.map((id) => new mongoose.Types.ObjectId(id)) },
        status: "available",
        isActive: true,
    };

    if (typeof lat === "number" && typeof lng === "number") {
        deliveryBoy = await DeliveryBoy.findOne({
            ...excludeFilter,
            currentLocation: {
                $near: {
                    $geometry: { type: "Point", coordinates: [lng, lat] },
                    $maxDistance: 15000,
                },
            },
        });
    }

    if (!deliveryBoy) {
        deliveryBoy = await DeliveryBoy.findOne(excludeFilter)
            .sort({ totalDeliveries: 1 });
    }

    if (!deliveryBoy) {
        // No other delivery boy available — revert order to "placed"
        order.deliveryBoyId = null;
        order.orderStatus = "placed";
        await order.save();
        return { assigned: false, reason: "no-available-delivery-boy" };
    }

    const otp = generateOtp();

    const delivery = await Delivery.create({
        order_id: order._id,
        delivery_boy_id: deliveryBoy._id,
        store_id: order.store_id,
        otp,
        status: "pending",
        assignedAt: new Date(),
    });

    order.deliveryBoyId = deliveryBoy._id;
    order.deliveryOtp = otp;
    order.orderStatus = "pendingAcceptance";
    await order.save();

    return {
        assigned: true,
        deliveryId: delivery._id?.toString(),
        deliveryBoyId: deliveryBoy._id.toString(),
        deliveryBoyName: deliveryBoy.name,
        otp,
    };
}
