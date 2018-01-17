module.exports = attributes => {
  return Object.keys(attributes).reduce((properties, name) => {
    const attribute = attributes[name];
    return {
      ...properties,
      [name]: {
        type: attribute.type.constructor.name,
        length: attribute.type._length || null,
        values: attribute.type.values || null,
        allowNull: attribute.allowNull,
        autoGenerated: attribute._autoGenerated || false,
        primaryKey: attribute.primaryKey,
        defaultValue: attribute.defaultValue || null,
        references: attribute.references || null
      }
    };
  }, {});
};
