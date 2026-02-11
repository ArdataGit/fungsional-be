const Joi = require('joi');

const database = require('#database');
const { returnPagination, filterToJson } = require('#utils');
const { BadRequestError } = require('#errors');

const get = async (req, res, next) => {
  try {
    const schema = Joi.object({
      skip: Joi.number().default(0),
      take: Joi.number().default(10),
      sortBy: Joi.string().default('createdAt'),
      descending: Joi.boolean().default(true),
      filters: Joi.object(),
    }).unknown(true);

    const validate = await schema.validateAsync(req.query);

    const take = validate.take ? { take: validate.take } : {};

    const result = await database.$transaction([
      database.testimoni.findMany({
        ...take,
        skip: validate.skip,
        orderBy: {
          [validate.sortBy]: validate.descending ? 'desc' : 'asc',
        },
        where: {
          ...filterToJson(validate),
        },
      }),
      database.testimoni.count({
        where: filterToJson(validate),
      }),
    ]);

    // Return raw data usually, or map if needed.
    // Switching to 'isi' based on user request.
    return returnPagination(req, res, result);
  } catch (error) {
    next(error);
  }
};

const insert = async (req, res, next) => {
  try {
    const schema = Joi.object({
      nama: Joi.string().required(),
      pekerjaan: Joi.string().required(),
      rating: Joi.number().min(1).max(5).required(),
      isi: Joi.string().required(),
    });

    const validate = await schema.validateAsync(req.body);

    const result = await database.testimoni.create({
      data: {
        nama: validate.nama,
        pekerjaan: validate.pekerjaan,
        rating: validate.rating,
        isi: validate.isi,
      },
    });

    res.status(200).json({
      data: result,
      msg: 'Berhasil menambahkan Testimoni',
    });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const schema = Joi.object({
      id: Joi.number().required(),
      nama: Joi.string(),
      pekerjaan: Joi.string(),
      rating: Joi.number().min(1).max(5),
      isi: Joi.string(),
    });

    const validate = await schema.validateAsync(
      {
        ...req.body,
        ...req.params,
      },
      {
        stripUnknown: true,
      }
    );

    const isExist = await database.testimoni.findUnique({
      where: {
        id: validate.id,
      },
    });

    if (!isExist) throw new BadRequestError('Testimoni tidak ditemukan');

    const updateData = {};
    if (validate.nama) updateData.nama = validate.nama;
    if (validate.pekerjaan) updateData.pekerjaan = validate.pekerjaan;
    if (validate.rating) updateData.rating = validate.rating;
    if (validate.isi) updateData.isi = validate.isi;

    const result = await database.testimoni.update({
      where: {
        id: validate.id,
      },
      data: updateData,
    });

    res.status(200).json({
      data: result,
      msg: 'Berhasil mengubah data testimoni',
    });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const schema = Joi.object({
      id: Joi.number().required(),
    });

    const validate = await schema.validateAsync(req.params);

    const isExist = await database.testimoni.findUnique({
      where: {
        id: validate.id,
      },
    });

    if (!isExist) throw new BadRequestError('Testimoni tidak ditemukan');

    const result = await database.testimoni.delete({
      where: {
        id: validate.id,
      },
    });

    res.status(200).json({
      data: result,
      msg: 'Berhasil menghapus testimoni',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  get,
  insert,
  update,
  remove,
};
