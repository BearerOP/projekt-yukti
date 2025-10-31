import express from 'express';
const router = express.Router();

router.get('/_status', (req, res) => {
  res.json({ ok: true, route: 'notifications' });
});

export default router;


