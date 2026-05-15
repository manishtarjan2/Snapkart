export const dynamic = 'force-dynamic';
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import User from "@/models/user.model";
import Order from "@/models/order.model";
import connectDb from "@/lib/db";
import Nav from "@/components/Nav";
import { Truck, ArrowRight, Package, Clock3, ShoppingBag, MapPin } from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    placed: { label: "Placed", color: "bg-slate-800 text-slate-200" },
    pendingAcceptance: { label: "Finding Rider", color: "bg-orange-800 text-orange-100" },
    confirmed: { label: "Confirmed", color: "bg-blue-800 text-blue-100" },
    outForDelivery: { label: "Out for delivery", color: "bg-emerald-800 text-emerald-100" },
    delivered: { label: "Delivered", color: "bg-emerald-100 text-emerald-900" },
    cancelled: { label: "Cancelled", color: "bg-red-800 text-red-100" },
    refunded: { label: "Refunded", color: "bg-amber-800 text-amber-100" },
};

function formatAmount(value: number) {
    return `₹${value.toFixed(0)}`;
}

function formatDate(value?: Date) {
    if (!value) return "-";
    return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default async function TrackOrderPage({ searchParams }: { searchParams?: { orderId?: string | string[] } }) {
    await connectDb();
    const session = await auth();
    if (!session?.user) redirect("/login");

    const user = await User.findById(session.user.id);
    if (!user) redirect("/login");

    const allOrders = await Order.find({ userId: session.user.id }).sort({ createdAt: -1 }).lean();
    const orderIdQuery = Array.isArray(searchParams?.orderId) ? searchParams?.orderId[0] : searchParams?.orderId;
    const filteredOrders = orderIdQuery
        ? allOrders.filter((order) => order._id?.toString() === orderIdQuery)
        : allOrders;

    const productHistoryMap = new Map<string, { name: string; image?: string; quantity: number; amount: number }>();
    for (const order of allOrders) {
        for (const item of order.items) {
            const key = item.groceryId?.toString() ?? item.name;
            const existing = productHistoryMap.get(key);
            if (existing) {
                existing.quantity += item.quantity;
                existing.amount += item.price * item.quantity;
            } else {
                productHistoryMap.set(key, {
                    name: item.name,
                    image: item.image,
                    quantity: item.quantity,
                    amount: item.price * item.quantity,
                });
            }
        }
    }

    const productHistory = Array.from(productHistoryMap.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 6);

    const activeOrders = filteredOrders.filter((order) => order.orderStatus === "confirmed" || order.orderStatus === "outForDelivery");
    const hasOrders = filteredOrders.length > 0;

    const userData = {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        image: user.image || null,
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            <Nav user={userData} />
            <main className="pt-24 max-w-6xl mx-auto px-4 sm:px-6 pb-20">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center text-white shadow-xl">
                            <Truck className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm uppercase tracking-[0.4em] text-emerald-400">Live tracking</p>
                            <h1 className="text-4xl font-black tracking-tight">Track Order</h1>
                            <p className="mt-2 text-gray-400 max-w-2xl">Search your order by ID, review recent order history, and see the products you've ordered most often.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <a href="/orders" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-200 hover:border-emerald-500/30 hover:text-white transition-all">
                            <Package className="w-4 h-4 text-emerald-300" />
                            View order history
                        </a>
                        <a href="/orders" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-200 hover:border-cyan-500/30 hover:text-white transition-all">
                            <ShoppingBag className="w-4 h-4 text-cyan-300" />
                            Product history
                        </a>
                    </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
                    <section className="space-y-6">
                        <div className="rounded-3xl border border-white/10 bg-gray-900 p-6 shadow-2xl">
                            <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="text-xl font-bold">Order search</h2>
                                    <p className="text-sm text-gray-400">Paste an order ID to jump directly to its live status.</p>
                                </div>
                                <form action="/track-order" method="get" className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                    <input
                                        name="orderId"
                                        defaultValue={orderIdQuery ?? ""}
                                        placeholder="Order ID"
                                        className="min-w-[220px] rounded-2xl border border-white/10 bg-gray-950 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none"
                                    />
                                    <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition-all">
                                        Search
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </form>
                            </header>
                        </div>

                        <div className="rounded-3xl border border-white/10 bg-gray-900 p-6 shadow-2xl">
                            <div className="mb-6 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm uppercase tracking-[0.35em] text-cyan-300 font-semibold">Recent orders</p>
                                    <h3 className="text-2xl font-bold">Latest activity</h3>
                                </div>
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300">{allOrders.length} total</span>
                            </div>

                            {hasOrders ? (
                                <div className="space-y-4">
                                    {filteredOrders.map((order) => {
                                        const status = STATUS_LABELS[order.orderStatus || "placed"] ?? STATUS_LABELS.placed;
                                        const isLive = order.orderStatus === "confirmed" || order.orderStatus === "outForDelivery";
                                        return (
                                            <article key={order._id?.toString()} className="rounded-3xl border border-white/10 bg-gray-950 p-5 transition-colors hover:border-emerald-500/20">
                                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                                    <div className="space-y-2">
                                                        <p className="text-xs text-gray-400 uppercase tracking-[0.35em]">Order ID</p>
                                                        <p className="font-semibold text-white break-all">{order._id?.toString()}</p>
                                                        <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.color}`}>{status.label}</span>
                                                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300">
                                                            {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                                    <div className="rounded-3xl bg-gray-950/80 p-4 border border-white/5">
                                                        <p className="text-xs text-gray-400 uppercase tracking-[0.35em]">Total amount</p>
                                                        <p className="mt-2 text-lg font-bold text-white">{formatAmount(order.totalAmount)}</p>
                                                    </div>
                                                    <div className="rounded-3xl bg-gray-950/80 p-4 border border-white/5">
                                                        <p className="text-xs text-gray-400 uppercase tracking-[0.35em]">Delivery</p>
                                                        <p className="mt-2 text-sm text-gray-300">{order.address?.city ?? "In-store"}, {order.address?.state ?? ""}</p>
                                                    </div>
                                                </div>

                                                <div className="mt-4 flex flex-wrap items-center gap-3">
                                                    {isLive ? (
                                                        <span className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                                                            <MapPin className="w-4 h-4" /> Live updates available
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2 text-sm text-gray-300">
                                                            <Clock3 className="w-4 h-4" /> Status snapshot only
                                                        </span>
                                                    )}
                                                    <a
                                                        href={`/track-order?orderId=${order._id?.toString()}`}
                                                        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:border-emerald-500/30 hover:bg-emerald-500/10 transition-all"
                                                    >
                                                        View details
                                                    </a>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="rounded-3xl border border-dashed border-white/10 bg-gray-950/80 p-8 text-center text-gray-400">
                                    <p className="text-base font-semibold">No orders found yet.</p>
                                    <p className="mt-2 text-sm text-gray-500">Place your first order and track it live from here.</p>
                                </div>
                            )}
                        </div>
                    </section>

                    <aside className="space-y-6">
                        <div className="rounded-3xl border border-white/10 bg-gray-900 p-6 shadow-2xl">
                            <div className="mb-4 flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-300">
                                    <ShoppingBag className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm uppercase tracking-[0.35em] text-cyan-300 font-semibold">Product history</p>
                                    <h3 className="text-xl font-bold">Most ordered</h3>
                                </div>
                            </div>

                            {productHistory.length > 0 ? (
                                <div className="space-y-3">
                                    {productHistory.map((item) => (
                                        <div key={item.name} className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-3">
                                            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-gray-950/80">
                                                {item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" /> : <ShoppingBag className="w-6 h-6 text-gray-400" />}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold text-white">{item.name}</p>
                                                <p className="text-xs text-gray-400">{item.quantity}× ordered</p>
                                            </div>
                                            <p className="text-sm font-semibold text-gray-100">{formatAmount(item.amount)}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">Your ordered product history will appear here after you place orders.</p>
                            )}
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    );
}
