import express from "express";
import { shortenUrl } from "../controllers/urlController.js";

const router = express.Router();

router.post("/shorten", shortenUrl);

export default router;