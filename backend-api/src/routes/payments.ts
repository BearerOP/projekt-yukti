import express from 'express';
const router = express.Router();

router.get('/_status', (req, res) => {
  res.json({ ok: true, route: 'payments' });
});

export default router;


