import User from "../models/User.js";
import Withdrawal from "../models/Withdrawal.js";
import { generateOrderNo } from "../utils/utils.js";

export const createWithdrawal = async (req, res) => {
    try {
        const userId = req.user._id;
        const { name, accountNo,  bank, amount,country,currency,iban,routingNumber,swiftBic } = req.body;

        if (!name || !accountNo ||  !bank || !amount) {
            return res.status(400).json({ message: "All fields required" });
        }

        const user = await User.findById(userId);
        if (user.money < amount) return res.status(400).json({ message: "Insufficient balance" });

        const withdrawal = await Withdrawal.create({
            userId,
            name,
            accountNo,
                      bank,
            amount,
            country,
            currency,
            iban,
            routingNumber,
            swiftBic,
            orderNo:generateOrderNo(),
            status: "pending",
        });
        await User.findByIdAndUpdate(userId, {
            $inc: { money: -amount }
        });
        res.json({ status: true, message: "Withdrawal request created", withdrawal });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
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

        const withdrawal = await Withdrawal.findById(id);
        if (!withdrawal) return res.status(404).json({ message: "Withdrawal not found" });

        if (withdrawal.status !== "pending")
            return res.status(400).json({ message: "Already processed" });

        if (status === "approved") {
            withdrawal.status = "approved";
            await withdrawal.save();
        } else {

            // OPTIONAL → Update User Balance
            await User.findByIdAndUpdate(withdrawal.userId, {
                $inc: { money: withdrawal.amount }
            });
            withdrawal.status = "rejected";
            await withdrawal.save();
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


