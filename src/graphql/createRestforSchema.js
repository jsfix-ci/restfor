const getDefaultValue = require('./getDefaultValue');

module.exports = (collectionNames, ast) => {
  const enumTypes = getEnumTypes(ast);
  const collectionTypes = getCollectionTypes(collectionNames, ast);
  return collectionTypes.reduce(
    (schema, type) => ({
      ...schema,
      [type.name.value]: {
        name: type.name.value,
        type: 'graphql',
        segments: [],
        fields: resolveFields(type, ast, enumTypes)
      }
    }),
    {}
  );
};

const getCollectionTypes = (collectionNames, ast) =>
  ast.definitions.filter(definition => collectionNames.includes(definition.name.value));

const getEnumTypes = ast => ast.definitions.filter(definition => definition.kind === 'EnumTypeDefinition');

const resolveFields = (collectionType, ast, enumTypes) =>
  collectionType.fields.reduce(
    (fields, field) => ({
      ...fields,
      [field.name.value]: resolveField(field, ast, enumTypes)
    }),
    {}
  );

const resolveField = (field, ast, enumTypes) => ({
  type: getType(field, enumTypes),
  graphqlType: field.type.name.value,
  primaryKey: field.directives.some(directive => directive.name.value === 'primaryKey'),
  allowNull: field.directives.some(directive => directive.name.value === 'required'),
  autoGenerated: field.directives.some(directive => directive.name.value === 'auto'),
  readOnly: field.directives.some(directive => directive.name.value === 'auto'),
  defaultValue: getDefaultValue(field.directives),
  values: getEnumValues(field, enumTypes)
});

const getType = (field, enumTypes) => {
  const isEnumType = !!getRelatedEnumType(field, enumTypes);
  if (isEnumType) return 'enum';
  switch (field.type.name.value) {
    case 'Int':
      return 'number';
    case 'Float':
      return 'number';
    case 'String':
      return 'string';
    case 'Boolean':
      return 'bool';
    case 'ID':
      return 'number';
    case 'Date':
      return 'date';
    default:
      return 'string';
  }
};

const getRelatedEnumType = (field, enumTypes) =>
  enumTypes.find(enumType => enumType.name.value === field.type.name.value);

const getEnumValues = (field, enumTypes) => {
  const enumType = getRelatedEnumType(field, enumTypes);
  return enumType ? enumType.values.map(value => value.name.value) : null;
};
