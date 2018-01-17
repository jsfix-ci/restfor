import { RESOLVE_FETCHING_ENTITIES } from '../actionTypes';

export default (state = {}, action) => {
  switch (action.type) {
    case RESOLVE_FETCHING_ENTITIES:
      return Object.keys(action.entities).reduce(
        (entities, name) => ({ ...entities, [name]: { schema: action.entities[name], items: null, page: null } }),
        {}
      );
    default:
      return state;
  }
};
