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
        const userId = Number(req.user.id);
        const where = {
            ...filterToJson(validate),
            userId: userId,
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
        // Find all child categories for the given Parent Category ID
        const childCategories = await database.generateSoalCategory.findMany({
            where: {
                ParentGenerateSoalCategory: {
                    some: {
                        id: validate.categoryId
                    }
                }
            },
            select: { id: true }
        });

        const childCategoryIds = childCategories.map(c => c.id);

        if (childCategoryIds.length === 0) {
            return res.status(400).json({
                message: `Kategori ini belum memiliki sub-kategori atau soal.`,
            });
        }

        let whereClause = {
            generateSoalCategoryId: { in: childCategoryIds },
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
        const history = await database.generateSoalHistory.findFirst({
            where: { 
                id: Number(id),
                ...(req.user.role !== 'ADMIN' ? { userId: Number(req.user.id) } : {}),
            },
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
        const detail = await database.generateSoalHistoryDetail.findFirst({
            where: { 
                id: Number(id),
                ...(req.user.role !== 'ADMIN' ? { 
                    generateSoalHistory: {
                        userId: Number(req.user.id),
                    },
                } : {}),
            },
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

        const detail = await database.generateSoalHistoryDetail.findFirst({
            where: { 
                id: validate.id,
                generateSoalHistory: {
                    userId: Number(req.user.id),
                },
            },
        });

        if (!detail) {
            return res.status(404).json({ message: 'Soal not found' });
        }

        let isCorrect = false;
        let point = 0;

        // Verify answer
        try {
            const jawabanList = JSON.parse(detail.jawaban);
            const selected = jawabanList.find(j => String(j.id) === String(validate.jawabanSelect));
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

        const historyCheck = await database.generateSoalHistory.findFirst({
            where: { 
                id: Number(id),
                userId: Number(req.user.id),
            },
        });

        if (!historyCheck) {
            return res.status(404).json({ message: 'History not found or unauthorized' });
        }

        // Calculate correct count for normalized score
        const benarCount = await database.generateSoalHistoryDetail.count({
            where: { generateSoalHistoryId: Number(id), isCorrect: true },
        });

        // Calculate score based on user requirement: normalized to 100
        const calculatedScore = historyCheck.jumlahSoal > 0 ? (benarCount / historyCheck.jumlahSoal) * 100 : 0;

        const history = await database.generateSoalHistory.update({
            where: { id: Number(id) },
            data: {
                score: Math.round(calculatedScore), // Save normalized score
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

        // Get all details for the summary table
        const details = await database.generateSoalHistoryDetail.findMany({
            where: { generateSoalHistoryId: Number(id) },
            orderBy: { id: 'asc' },
        });

        // Format details for the frontend result table
        const formattedSummary = details.map(d => {
            let jawabanList = [];
            try {
                jawabanList = JSON.parse(d.jawaban);
            } catch (e) {}

            const selectedAnswer = jawabanList.find(j => String(j.id) === String(d.jawabanSelect));
            const correctAnswer = jawabanList.find(j => j.isCorrect);

            return {
                id: d.id,
                soal: d.soal,
                pembahasan: d.pembahasan,
                jawabanKamu: selectedAnswer ? selectedAnswer.value : (d.jawabanSelect ? d.jawabanSelect : '-'),
                kunci: correctAnswer ? correctAnswer.value : '-',
                status: d.isCorrect ? 'Benar' : 'Salah',
            };
        });

        // Calculate correct/incorrect counts
        // benarCount already calculated at line 298
        const salahCount = await database.generateSoalHistoryDetail.count({
            where: { generateSoalHistoryId: Number(id), isCorrect: false, jawabanSelect: { not: null } },
        });
        const kosongCount = await database.generateSoalHistoryDetail.count({
            where: { generateSoalHistoryId: Number(id), jawabanSelect: null },
        });

        // calculatedScore already calculated at line 303

        return res.status(200).json({
            data: {
                ...history,
                pointCategory: categoryStats,
                point: totalScore._sum.point || 0,
                maxPoint: await database.generateSoalHistoryDetail.aggregate({
                    where: { generateSoalHistoryId: Number(id) },
                    _sum: { maxPoint: true },
                }).then(res => res._sum.maxPoint || 0),
                summaryTable: formattedSummary,
                benarCount,
                salahCount,
                kosongCount,
                calculatedScore: Math.round(calculatedScore),
            }
        });
    } catch (error) {
        next(error);
    }
};

const getStatistic = async (req, res, next) => {
    try {
        const { id } = req.params; // History ID

        const history = await database.generateSoalHistory.findFirst({
            where: { 
                id: Number(id),
                ...(req.user.role !== 'ADMIN' ? { userId: Number(req.user.id) } : {}),
            },
        });

        if (!history) {
            return res.status(404).json({ message: 'History not found or unauthorized' });
        }

        // Calculate total score from details
        const totalScore = await database.generateSoalHistoryDetail.aggregate({
            where: { generateSoalHistoryId: Number(id) },
            _sum: { point: true },
        });

         // Get stats per category for the result UI
         const categoryStats = await database.$queryRaw`
         SELECT 
             category,
             SUM(point) as all_point,
             SUM(maxPoint) as maxPoint,
             SUM(kkm) as kkm
         FROM GenerateSoalHistoryDetail
         WHERE generateSoalHistoryId = ${Number(id)}
         GROUP BY category
     `;

        // Get all details for the summary table
        const details = await database.generateSoalHistoryDetail.findMany({
            where: { generateSoalHistoryId: Number(id) },
            orderBy: { id: 'asc' },
        });

        // Format details for the frontend result table
        const formattedSummary = details.map(d => {
            let jawabanList = [];
            try {
                jawabanList = JSON.parse(d.jawaban);
            } catch (e) {}

            const selectedAnswer = jawabanList.find(j => String(j.id) === String(d.jawabanSelect));
            const correctAnswer = jawabanList.find(j => j.isCorrect);

            return {
                id: d.id,
                soal: d.soal,
                pembahasan: d.pembahasan,
                jawabanKamu: selectedAnswer ? selectedAnswer.value : (d.jawabanSelect ? d.jawabanSelect : '-'),
                kunci: correctAnswer ? correctAnswer.value : '-',
                status: d.isCorrect ? 'Benar' : 'Salah',
            };
        });

        // Calculate correct/incorrect counts
        const benarCount = await database.generateSoalHistoryDetail.count({
            where: { generateSoalHistoryId: Number(id), isCorrect: true },
        });
        const salahCount = await database.generateSoalHistoryDetail.count({
            where: { generateSoalHistoryId: Number(id), isCorrect: false, jawabanSelect: { not: null } },
        });
        const kosongCount = await database.generateSoalHistoryDetail.count({
            where: { generateSoalHistoryId: Number(id), jawabanSelect: null },
        });

        // Calculate score based on user requirement: normalized to 100
        const calculatedScore = history.jumlahSoal > 0 ? (benarCount / history.jumlahSoal) * 100 : 0;

        return res.status(200).json({
            data: {
                ...history,
                pointCategory: categoryStats,
                point: totalScore._sum.point || 0,
                maxPoint: await database.generateSoalHistoryDetail.aggregate({
                    where: { generateSoalHistoryId: Number(id) },
                    _sum: { maxPoint: true },
                }).then(res => res._sum.maxPoint || 0),
                summaryTable: formattedSummary,
                benarCount,
                salahCount,
                kosongCount,
                calculatedScore: Math.round(calculatedScore),
            }
        });
    } catch (error) {
        next(error);
    }
};

const adminGetList = async (req, res, next) => {
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
        const where = {
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
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
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

const remove = async (req, res, next) => {
    try {
        const { id } = req.params;
        await database.generateSoalHistory.delete({
            where: { id: Number(id) }
        });
        return res.status(200).json({ message: 'History deleted' });
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
    getStatistic,
    adminGetList,
    remove,
};
