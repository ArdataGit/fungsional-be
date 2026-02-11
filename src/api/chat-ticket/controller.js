const { PrismaClient } = require('@prisma/client');
const Joi = require('joi');
const { returnPagination } = require('#utils');
const { BadRequestError } = require('#errors');

const database = new PrismaClient();

const getMessages = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { skip = 0, take = 50 } = req.query;

    const ticket = await database.tickets.findUnique({
      where: { id: Number(ticketId) },
    });

    if (!ticket) {
      throw new BadRequestError('Ticket tidak ditemukan');
    }

    const messages = await database.$transaction([
      database.ChatTicket.findMany({
        where: { ticketId: Number(ticketId) },
        skip: Number(skip),
        take: Number(take),
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: { id: true, name: true, role: true },
          },
        },
      }),
      database.ChatTicket.count({ where: { ticketId: Number(ticketId) } }),
    ]);

    return returnPagination(req, res, messages);
  } catch (error) {
    next(error);
  }
};

const sendMessage = async (req, res, next) => {
  try {
    const schema = Joi.object({
      ticketId: Joi.number().required(),
      userId: Joi.number().required(),
      message: Joi.string().required(),
    });

    const validate = await schema.validateAsync(req.body);

    const ticket = await database.tickets.findUnique({
      where: { id: validate.ticketId },
    });

    if (!ticket) {
      throw new BadRequestError('Ticket tidak ditemukan');
    }

    const user = await database.User.findUnique({
      where: { id: validate.userId },
    });

    if (!user) {
      throw new BadRequestError('User tidak ditemukan');
    }

    const chatTicket = await database.ChatTicket.create({
      data: {
        ticketId: validate.ticketId,
        userId: validate.userId,
        message: validate.message,
      },
      include: {
        user: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    // Update updatedAt di ticket agar naik ke atas daftar
    await database.tickets.update({
      where: { id: validate.ticketId },
      data: { updatedAt: new Date() },
    });

    res.status(201).json({
      data: chatTicket,
      msg: 'Pesan terkirim',
    });
  } catch (error) {
    next(error);
  }
};

const removeMessage = async (req, res, next) => {
  try {
    const { id } = req.params;

    const isExist = await database.ChatTicket.findUnique({
      where: { id: Number(id) },
    });

    if (!isExist) {
      throw new BadRequestError('Pesan tidak ditemukan');
    }

    await database.ChatTicket.delete({
      where: { id: Number(id) },
    });

    res.status(200).json({
      msg: 'Berhasil menghapus pesan',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMessages,
  sendMessage,
  removeMessage,
};
