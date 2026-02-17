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

    console.log('DEBUG: generateSoalCategory get called');
    console.log('DEBUG: Query:', req.query);

    const validate = await schema.validateAsync(req.query);
    const take = validate.take ? { take: validate.take } : {};

    const result = await database.$transaction([
      database.generateSoalCategory.findMany({
        ...take,
        skip: validate.skip,
        orderBy: validate.sortBy ? {
          [validate.sortBy]: validate.descending ? 'desc' : 'asc',
        } : undefined,
        where: filterToJson(validate),
      }),
      database.generateSoalCategory.count({
        where: filterToJson(validate),
      }),
    ]);

    console.log('GenerateSoalCategory GET Result:', JSON.stringify(result, null, 2));

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

    const result = await database.generateSoalCategory.findUnique({
      where: {
        id: validate.id,
      },
    });

    if (!result) throw new BadRequestError('Category not found');

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
      parentIds: Joi.array().items(Joi.number()).optional(),
    });

    const validate = await schema.validateAsync(req.body);
    const { parentIds, ...data } = validate;

    const result = await database.generateSoalCategory.create({
      data: {
        ...data,
        ParentGenerateSoalCategory: parentIds ? {
          connect: parentIds.map(id => ({ id }))
        } : undefined
      },
    });

    res.status(200).json({
      data: result,
      msg: 'Successfully added Generate Soal Category',
    });
  } catch (error) {
    console.error('Error in insert:', error);
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const schema = Joi.object({
      id: Joi.number().required(),
      name: Joi.string().required(),
      kkm: Joi.number().required(),
      parentIds: Joi.array().items(Joi.number()).optional(),
    }).unknown(true);

    const validate = await schema.validateAsync({
      ...req.body,
      ...req.params,
    });

    const isExist = await database.generateSoalCategory.findUnique({
      where: {
        id: validate.id,
      },
    });

    if (!isExist) throw new BadRequestError('Category not found');

    const result = await database.generateSoalCategory.update({
      where: {
        id: validate.id,
      },
      data: {
        name: validate.name,
        kkm: validate.kkm,
        ParentGenerateSoalCategory: validate.parentIds ? {
          set: validate.parentIds.map(id => ({ id }))
        } : undefined,
      },
    });

    res.status(200).json({
      data: result,
      msg: 'Successfully updated Generate Soal Category',
    });
  } catch (error) {
    console.error('Error in update:', error);
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const schema = Joi.object({
      id: Joi.number().required(),
    });

    const validate = await schema.validateAsync(req.params);

    const isExist = await database.generateSoalCategory.findUnique({
      where: {
        id: validate.id,
      },
    });

    if (!isExist) throw new BadRequestError('Category not found');

    const result = await database.generateSoalCategory.delete({
      where: {
        id: validate.id,
      },
    });

    res.status(200).json({
      data: result,
      msg: 'Successfully deleted Generate Soal Category',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  get,
  find,
  insert,
  update,
  remove,
};
