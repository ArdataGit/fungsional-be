const filterToJson = (validate) => {
  if (!validate.filters) return {};
  
  const result = Object.keys(validate.filters).reduce((acc, key) => {
    if (key === "parentId" || key === "id") {
      acc[key] = Number(validate.filters[key]);
    } else if (key !== "pembeli") {
      acc[key] = {
        contains: validate.filters[key],
      };
    }
    return acc;
  }, {});

  return result;
};

module.exports = filterToJson;

