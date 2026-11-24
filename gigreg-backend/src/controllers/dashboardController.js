import User from "../models/User.js";
import Listing from "../models/Listing.js";
import bcrypt from "bcryptjs";
import Booking from "../models/Booking.js";
import Withdrawal from "../models/Withdrawal.js";
import { buildAuthCookieOptions, generateToken } from "../utils/utils.js";
import { escapeRegex } from "../utils/sanitize.js";
import { getAppSettings, updateAppSettings } from "../services/appSettingsService.js";
import getFirebaseAdmin from "../middleware/firebaseAdmin.js";

const ensureAdmin = (req, res) => {
    if (req.user?.role !== "admin") {
        res.status(403).json({ status: false, message: "Admin access required" });
        return false;
    }
    return true;
};


export const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
        if (!normalizedEmail || typeof password !== "string" || !password) {
            return res.status(401).json({ status: false, message: "Invalid credentials" });
        }
        const user =
            (await User.findOne({ email: normalizedEmail })) ||
            (email !== normalizedEmail ? await User.findOne({ email: String(email).trim() }) : null);

        if (!user) {
            return res.status(401).json({ status: false, message: "Invalid credentials" });
        }

        if (user.role !== "admin") {
            return res.status(403).json({ status: false, message: "Access denied. Admin role required." });
        }

        if (await user.matchPassword(password)) {
            const token = generateToken(user._id, user.tokenVersion);

            res.cookie("token", token, buildAuthCookieOptions(req));

            return res.json({
                status: true,
                token,
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
                message: "Login successful",
            });
        } else {
            return res.status(401).json({ status: false, message: "Invalid credentials" });
        }
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};
export const loginUserByAdmin = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (user) {
            const token = generateToken(user._id, user.tokenVersion);

            res.cookie("token", token, buildAuthCookieOptions(req));

            return res.json({
                status: true,
                token,
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
                message: "Login successful",
            });
        } else {
            return res.status(404).json({ status: false, message: "User not found" });
        }
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};


export const getAllUser = async (req, res) => {
    try {

        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
        const { search } = req.query;

        let query = {};

        const safeSearch = typeof search === "string" ? escapeRegex(search) : "";
        if (safeSearch) {
            query = {
                $or: [
                    { name: { $regex: safeSearch, $options: "i" } },
                    { email: { $regex: safeSearch, $options: "i" } },
                ],
            };
        }

        const skip = (page - 1) * limit;

        const total = await User.countDocuments(query);

        const users = await User.find(query)
            .select("-password -resetPasswordToken -resetPasswordExpire")
            .skip(skip)
            .limit(Number(limit))
            .sort({ createdAt: -1 });

        return res.json({
            status: true,
            message: "Users fetched successfully",
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / limit),
            data: users,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: "Server error" });
    }
};

export const updateUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const { name, email, password } = req.body;

        // 1️⃣ FIND USER
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ status: false, message: "User not found" });
        }

        // 2️⃣ EMAIL UPDATE CHECK
        if (email && email !== user.email) {
            const emailExists = await User.findOne({ email });
            if (emailExists) {
                return res.status(400).json({
                    status: false,
                    message: "Email already in use",
                });
            }
            user.email = email;
        }

        // 3️⃣ NAME UPDATE
        if (name) user.name = name;

        // 4️⃣ PASSWORD UPDATE (NO HASHING HERE)
        if (password) user.password = password;  // hashing pre("save") karega

        // 5️⃣ SAVE
        await user.save();

        // REMOVE SENSITIVE FIELDS
        const userData = user.toObject();
        delete userData.password;
        delete userData.resetPasswordToken;
        delete userData.resetPasswordExpire;

        res.json({
            status: true,
            message: "User updated successfully",
            data: userData,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: "Server error" });
    }
};


export const deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                status: false,
                message: "User not found",
            });
        }

        // Delete user from MongoDB
        await User.findByIdAndDelete(userId);

        // Best-effort sync deletion with Firebase Authentication
        let firebaseDeleted = false;
        if (user.email) {
            try {
                const firebaseAdmin = getFirebaseAdmin();
                if (firebaseAdmin) {
                    const fbUser = await firebaseAdmin.auth().getUserByEmail(user.email);
                    if (fbUser?.uid) {
                        await firebaseAdmin.auth().deleteUser(fbUser.uid);
                        firebaseDeleted = true;
                    }
                }
            } catch (fbErr) {
                if (fbErr?.code !== "auth/user-not-found") {
                    console.warn("Firebase Auth delete sync warning:", fbErr.message);
                }
            }
        }

        res.json({
            status: true,
            message: "User deleted successfully",
            firebaseDeleted,
            deletedUser: {
                _id: user._id,
                name: user.name,
                email: user.email,
            },
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: false,
            message: "Server error",
        });
    }
};
export const changeUserRole = async (req, res) => {
    try {
        const userId = req.params.id;
        const { role } = req.body;
        if (!role) {
            return res.status(400).json({
                status: false,
                message: "Role is required",
            });
        }

        const allowedRoles = ["user", "admin", "teacher"];

        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                status: false,
                message: "Invalid role value",
            });
        }
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                status: false,
                message: "User not found",
            });
        }

        // Update role
        user.role = role;
        await user.save();

        res.json({
            status: true,
            message: "User role updated successfully",
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                newRole: user.role,
            },
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: false,
            message: "Server error",
        });
    }
};


export const getAllData = async (req, res) => {
    try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        const paidBookingMatch = {
            paymentStatus: "paid",
            status: { $ne: "cancelled" },
        };

        const [
            totalListings,
            totalUser,
            totalWithdraw,
            totalBooking,
            paidBookingCount,
            totalsByCurrency,
            todayBookingCount,
            todayTotalsByCurrency,
            settings,
        ] = await Promise.all([
            Listing.countDocuments(),
            User.countDocuments(),
            Withdrawal.countDocuments(),
            Booking.countDocuments(),
            Booking.countDocuments(paidBookingMatch),
            Booking.aggregate([
                { $match: paidBookingMatch },
                {
                    $group: {
                        _id: { $toUpper: { $ifNull: ["$currency", "USD"] } },
                        amount: { $sum: "$amount" },
                        count: { $sum: 1 },
                    },
                },
                { $project: { _id: 0, currency: "$_id", amount: 1, count: 1 } },
                { $sort: { currency: 1 } },
            ]),
            Booking.countDocuments({
                ...paidBookingMatch,
                createdAt: { $gte: startOfToday, $lte: endOfToday },
            }),
            Booking.aggregate([
                {
                    $match: {
                        ...paidBookingMatch,
                        createdAt: { $gte: startOfToday, $lte: endOfToday },
                    },
                },
                {
                    $group: {
                        _id: { $toUpper: { $ifNull: ["$currency", "USD"] } },
                        amount: { $sum: "$amount" },
                        count: { $sum: 1 },
                    },
                },
                { $project: { _id: 0, currency: "$_id", amount: 1, count: 1 } },
                { $sort: { currency: 1 } },
            ]),
            getAppSettings(),
        ]);

        const totalAmount = totalsByCurrency.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
        const todayAmount = todayTotalsByCurrency.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);

        res.json({
            success: true,
            totalListings,
            totalUser,
            totalWithdraw,
            totalBooking,
            paidBookingCount,
            totalAmount,
            todayAmount,
            totalsByCurrency,
            todayTotalsByCurrency,
            todayBookingCount,
            settings,
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getSettings = async (req, res) => {
    try {
        if (!ensureAdmin(req, res)) return;
        const settings = await getAppSettings();

        res.json({
            success: true,
            settings,
        });
    } catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

export const updateSettings = async (req, res) => {
    try {
        if (!ensureAdmin(req, res)) return;
        const settings = await updateAppSettings({
            commissionPercent: req.body.commissionPercent,
        });

        res.json({
            success: true,
            message: "Settings updated successfully",
            settings,
        });
    } catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
};
