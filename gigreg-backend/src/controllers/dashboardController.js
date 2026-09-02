import User from "../models/User.js";
import Listing from "../models/Listing.js";
import bcrypt from "bcryptjs";
import Booking from "../models/Booking.js";
import Withdrawal from "../models/Withdrawal.js";
import { generateToken } from "../utils/utils.js";
import { getAppSettings, updateAppSettings } from "../services/appSettingsService.js";

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
        const user = await User.findOne({ email });

        if (user.role != "admin") {
            res.status(401).json({ status: false, message: "Invalid role" });
        }

        if (user && (await user.matchPassword(password))) {
            const token = generateToken(user._id);

            // Set JWT token in cookie
            res.cookie("token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });

            res.json({
                status: true,
                _id: user._id,
                email: user.email,
                message: "Login successful",
            });
        } else {
            res.status(401).json({ status: false, message: "Invalid credentials" });
        }
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
};
export const loginUserByAdmin = async (req, res) => {
    try {

        const user = await User.findById(req.params.id);

        if (user) {
            const token = generateToken(user._id);

            // Set JWT token in cookie
            res.cookie("token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });

            res.json({
                status: true,
                _id: user._id,
                email: user.email,
                message: "Login successful",
            });
        } else {
            res.status(401).json({ status: false, message: "Invalid credentials" });
        }
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
};


export const getAllUser = async (req, res) => {
    try {

        const { page, limit, search} = req.query;


        let query = {};

        if (search) {
            query = {
                $or: [
                    { name: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
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
        console.log(req.body);
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

        // Delete user
        await User.findByIdAndDelete(userId);

        res.json({
            status: true,
            message: "User deleted successfully",
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

        const totalListings = await Listing.countDocuments();
        const totalUser = await User.countDocuments();
        const totalWithdraw = await Withdrawal.countDocuments();
        const totalBooking = await Booking.countDocuments();

        const totalAmountResult = await Booking.aggregate([
            { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
        ]);
        const totalAmount = totalAmountResult[0]?.totalAmount || 0;
        const todayBookingCount = await Booking.countDocuments({
            createdAt: { $gte: startOfToday, $lte: endOfToday }
        });
        const todayAmountResult = await Booking.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfToday, $lte: endOfToday }
                }
            },
            { $group: { _id: null, todayAmount: { $sum: "$amount" } } }
        ]);

        const todayAmount = todayAmountResult[0]?.todayAmount || 0;
        const settings = await getAppSettings();
        res.json({
            success: true,
            totalListings,
            totalUser,
            totalWithdraw,
            totalBooking,
            totalAmount,
            todayAmount,
            todayBookingCount,
            settings
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
