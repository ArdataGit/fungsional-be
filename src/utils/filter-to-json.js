const isNumeric = (val) => {
  return !isNaN(parseFloat(val)) && isFinite(val);
};

const convertRecursive = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    if (typeof obj === 'string' && isNumeric(obj)) {
      return Number(obj);
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(convertRecursive);
  }

  const newObj = {};
  for (const key in obj) {
    newObj[key] = convertRecursive(obj[key]);
  }
  return newObj;
};

const filterToJson = (validate) => {
  if (!validate.filters) return {};

  const result = Object.keys(validate.filters).reduce((acc, key) => {
    const value = validate.filters[key];

    if (key === 'parentId' || key === 'id') {
      acc[key] = Number(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // If it's an object (like relation filter), convert numbers recursively and pass it to Prisma
      acc[key] = convertRecursive(value);
    } else if (key !== 'pembeli') {
      acc[key] = {
        contains: String(value),
      };
    }
    return acc;
  }, {});

  return result;
};

module.exports = filterToJson;

