import express from "express";
import { getDiscoverFeed } from "../controllers/discoverController.js";

const router = express.Router();

router.get("/", getDiscoverFeed);

export default router;
