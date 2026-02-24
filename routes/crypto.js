// routes/economy.js
const router = require("express").Router();
const ctrl = require("../controllers/economyController");
const { requireAuth } = require("../middleware/auth");
const { gameLimiter } = require("../middleware/rateLimiter");
const {
  betRules,
  transferRules,
  handleValidation,
} = require("../middleware/validate");

// Semua route membutuhkan login
router.use(requireAuth);
module.exports = router;
// fetch realtime market

router.get("/market", ctrl.getMarket);
router.post("/buy", ctrl.buyCrypto);
router.post("/sell", ctrl.sellCrypto);
router.post("/margin", ctrl.marginCrypto);
router.post("/paydebt", ctrl.paydeptCrypto);
router.post("/portfolio", ctrl.portofolioCrypto);
