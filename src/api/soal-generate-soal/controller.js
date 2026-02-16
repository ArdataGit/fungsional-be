const path = require('path');
const Joi = require('joi');
const ExcelJS = require('exceljs');
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
      tingkatkesulitansoal: Joi.string().valid('mudah', 'sedang', 'sulit').default('mudah'),
    });

    const validate = await schema.validateAsync(req.body);

    // Determine jawabanSelect (id/index of correct answer) if needed, 
    // or just rely on isCorrect in the JSON. 
    // The schema has jawabanSelect Int. Let's find the correct answer's ID.
    const correctAnswer = validate.jawaban.find(j => j.isCorrect);
    const jawabanSelect = correctAnswer ? correctAnswer.id : -1;

    const data = {
      generateSoalCategoryId: validate.categoryId,
      soal: validate.soal,
      pembahasan: validate.pembahasan || '',
      jawaban: JSON.stringify(validate.jawaban), // Store as JSON string
      jawabanShow: '', // Optional/Legacy?
      jawabanSelect: parseInt(jawabanSelect) || 0,
      isCorrect: false, // Default
      point: 0,
      subCategory: '',
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
      point: 0,
      subCategory: '',
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
const fs = require('fs');

const logDebug = (msg) => {
    fs.appendFileSync(path.resolve(process.cwd(), 'debug_import.log'), `${new Date().toISOString()} - ${typeof msg === 'object' ? JSON.stringify(msg) : msg}\n`);
};

const importSoal = async (req, res, next) => {
    try {
        const { categoryId } = req.body;
        if (!req.file) {
            throw new BadRequestError('File is required');
        }

        const workbook = new ExcelJS.Workbook();
        if (req.file.mimetype === 'text/csv') {
            await workbook.csv.readFile(path.resolve(process.cwd(), req.file.path), {
                parserOptions: {
                    delimiter: ';',
                    quote: '"'
                }
            });
        } else {
            await workbook.xlsx.readFile(path.resolve(process.cwd(), req.file.path));
        }
        
        const worksheet = workbook.getWorksheet(1) || workbook.worksheets[0];
        const dataToInsert = [];

        logDebug(`Worksheet found: ${!!worksheet}`);
        logDebug(`CategoryId: ${categoryId}`);

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header

            const soal = row.getCell(1).value?.toString() || '';
            const pembahasan = row.getCell(2).value?.toString() || '';
            const tingkatkesulitan = (row.getCell(3).value?.toString() || 'mudah').toLowerCase();

            const jawaban = [];
            let jawabanSelect = 0;

            // Mapping for 5 options (2 columns per option: Text and isCorrect)
            for (let i = 0; i < 5; i++) {
                const colIdx = 4 + (i * 2);
                const value = row.getCell(colIdx).value?.toString() || '';
                const isCorrect = String(row.getCell(colIdx + 1).value).toUpperCase() === 'TRUE';

                if (value) {
                    const jawObj = {
                        id: i,
                        value: value,
                        isCorrect: isCorrect,
                    };
                    jawaban.push(jawObj);
                    if (isCorrect) jawabanSelect = i;
                }
            }

            logDebug(`Row ${rowNumber} parsed: ${JSON.stringify({ soal, jawabanCount: jawaban.length })}`);

            if (soal && jawaban.length > 0) {
                const item = {
                    generateSoalCategoryId: parseInt(categoryId) || 0,
                    soal,
                    pembahasan,
                    jawaban: JSON.stringify(jawaban),
                    jawabanSelect: parseInt(jawabanSelect) || 0,
                    point: 0,
                    subCategory: '',
                    tingkatkesulitansoal: ['mudah', 'sedang', 'sulit'].includes(tingkatkesulitan) ? tingkatkesulitan : 'mudah',
                    isCorrect: false,
                    jawabanShow: '',
                    category: '',
                    categoryKet: ''
                };
                logDebug(`Adding to insert batch: ${item.soal.substring(0, 20)}`);
                dataToInsert.push(item);
            }
        });

        logDebug(`Total items to insert: ${dataToInsert.length}`);

        if (dataToInsert.length > 0) {
            const results = await database.soalGenerateSoal.createMany({
                data: dataToInsert
            });
            logDebug(`Prisma insert result: ${JSON.stringify(results)}`);
        }

        res.status(200).json({
            msg: `Successfully imported ${dataToInsert.length} questions`,
        });
    } catch (error) {
        console.error('Error import soal:', error);
        next(error);
    }
};

module.exports = {
  get,
  find,
  insert,
  update,
  remove,
  importSoal,
};
