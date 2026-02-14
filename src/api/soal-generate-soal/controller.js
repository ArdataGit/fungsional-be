const Joi = require('joi');
const database = require('#database');
const { returnPagination, returnError } = require('#utils');
const { BadRequestError } = require('#errors');

const get = async (req, res, next) => {
  try {
    const schema = Joi.object({
      categoryId: Joi.number().required(),
      skip: Joi.number().default(0),
      take: Joi.number().default(100),
      search: Joi.string().allow('', null).optional(),
    });

    const validate = await schema.validateAsync(req.query);

    const whereClause = {
      generateSoalCategoryId: validate.categoryId,
    };

    if (validate.search) {
      whereClause.soal = {
        contains: validate.search,
      };
    }

    const result = await database.$transaction([
      database.soalGenerateSoal.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'asc',
        },
        skip: validate.skip,
        take: validate.take,
      }),
      database.soalGenerateSoal.count({
        where: whereClause,
      }),
    ]);
    
    console.log(`GET Soal for CatID ${validate.categoryId}: Found ${result[0].length} items (Total: ${result[1]})`);

    // Parse jawaban from JSON string
    const parsedList = result[0].map((item) => {
      try {
        return {
          ...item,
          jawaban: typeof item.jawaban === 'string' ? JSON.parse(item.jawaban || '[]') : item.jawaban,
        };
      } catch (e) {
        console.error(`Error parsing jawaban for id ${item.id}:`, e);
        return {
          ...item,
          jawaban: [],
        };
      }
    });

    returnPagination(req, res, [parsedList, result[1]]);
  } catch (error) {
    next(error);
  }
};

const find = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await database.soalGenerateSoal.findUnique({
      where: { id: parseInt(id) },
    });

    if (!result) throw new BadRequestError('Soal not found');

    // Parse jawaban
    result.jawaban = JSON.parse(result.jawaban || '[]');

    res.status(200).json({
      data: result,
      msg: 'Get detail success',
    });
  } catch (error) {
    next(error);
  }
};

const insert = async (req, res, next) => {
  try {
    const schema = Joi.object({
      categoryId: Joi.number().required(),
      soal: Joi.string().required(),
      pembahasan: Joi.string().allow('', null),
      jawaban: Joi.array().items(
        Joi.object({
          id: Joi.any(),
          value: Joi.string().allow('', null),
          isCorrect: Joi.boolean(),
          point: Joi.number(),
          isDeleted: Joi.boolean().optional(),
          isUpdate: Joi.boolean().optional(),
        })
      ).required(),
      subCategory: Joi.string().allow('', null),
      tingkatkesulitansoal: Joi.string().valid('mudah', 'sedang', 'sulit').default('mudah'),
    });

    const validate = await schema.validateAsync(req.body);

    // Determine jawabanSelect (id/index of correct answer) if needed, 
    // or just rely on isCorrect in the JSON. 
    // The schema has jawabanSelect Int. Let's find the correct answer's ID.
    const correctAnswer = validate.jawaban.find(j => j.isCorrect);
    const jawabanSelect = correctAnswer ? correctAnswer.id : -1;

    // Calculate max point (sum of points or max single point depending on logic)
    // Assuming simple logic for now
    const point = validate.jawaban.reduce((max, curr) => (curr.point > max ? curr.point : max), 0);

    const data = {
      generateSoalCategoryId: validate.categoryId,
      soal: validate.soal,
      pembahasan: validate.pembahasan || '',
      jawaban: JSON.stringify(validate.jawaban), // Store as JSON string
      jawabanShow: '', // Optional/Legacy?
      jawabanSelect: parseInt(jawabanSelect) || 0,
      isCorrect: false, // Default
      point: point,
      subCategory: validate.subCategory || '',
      category: '', // Legacy/Unused?
      categoryKet: '', // Legacy/Unused?
      tingkatkesulitansoal: validate.tingkatkesulitansoal,
    };

    const result = await database.soalGenerateSoal.create({
      data,
    });

    res.status(200).json({
      data: result,
      msg: 'Insert success',
    });
  } catch (error) {
    console.error('Error insert soal:', error);
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schema = Joi.object({
      categoryId: Joi.number().required(),
      soal: Joi.string().required(),
      pembahasan: Joi.string().allow('', null),
      jawaban: Joi.array().items(
        Joi.object({
          id: Joi.any(),
          value: Joi.string().allow('', null),
          isCorrect: Joi.boolean(),
          point: Joi.number(),
          isDeleted: Joi.boolean().optional(),
          isUpdate: Joi.boolean().optional(),
        })
      ).required(),
      subCategory: Joi.string().allow('', null),
      tingkatkesulitansoal: Joi.string().valid('mudah', 'sedang', 'sulit').allow(null),
    }).unknown(true);

    const validate = await schema.validateAsync(req.body);

    const correctAnswer = validate.jawaban.find(j => j.isCorrect);
    const jawabanSelect = correctAnswer ? correctAnswer.id : -1;
     const point = validate.jawaban.reduce((max, curr) => (curr.point > max ? curr.point : max), 0);


    const data = {
      soal: validate.soal,
      pembahasan: validate.pembahasan || '',
      jawaban: JSON.stringify(validate.jawaban),
      jawabanSelect: parseInt(jawabanSelect) || 0,
       point: point,
        subCategory: validate.subCategory || '',
    };

    if (validate.tingkatkesulitansoal) {
      data.tingkatkesulitansoal = validate.tingkatkesulitansoal;
    }

    const result = await database.soalGenerateSoal.update({
      where: { id: parseInt(id) },
      data,
    });

    res.status(200).json({
      data: result,
      msg: 'Update success',
    });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await database.soalGenerateSoal.delete({
      where: { id: parseInt(id) },
    });
    res.status(200).json({
      msg: 'Delete success',
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
