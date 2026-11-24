import User from "../models/User.js";
import Withdrawal from "../models/Withdrawal.js";
import { generateOrderNo } from "../utils/utils.js";

export const createWithdrawal = async (req, res) => {
    return res.status(410).json({
        status: false,
        message: "Manual withdrawals are deprecated. Please use Stripe Direct Payouts at /withdraw-request.",
    });
};
export const getUserWithdrawals = async (req, res) => {
    try {
        const userId = req.user._id;

        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const totalItems = await Withdrawal.countDocuments({ userId });

        const withdrawals = await Withdrawal.find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            status: true,
            withdrawals,
            page,
            limit,
            totalItems,
            totalPages: Math.ceil(totalItems / limit)
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
export const approveWithdrawal = async (req, res) => {
    try {
        const { id } = req.params; // withdrawalId
        const { status } = req.body;

        if (!["approved", "rejected"].includes(status)) {
            return res.status(400).json({ status: false, message: "Status must be 'approved' or 'rejected'" });
        }

        const existing = await Withdrawal.findById(id);
        if (!existing) return res.status(404).json({ message: "Withdrawal not found" });

        if (existing.status !== "pending") {
            return res.status(400).json({ message: "Already processed" });
        }

        const withdrawal = await Withdrawal.findOneAndUpdate(
            { _id: id, status: "pending" },
            { $set: { status } },
            { new: true }
        );

        if (!withdrawal) {
            return res.status(400).json({ message: "Already processed" });
        }

        if (status === "rejected" && Number(withdrawal.amount) > 0) {
            await User.findByIdAndUpdate(withdrawal.userId, {
                $inc: { money: withdrawal.amount }
            });
        }

        res.json({ status: true, message: "Withdrawal status updated", withdrawal });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
export const getAllWithdrawals = async (req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const filter = {};
        if (req.query.status) filter.status = req.query.status; // optional filter (pending/approved/rejected)

        const totalItems = await Withdrawal.countDocuments(filter);

        const withdrawals = await Withdrawal.find(filter)
            .populate("userId", "name email phone")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            status: true,
            withdrawals,
            page,
            limit,
            totalItems,
            totalPages: Math.ceil(totalItems / limit)
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


