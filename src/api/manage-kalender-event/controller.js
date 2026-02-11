const Joi = require('joi');

const database = require('#database');
const { returnPagination, deleteFile, filterToJson } = require('#utils');
const { BadRequestError } = require('#errors');

const get = async (req, res, next) => {
    try {
        const schema = Joi.object({
            skip: Joi.number(),
            take: Joi.number(),
            sortBy: Joi.string(),
            descending: Joi.boolean(),
            filters: Joi.object(),
        });

        const validate = await schema.validateAsync(req.query);

        const result = await database.$transaction([
            database.kalenderEvent.findMany({
                skip: validate.skip,
                take: validate.take,
                orderBy: {
                    [validate.sortBy]: validate.descending ? 'desc' : 'asc',
                },
                where: {
                    ...filterToJson(validate),
                },
            }),
            database.kalenderEvent.count({
                where: {
                    ...filterToJson(validate),
                },
            }),
        ]);

        return returnPagination(req, res, result);
    } catch (error) {
        next(error);
    }
}


const find = async (req, res, next) => {
    try {
        const schema = Joi.object({
            id: Joi.number().required(),
        });

        const validate = await schema.validateAsync(req.params);

        const result = await database.kalenderEvent.findUnique({
            where: {
                id: validate.id,
            },
        });

        if (!result) throw new BadRequestError('Event tidak ditemukan');

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
            nama: Joi.string().required(),
            keterangan: Joi.string().allow(null, ''),
            startDate: Joi.date().required(),
            endDate: Joi.date().required(),
            gambar: Joi.string().allow(null, '').strip(),
        });

        const validate = await schema.validateAsync(req.body);

        const result = await database.kalenderEvent.create({
            data: validate,
        });

        res.status(200).json({
            data: result,
            msg: 'Berhasil menambahkan event',
        });
    } catch (error) {
        next(error);
    }
};

const update = async (req, res, next) => {
    try {
        const schema = Joi.object({
            nama: Joi.string().required(),
            keterangan: Joi.string().allow(null, ''),
            startDate: Joi.date().required(),
            endDate: Joi.date().required(),
            gambar: Joi.string().allow(null, '').strip(),
            id: Joi.number().required(),
        });

        const validate = await schema.validateAsync({
            ...req.params,
            ...req.body,
        });

        const isExist = await database.kalenderEvent.findUnique({
            where: {
                id: validate.id,
            },
        });

        if (!isExist) throw new BadRequestError('Event tidak ditemukan');

        const result = await database.kalenderEvent.update({
            where: {
                id: validate.id,
            },
            data: validate,
        });

        res.status(200).json({
            data: result,
            msg: 'Berhasil mengubah data event',
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

        const isExist = await database.kalenderEvent.findUnique({
            where: {
                id: validate.id,
            },
        });

        if (!isExist) throw new BadRequestError('Event tidak ditemukan');

        const result = await database.kalenderEvent.delete({
            where: {
                id: validate.id,
            },
        });

        res.status(200).json({
            data: result,
            msg: 'Berhasil menghapus data event',
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
}
