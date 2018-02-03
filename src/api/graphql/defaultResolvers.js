const { Op, QueryTypes } = require('sequelize');

const createFilterFactory = (schema, typeName) => {
  const fieldNames = Object.keys(schema.fields);
  return (filter = []) => {
    return {
      [Op.and]: filter.map(({ field, operator, value }) => {
        if (!fieldNames.includes(field)) {
          throw new Error(`Predicate > unknown field "${field}" on type "${typeName}"`);
        }
        if (!Op.hasOwnProperty(operator)) {
          throw new Error(`Predicate > unsupported operator "${operator}"`);
        }
        return { [field]: { [Op[operator]]: value } };
      })
    };
  };
};

const allFactory = (typeName, schema) => {
  const createFilter = createFilterFactory(schema, typeName);
  return async (_, { filter, sort, offset, limit }, { models }) => {
    if (offset) {
      offset = Math.max(0, offset);
    }
    const where = createFilter(filter);
    const [items, count] = await Promise.all([
      models[typeName].findAll({ where, limit, offset }),
      models[typeName].count({ where }),
    ]);
    return { items, count };
  };
};

const itemFactory = typeName => (_, { id }, { models }) => models[typeName].findById(id);

const createFactory = typeName => (_, { new: record }, { models }) => models[typeName].create(record);

const updateFactory = typeName => {
  return async (_, { id, delta }, { models }) => {
    const record = await models[typeName].findById(id);
    if (!record) {
      return null;
    }
    record.set(delta);
    return await record.save();
  };
};

const deleteFactory = typeName => {
  return async (_, { ids }, { models }) => {
    const { sequelize, tableName } = models[typeName];
    if (!ids.length) return [];
    const foundIds = (await sequelize.query(`select id from ${tableName} where id in (:ids)`, {
      replacements: { ids },
      type: QueryTypes.SELECT
    })).map(({ id }) => id);
    //TODO affectedRows <> foundIds.length ?
    const affectedRows = await models[typeName].destroy({
      where: {
        id: { [Op.in]: foundIds }
      }
    });
    return foundIds;
  };
};

const countFactory = (typeName, schema) => {
  const createFilter = createFilterFactory(schema, typeName);
  return (_, { filter }, { models }) => models[typeName].count({ where: createFilter(filter) });
};

module.exports = {
  allFactory,
  itemFactory,
  createFactory,
  updateFactory,
  deleteFactory,
  countFactory
};
