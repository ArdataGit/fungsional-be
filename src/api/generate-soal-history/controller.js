const database = require("#database");
const Joi = require("joi");
const moment = require("moment");
require("moment/locale/id");
moment.locale("id");
const { returnPagination, filterToJson } = require('#utils');

const getList = async (req, res, next) => {
    try {
        const schema = Joi.object({
            skip: Joi.number(),
            take: Joi.number(),
            sortBy: Joi.string(),
            descending: Joi.boolean(),
            filters: Joi.object(),
        }).unknown(true);

        const validate = await schema.validateAsync(req.query);
        const take = validate.take ? { take: validate.take } : {};
        const userId = req.user.id;

        const where = {
            userId: userId,
            ...filterToJson(validate),
        };

        const result = await database.$transaction([
            database.generateSoalHistory.findMany({
                ...take,
                skip: validate.skip,
                orderBy: validate.sortBy ? {
                    [validate.sortBy]: validate.descending ? 'desc' : 'asc',
                } : { createdAt: 'desc' },
                where: where,
            }),
            database.generateSoalHistory.count({
                where: where,
            }),
        ]);

        return returnPagination(req, res, result);
    } catch (error) {
        next(error);
    }
};

const generate = async (req, res, next) => {
    try {
        const schema = Joi.object({
            categoryId: Joi.number().required(),
            tingkatKesulitan: Joi.string().valid('mudah', 'sedang', 'sulit', 'campur').required(),
            jumlahSoal: Joi.number().required(),
            waktu: Joi.number().required(),
            kategori: Joi.string().required(), // Category Name
        });

        const validate = await schema.validateAsync(req.body);
        const userId = req.user.id; // Assuming user is authenticated

        // 1. Fetch Question Candidates
        let whereClause = {
            generateSoalCategoryId: validate.categoryId,
        };

        if (validate.tingkatKesulitan !== 'campur') {
            whereClause.tingkatkesulitansoal = validate.tingkatKesulitan;
        }

        const candidateSoal = await database.soalGenerateSoal.findMany({
            where: whereClause,
            select: { id: true }, // Only fetch IDs for randomness
        });

        if (candidateSoal.length < validate.jumlahSoal) {
            return res.status(400).json({
                message: `Jumlah soal tidak mencukupi (Tersedia: ${candidateSoal.length}, Diminta: ${validate.jumlahSoal})`,
            });
        }

        // 2. Randomize and Select
        const shuffled = candidateSoal.sort(() => 0.5 - Math.random());
        const selectedIds = shuffled.slice(0, validate.jumlahSoal).map(s => s.id);

        // 3. Fetch Full Details of Selected Questions
        const selectedSoals = await database.soalGenerateSoal.findMany({
            where: {
                id: { in: selectedIds },
            },
            include: {
                generateSoalCategory: true,
            }
        });

        // 4. Transaction: Create History & Details
        const result = await database.$transaction(async (tx) => {
            // Create History Header
            const history = await tx.generateSoalHistory.create({
                data: {
                    userId: userId,
                    name: `Latihan ${moment().format('DD MMMM YYYY HH:mm')}`,
                    kkm: 0, // Calculate or default?
                    jumlahSoal: validate.jumlahSoal,
                    tingkatKesulitan: validate.tingkatKesulitan,
                    kategori: validate.kategori,
                    waktu: validate.waktu,
                    score: 0,
                },
            });

            // Prepare Details Data
            const detailsData = selectedSoals.map(soal => ({
                generateSoalHistoryId: history.id,
                generateSoalCategoryId: soal.generateSoalCategoryId,
                soal: soal.soal,
                jawaban: soal.jawaban,
                jawabanShow: soal.jawabanShow || '', // Assuming these exist or handle defaults
                jawabanSelect: null, // Default not answered
                isCorrect: false,
                pembahasan: soal.pembahasan,
                point: soal.point,
                kkm: soal.kkm,
                maxPoint: soal.maxPoint,
                category: soal.category,
                categoryKet: soal.categoryKet,
                duration: 0,
                subCategory: soal.subCategory || '',
                tipePenilaian: soal.tipePenilaian,
                tingkatkesulitansoal: soal.tingkatkesulitansoal,
            }));

            // Bulk Insert Details
            await tx.generateSoalHistoryDetail.createMany({
                data: detailsData,
            });

            return history;
        });

        return res.status(200).json(result);

    } catch (error) {
        next(error);
    }
};

const getHistoryDetail = async (req, res, next) => {
    try {
        const { id } = req.params;
        const history = await database.generateSoalHistory.findUnique({
            where: { id: Number(id) },
            include: {
                GenerateSoalHistoryDetail: {
                    select: {
                        id: true,
                        jawabanSelect: true,
                        isCorrect: true,
                    },
                    orderBy: { id: 'asc' }
                }
            }
        });

        if (!history) {
            return res.status(404).json({ message: 'History not found' });
        }

        // Format for frontend
        const soalList = history.GenerateSoalHistoryDetail.map(detail => ({
            id: detail.id,
            isAnswer: detail.jawabanSelect !== null,
            status: detail.isCorrect ? 'BENAR' : (detail.jawabanSelect !== null ? 'SALAH' : 'BELUM_DIKERJAKAN'),
        }));

        return res.status(200).json({
            data: {
                ...history,
                soalId: soalList,
            }
        });
    } catch (error) {
        next(error);
    }
};

const getSoalDetail = async (req, res, next) => {
    try {
        const { id } = req.params;
        const detail = await database.generateSoalHistoryDetail.findUnique({
            where: { id: Number(id) },
        });

        if (!detail) {
            return res.status(404).json({ message: 'Soal not found' });
        }

        // Parse jawaban field if it's a string (JSON)
        let jawabanParsed = [];
        try {
            jawabanParsed = JSON.parse(detail.jawaban);
        } catch (e) {
            jawabanParsed = [];
        }

        return res.status(200).json({
            data: {
                ...detail,
                jawabanShow: jawabanParsed, // Backend stores JSON string, frontend expects object/array
            }
        });
    } catch (error) {
        next(error);
    }
};

const answer = async (req, res, next) => {
    try {
        const schema = Joi.object({
            id: Joi.number().required(),
            jawabanSelect: Joi.alternatives().try(Joi.string(), Joi.number()).allow(null),
        });
        const validate = await schema.validateAsync(req.body);

        const detail = await database.generateSoalHistoryDetail.findUnique({
            where: { id: validate.id },
        });

        if (!detail) {
            return res.status(404).json({ message: 'Soal not found' });
        }

        let isCorrect = false;
        let point = 0;

        // Verify answer
        try {
            const jawabanList = JSON.parse(detail.jawaban);
            const selected = jawabanList.find(j => j.id === validate.jawabanSelect);
            if (selected) {
                isCorrect = selected.isCorrect;
                // Use point from question or calculated? 
                // For now, let's assume simple 1 point or based on question data
                point = selected.point || (isCorrect ? detail.point : 0);
            }
        } catch (e) {
            console.error("Error parsing jawaban", e);
        }

        await database.generateSoalHistoryDetail.update({
            where: { id: validate.id },
            data: {
                jawabanSelect: validate.jawabanSelect !== null ? String(validate.jawabanSelect) : null,
                isCorrect,
                point, // Update the achievement point for this question
            },
        });

        return res.status(200).json({ message: 'Answer saved' });
    } catch (error) {
        console.error("[ERROR] Answer API:", error);
        next(error);
    }
};

const finish = async (req, res, next) => {
    try {
        const { id } = req.body; // History ID

        // Calculate total score
        const totalScore = await database.generateSoalHistoryDetail.aggregate({
            where: { generateSoalHistoryId: Number(id) },
            _sum: { point: true },
        });

        const history = await database.generateSoalHistory.update({
            where: { id: Number(id) },
            data: {
                score: totalScore._sum.point || 0,
            },
        });

         // Get stats per category for the result modal
         const categoryStats = await database.$queryRaw`
         SELECT 
             category,
             SUM(point) as all_point,
             SUM(maxPoint) as maxPoint,
             SUM(kkm) as kkm -- Assuming KKM is per question?? Or is it per mapel? Schema says detail has KKM.
         FROM GenerateSoalHistoryDetail
         WHERE generateSoalHistoryId = ${Number(id)}
         GROUP BY category
     `;

        return res.status(200).json({
            data: {
                ...history,
                pointCategory: categoryStats,
                point: totalScore._sum.point || 0,
                maxPoint: await database.generateSoalHistoryDetail.aggregate({
                    where: { generateSoalHistoryId: Number(id) },
                    _sum: { maxPoint: true },
                }).then(res => res._sum.maxPoint || 0)
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    generate,
    getList,
    getHistoryDetail,
    getSoalDetail,
    answer,
    finish,
};
