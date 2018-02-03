const {
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLList,
  GraphQLID,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLString,
  GraphQLUnionType,
  GraphQLEnumType,
  GraphQLInputObjectType
} = require('graphql/type');
const { PredicateList } = require('./predicateType');

const { op, directive, DEFAULT_PRIMARY_KEY_NAME, DEFAULT_PRIMARY_KEY_TYPE, DEFAULT_LIMIT } = require('./consts');
const getDefaultValue = require('./getDefaultValue');

const { allFactory, itemFactory, createFactory, updateFactory, deleteFactory, countFactory } = require('./defaultResolvers');

module.exports = ({ models, ast, restforSchema, schema }) => {
  const typeNames = Object.keys(restforSchema);
  const deltas = typeNames.reduce(
    (deltas, typeName) => ({
      ...deltas,
      [typeName]: createDelta(schema, ast, typeName)
    }),
    {}
  );
  const inputs = typeNames.map(typeName => createInput(schema, ast, typeName));
  const entrySchema = createSchema({ models, ast, deltas, typeNames, restforSchema, schema });
  return entrySchema;
};

const nonEditableDecoratorNames = [directive.PRIMARY_KEY, directive.AUTO_GENERATE];

const getTypeDefinition = (ast, typeName) => ast.definitions.find(definition => definition.name.value === typeName);

const getFieldType = (schema, ast, typeName, fieldOrfieldPredicate) => {
  const objectDefinition = getTypeDefinition(ast, typeName);
  if (!objectDefinition) throw new Error(`Type not found: ${typeName}`);
  const fieldPredicate = typeof fieldOrfieldPredicate === 'string'
    ? field => field.name.value === fieldOrfieldPredicate
    : fieldOrfieldPredicate;
  const field = objectDefinition.fields.find(fieldPredicate);
  if (!field) throw new Error('Field not found by the given predicate');
  const type = schema._typeMap[field.type.name.value];
  if (!type) throw new Error(`Invalid field type: ${field.type.name.value}`);
  return type;
};

const getPrimaryKeyName = (ast, typeName) => {
  const objectDefinition = getTypeDefinition(ast, typeName);
  if (!objectDefinition) return DEFAULT_PRIMARY_KEY_NAME;
  const primaryKeyField = objectDefinition.fields.find(field =>
    field.directives.some(directive => directive.name.value === directive.PRIMARY_KEY)
  );
  return primaryKeyField ? primaryKeyField.name.value : DEFAULT_PRIMARY_KEY_NAME;
};

const getPrimaryKeyType = (schema, ast, typeName) => {
  try {
    return getFieldType(schema, ast, typeName, field =>
      field.directives.some(directive => directive.name.value === directive.PRIMARY_KEY)
    );
  } catch (error) {
    return DEFAULT_PRIMARY_KEY_TYPE;
  }
};

const createInput = (schema, ast, typeName) => {
  const objectDefinition = getTypeDefinition(ast, typeName);
  const freeFields = objectDefinition.fields.map(field => field);
  return new GraphQLInputObjectType({
    name: `${typeName}Input`,
    fields: freeFields.reduce(
      (fields, field) => ({
        ...fields,
        [field.name.value]: {
          type: getFieldType(schema, ast, typeName, field.name.value),
          defaultValue: getDefaultValue(field.directives)
        }
      }),
      {}
    )
  });
};

const createDelta = (schema, ast, typeName) => {
  const objectDefinition = getTypeDefinition(ast, typeName);
  const freeFields = objectDefinition.fields
    .filter(field => field.directives.every(directive => !nonEditableDecoratorNames.includes(directive.name.value)))
    .map(field => field);
  return new GraphQLInputObjectType({
    name: `${typeName}Delta`,
    fields: freeFields.reduce(
      (fields, field) => ({
        ...fields,
        [field.name.value]: {
          type: getFieldType(schema, ast, typeName, field.name.value),
          defaultValue: getDefaultValue(field.directives)
        }
      }),
      {}
    )
  });
};

const createSchema = context =>
  new GraphQLSchema({
    query: createQuery(context),
    mutation: createMutation(context)
  });

const createQuery = context =>
  new GraphQLObjectType({
    name: 'Query',
    fields: context.typeNames.reduce(
      (query, typeName) => ({
        ...query,
        [typeName.toLowerCase()]: { type: createEntityQuery(context, typeName), resolve: () => ({}) }
      }),
      {}
    )
  });

const createMutation = context =>
  new GraphQLObjectType({
    name: 'Mutation',
    fields: context.typeNames.reduce(
      (query, typeName) => ({
        ...query,
        [typeName.toLowerCase()]: { type: createMutationQuery(context, typeName), resolve: () => ({}) }
      }),
      {}
    )
  });

const createEntityQuery = (context, typeName) => {
  const primaryKeyName = getPrimaryKeyName(context.ast, typeName);
  const primaryKeyType = getPrimaryKeyType(context.schema, context.ast, typeName);
  return new GraphQLObjectType({
    name: `${typeName}Query`,
    fields: {
      all: {
        type: new GraphQLObjectType({
          name: `${typeName}AllResult`,
          fields: {
            items: { type: new GraphQLList(context.schema._typeMap[typeName]) },
            count: { type: GraphQLInt }
          }
        }),
        args: {
          // filter: { type: GraphQLString, defaultValue: '' },
          filter: { type: PredicateList },
          sort: { type: GraphQLString, defaultValue: primaryKeyName },
          offset: { type: GraphQLInt, defaultValue: 0 },
          limit: { type: GraphQLInt, defaultValue: DEFAULT_LIMIT }
        },
        resolve: allFactory(typeName, context.restforSchema[typeName])
      },
      item: {
        type: context.schema._typeMap[typeName],
        args: {
          [primaryKeyName]: { type: primaryKeyType }
        },
        resolve: itemFactory(typeName, context.restforSchema[typeName])
      },
      countItems: {
        type: GraphQLInt,
        args: {
          filter: { type: GraphQLString, defaultValue: '' }
        },
        resolve: countFactory(typeName, context.restforSchema[typeName])
      }
    }
  });
};

const createMutationQuery = (context, typeName) => {
  const primaryKeyName = getPrimaryKeyName(context.ast, typeName);
  const primaryKeyType = getPrimaryKeyType(context.schema, context.ast, typeName);
  return new GraphQLObjectType({
    name: `${typeName}Mutation`,
    fields: {
      create: {
        type: context.schema._typeMap[typeName],
        args: { new: { type: context.deltas[typeName] } },
        resolve: createFactory(typeName, context.restforSchema[typeName])
      },
      update: {
        type: context.schema._typeMap[typeName],
        args: { [primaryKeyName]: { type: primaryKeyType }, delta: { type: context.deltas[typeName] } },
        resolve: updateFactory(typeName, context.restforSchema[typeName])
      },
      delete: {
        type: new GraphQLList(primaryKeyType),
        args: { ids: { type: new GraphQLList(primaryKeyType) } },
        resolve: deleteFactory(typeName, context.restforSchema[typeName])
      }
    }
  });
};
