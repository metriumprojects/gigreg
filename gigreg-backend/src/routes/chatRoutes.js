import express from "express";

import { protect } from "../middleware/authMiddleware.js";
import {
  connectUser,
  getMessages,
  startChat,
  sendMessage,
  updateQuoteMessage,
} from "../controllers/chatController.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = express.Router();


router.get("/connected-users",protect, connectUser);
// GET /chat/messages/:roomId?before=TIMESTAMP&limit=20

router.get("/messages/:roomId",protect, getMessages);
router.post(
  "/messages",
  protect,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "images", maxCount: 6 },
  ]),
  sendMessage
);
router.patch("/messages/:messageId/quote", protect, updateQuoteMessage);
router.post("/start", protect, startChat);
export default router;
