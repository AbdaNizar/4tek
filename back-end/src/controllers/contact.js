const ContactRequest = require('../models/contactRequest');

exports.create = async (req, res) => {
    try {
        const { fullName, email, phone, message, website } = req.body; // website = honeypot
        if (website) return res.status(200).json({ ok: true }); // bot: on "réussit" silencieusement
        if (!fullName || fullName.length < 2 || fullName.length > 100)
            return res.status(400).json({ error: 'Nom invalide' });
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            return res.status(400).json({ error: 'Email invalide' });
        if (!message || message.length < 10 || message.length > 1000)
            return res.status(400).json({ error: 'Message invalide' });

        const doc = await ContactRequest.create({
            fullName, email, phone: phone || '', message,
            userId: req.user?.id || null,
            hp: website || ''
        });

        res.json({ ok: true, id: doc._id });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.list = async (req, res) => {
    try {
        const page  = Math.max(1, parseInt(req.query.page || '1', 10));
        const limit = Math.min(50, Math.max(5, parseInt(req.query.limit || '10', 10)));
        const q     = (req.query.q || '').trim();
        const status= (req.query.status || '').trim();

        const filter = {};
        if (q) {
            filter.$or = [
                { fullName: { $regex: q, $options: 'i' } },
                { email:    { $regex: q, $options: 'i' } },
                { phone:    { $regex: q, $options: 'i' } },
                { message:  { $regex: q, $options: 'i' } },
            ];
        }
        if (status) filter.status = status;

        const [items, total] = await Promise.all([
            ContactRequest.find(filter)
                .populate('userId', 'avatar')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            ContactRequest.countDocuments(filter)
        ]);

        res.json({ items, pages: Math.ceil(total / limit) });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getOne = async (req, res) => {
    try {
        const doc = await ContactRequest.findById(req.params.id).lean();
        if (!doc) return res.status(404).json({ error: 'Not found' });
        res.json(doc);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.update = async (req, res) => {
    try {
        const { status, notes } = req.body;
        const allowed = {};
        if (status) allowed.status = status;
        if (typeof notes === 'string') allowed.notes = notes;

        const doc = await ContactRequest.findByIdAndUpdate(
            req.params.id,
            { $set: { ...allowed, handledBy: req.user?.id || null } },
            { new: true }
        ).lean();

        if (!doc) return res.status(404).json({ error: 'Not found' });
        res.json(doc);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
};
