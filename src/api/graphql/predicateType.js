const { op } = require('./consts');
const {
  GraphQLScalarType,
  GraphQLObjectType,
  GraphQLString,
  GraphQLEnumType,
  GraphQLList,
  GraphQLInputObjectType
} = require('graphql/type');
const { Kind } = require('graphql/language');

const PredicateOperator = new GraphQLEnumType({
  name: '_PredicateOperator',
  values: Object.entries(op).reduce(
    (values, [name, value]) => ({ ...values, [name]: { value } }), {})
})

const parsePredicateAst = ({ value, kind }) => {
  switch (kind) {
    case Kind.STRING:
    case Kind.INT:
    case Kind.BOOLEAN:
    case Kind.FLOAT:
      return value;
    default: return null;
  }
}


const PredicateValue = new GraphQLScalarType({
  name: '_PredicateValue',
  parseLiteral: parsePredicateAst,
  serialize: String,
  parseValue: v => v
})

const Predicate = new GraphQLInputObjectType({
  name: '_Predicate',
  fields: {
    field: {
      type: GraphQLString
    },
    operator: {
      type: PredicateOperator
    },
    value: {
      type: PredicateValue
    }
  }
});

const PredicateList = new GraphQLList(Predicate)

module.exports = {
  // PredicateOperator,
  // PredicateValue,
  Predicate,
  PredicateList
};
