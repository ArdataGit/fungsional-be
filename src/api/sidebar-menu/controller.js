const Joi = require('joi');
const { BadRequestError } = require('#errors');

const database = require('#database');

const getSidebarMenus = async (req, res, next) => {
  try {
    console.log('[DEBUG] getSidebarMenus called');
    const menus = await database.sidebarMenu.findMany({
      orderBy: { order: 'asc' },
    });
    console.log('[DEBUG] menus fetched:', menus);
    res.status(200).json({ 
      data: {
        list: menus,
        pagination: { total: menus.length }
      }
    });
  } catch (error) {
    console.error('[DEBUG] Error in getSidebarMenus:', error);
    next(error);
  }
};

const updateSidebarMenu = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const schema = Joi.object({
      title: Joi.string().optional(),
      isActive: Joi.boolean().optional(),
      hasBadge: Joi.boolean().optional(),
      order: Joi.number().optional(),
    });

    const validate = await schema.validateAsync(req.body, { stripUnknown: true });

    const isExist = await database.sidebarMenu.findUnique({ where: { id } });
    if (!isExist) throw new BadRequestError('Menu tidak ditemukan');

    const menu = await database.sidebarMenu.update({
      where: { id },
      data: validate,
    });

    res.status(200).json({ data: menu, msg: 'Menu berhasil diperbarui' });
  } catch (error) {
    next(error);
  }
};

const createSidebarMenu = async (req, res, next) => {
  try {
    const schema = Joi.object({
      title: Joi.string().required(),
      link: Joi.string().required(),
      icon: Joi.string().required(),
      isActive: Joi.boolean().default(true),
      hasBadge: Joi.boolean().default(false),
      order: Joi.number().default(0),
    });

    const validate = await schema.validateAsync(req.body, { stripUnknown: true });

    const menu = await database.sidebarMenu.create({
      data: validate,
    });

    res.status(201).json({ data: menu, msg: 'Menu berhasil dibuat' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSidebarMenus,
  updateSidebarMenu,
  createSidebarMenu,
};
