const Joi = require('joi');
const { BadRequestError } = require('#errors');
const database = require('#database');

const getWhatsappAdmins = async (req, res, next) => {
  try {
    const list = await database.whatsappAdmin.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json({ 
      data: {
        list,
        pagination: { total: list.length }
      }
    });
  } catch (error) {
    next(error);
  }
};

const createWhatsappAdmin = async (req, res, next) => {
  try {
    const schema = Joi.object({
      nomor: Joi.string().required(),
    });

    const validate = await schema.validateAsync(req.body, { stripUnknown: true });

    const data = await database.whatsappAdmin.create({
      data: validate,
    });

    res.status(201).json({ data, msg: 'Nomor WhatsApp berhasil ditambahkan' });
  } catch (error) {
    next(error);
  }
};

const updateWhatsappAdmin = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const schema = Joi.object({
      nomor: Joi.string().required(),
    });

    const validate = await schema.validateAsync(req.body, { stripUnknown: true });

    const isExist = await database.whatsappAdmin.findUnique({ where: { id } });
    if (!isExist) throw new BadRequestError('Nomor WhatsApp tidak ditemukan');

    const data = await database.whatsappAdmin.update({
      where: { id },
      data: validate,
    });

    res.status(200).json({ data, msg: 'Nomor WhatsApp berhasil diperbarui' });
  } catch (error) {
    next(error);
  }
};

const deleteWhatsappAdmin = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    const isExist = await database.whatsappAdmin.findUnique({ where: { id } });
    if (!isExist) throw new BadRequestError('Nomor WhatsApp tidak ditemukan');

    await database.whatsappAdmin.delete({ where: { id } });

    res.status(200).json({ msg: 'Nomor WhatsApp berhasil dihapus' });
  } catch (error) {
    next(error);
  }
};

const getPublicWhatsapp = async (req, res, next) => {
  try {
    const data = await database.whatsappAdmin.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWhatsappAdmins,
  createWhatsappAdmin,
  updateWhatsappAdmin,
  deleteWhatsappAdmin,
  getPublicWhatsapp,
};
