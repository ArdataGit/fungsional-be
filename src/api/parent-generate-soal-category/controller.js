const Joi = require('joi');
const database = require('#database');
const { returnPagination, filterToJson } = require('#utils');
const { BadRequestError } = require('#errors');

const get = async (req, res, next) => {
  try {
    const schema = Joi.object({
      skip: Joi.number(),
      take: Joi.number(),
      sortBy: Joi.string(),
      descending: Joi.boolean(),
      filters: Joi.object(),
    }).unknown(true);

    console.log('DEBUG: parentGenerateSoalCategory get called');
    console.log('DEBUG: Query:', req.query);

    const validate = await schema.validateAsync(req.query);
    const take = validate.take ? { take: validate.take } : {};

    const result = await database.$transaction([
      database.parentGenerateSoalCategory.findMany({
        ...take,
        skip: validate.skip,
        orderBy: validate.sortBy ? {
          [validate.sortBy]: validate.descending ? 'desc' : 'asc',
        } : undefined,
        where: filterToJson(validate),
      }),
      database.parentGenerateSoalCategory.count({
        where: filterToJson(validate),
      }),
    ]);

    console.log('DEBUG: ParentGenerateSoalCategory GET Result Table:', result[0].length, 'items');

    return returnPagination(req, res, result);
  } catch (error) {
    next(error);
  }
};

const find = async (req, res, next) => {
  try {
    const schema = Joi.object({
      id: Joi.number().required(),
    });

    const validate = await schema.validateAsync(req.params);

    const result = await database.parentGenerateSoalCategory.findUnique({
      where: {
        id: validate.id,
      },
    });

    if (!result) throw new BadRequestError('Parent Category not found');

    res.status(200).json({
      data: result,
      msg: 'Get data by id',
    });
  } catch (error) {
    next(error);
  }
};

const insert = async (req, res, next) => {
  try {
    const schema = Joi.object({
      name: Joi.string().required(),
      kkm: Joi.number().required(),
    });

    const validate = await schema.validateAsync(req.body);

    const result = await database.parentGenerateSoalCategory.create({
      data: validate,
    });

    res.status(200).json({
      data: result,
      msg: 'Successfully added Parent Generate Soal Category',
    });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const schema = Joi.object({
      id: Joi.number().required(),
      name: Joi.string().required(),
      kkm: Joi.number().required(),
    }).unknown(true);

    const validate = await schema.validateAsync({
      ...req.body,
      ...req.params,
    });

    const isExist = await database.parentGenerateSoalCategory.findUnique({
      where: {
        id: validate.id,
      },
    });

    if (!isExist) throw new BadRequestError('Parent Category not found');

    const result = await database.parentGenerateSoalCategory.update({
      where: {
        id: validate.id,
      },
      data: {
        name: validate.name,
        kkm: validate.kkm,
      },
    });

    res.status(200).json({
      data: result,
      msg: 'Successfully updated Parent Generate Soal Category',
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

    const isExist = await database.parentGenerateSoalCategory.findUnique({
      where: {
        id: validate.id,
      },
      include: {
        GenerateSoalCategory: true
      }
    });

    if (!isExist) throw new BadRequestError('Parent Category not found');
    
    // Optional: Check if it has children and prevent delete or cascade? 
    // Prisma onDelete: Cascade should handle it if defined, but we can be explicit.

    const result = await database.parentGenerateSoalCategory.delete({
      where: {
        id: validate.id,
      },
    });

    res.status(200).json({
      data: result,
      msg: 'Successfully deleted Parent Generate Soal Category',
    });
  } catch (error) {
    next(error);
  }
};

// Triggering restart for prisma client sync
module.exports = {
  get,
  find,
  insert,
  update,
  remove,
};
