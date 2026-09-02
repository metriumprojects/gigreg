import Category from "../models/Category.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs";
import { slugify } from "../utils/utils.js";


export const createCategory = async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({status:false, message: "Category name is required" });
        }

        const existing = await Category.findOne({ name });
        if (existing) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({status:false, message: "Category already exists" });
        }

        let imageData = {};
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: "categories",
            });
            imageData = { url: result.secure_url, public_id: result.public_id };
            fs.unlinkSync(req.file.path);
        }
     
        const slug = slugify(name);

        const category = await Category.create({
            name,
            slug,
            image: imageData,
        });

        res.status(201).json({
            message: "Category created successfully",
            category,
            status:true,
        });
    } catch (error) {
        console.error("Create category error:", error);
        res.status(500).json({status:false, message: error.message });
    }
};


export const getCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ createdAt: -1 });
        res.json(categories);
    } catch (error) {
        res.status(500).json({status:false, message: error.message });
    }
};


export const updateCategory = async (req, res) => {
    try {
        const { name } = req.body;
        const category = await Category.findById(req.params.id);

        if (!category) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(404).json({status:false, message: "Category not found" });
        }

        // Delete old image if new one uploaded
        if (req.file) {
            if (category.image?.public_id) {
                await cloudinary.uploader.destroy(category.image.public_id);
            }

            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: "categories",
            });
            category.image = {
                url: result.secure_url,
                public_id: result.public_id,
            };
            fs.unlinkSync(req.file.path);
        }

        if (name) category.name = name;
     
        const slug = slugify(name);
        if (name) category.slug = slug;
        await category.save();

        res.json({
            message: "Category updated successfully",
            category,
            status:true,
        });
    } catch (error) {
        console.error("Update category error:", error);
        res.status(500).json({ status:false,message: error.message });
    }
};


export const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({status:false, message: "Category not found" });
        }

        if (category.image?.public_id) {
            await cloudinary.uploader.destroy(category.image.public_id);
        }

        await category.deleteOne();

        res.json({status:true, message: "Category deleted successfully" });
    } catch (error) {
        console.error("Delete category error:", error);
        res.status(500).json({status:false, message: error.message });
    }
};
