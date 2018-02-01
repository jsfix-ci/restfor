const resolveType = require('./resolveType');

module.exports = models =>
  Object.keys(models).reduce(
    (schema, name) => ({ ...schema, [name.toLowerCase()]: getJsonSchemaOfModel(models[name]) }),
    {}
  );

const getJsonSchemaOfModel = model => {
  return {
    name: model.name.toLowerCase(),
    type: 'sequelize',
    segments: model.options.segments || [],
    fields: Object.keys(model.attributes).reduce((properties, name) => {
      const attribute = model.attributes[name];
      return {
        ...properties,
        [name]: {
          type: resolveType(attribute.type.constructor.name),
          sequelizeType: attribute.type.constructor.name,
          length: attribute.type._length || null,
          values: attribute.type.values || null,
          allowNull: attribute.allowNull,
          autoGenerated: attribute._autoGenerated || false,
          readOnly: !!attribute.readOnly || attribute._autoGenerated,
          primaryKey: attribute.primaryKey,
          defaultValue: attribute.defaultValue || null,
          references: attribute.references || null
        }
      };
    }, {})
  };
};