import {
  TOGGLE_FETCHING,
  REJECT_ERROR,
  DISMISS_ERROR,
  RESOLVE_FETCHING_SCHEMAS,
  RESOLVE_FETCHING_ITEMS,
  RESOLVE_FETCHING_ITEM,
  RESOLVE_UPDATING_ITEM
} from './actionTypes';
import { getResourceName, getLimit, getPage, getItems, getSegment, getId } from './selectors';

export const toggleFetching = value => ({ type: TOGGLE_FETCHING, value });

export const rejectError = error => ({ type: REJECT_ERROR, error });

export const dismissError = () => ({ type: DISMISS_ERROR });

export const openDetails = id => (dispatch, getState, { history }) => {
  const { pathname } = history.location;
  history.push(`${pathname}/item/${id}`);
};

export const closeDetails = () => (dispatch, getState, { history }) => {
  const resourceName = getResourceName(getState());
  if (history.length <= 2) history.push(`/${resourceName}`);
  else history.goBack();
};

export const resolveFetchingSchemas = schemas => ({ type: RESOLVE_FETCHING_SCHEMAS, schemas });
export const resolveFetchingItems = (resourceName, items, count) => ({
  type: RESOLVE_FETCHING_ITEMS,
  resourceName,
  items,
  count
});
export const resolveFetchingItem = (resourceName, item) => ({ type: RESOLVE_FETCHING_ITEM, resourceName, item });
export const resolveUpdatingItem = (resourceName, id, item) => ({
  type: RESOLVE_UPDATING_ITEM,
  resourceName,
  id,
  item
});

export const fetchSchemas = () => async (dispatch, getState, { api, history }) => {
  try {
    dispatch(toggleFetching(true));
    const schemas = await api.get('/schemas');
    const schemaList = Object.keys(schemas);
    dispatch(resolveFetchingSchemas(schemas));
    if (!getResourceName(getState()) && schemaList.length > 0) history.push('/' + schemaList[0].toLowerCase());
  } catch (error) {
    dispatch(rejectError(error.message));
  } finally {
    dispatch(toggleFetching(false));
  }
};

export const fetchItems = () => async (dispatch, getState, { api }) => {
  try {
    const state = getState();
    const resourceName = getResourceName(state);
    const limit = getLimit(state);
    const page = getPage(state);
    const segment = getSegment(state);
    dispatch(toggleFetching(true));
    const { rows: items, count } = await api.get(`/sequelize/${resourceName}/`, {
      query: { offset: page * limit, limit, segment }
    });
    dispatch(resolveFetchingItems(resourceName, items, count));
  } catch (error) {
    console.error(error);
    dispatch(rejectError(error.message));
  } finally {
    dispatch(toggleFetching(false));
  }
};

export const fetchItem = () => async (dispatch, getState, { api }) => {
  try {
    const state = getState();
    const id = getId(state);
    const resourceName = getResourceName(state);
    dispatch(toggleFetching(true));
    const item = await api.get(`/sequelize/${resourceName}/${id}`);
    dispatch(resolveFetchingItem(resourceName, item));
  } catch (error) {
    console.error(error);
    dispatch(rejectError(error.message));
  } finally {
    dispatch(toggleFetching(false));
  }
};

export const createItem = item => async (dispatch, getState, { api }) => {
  try {
    const state = getState();
    const resourceName = getResourceName(state);
    dispatch(toggleFetching(true));
    await api.post(`/sequelize/${resourceName}/`, { body: [item] });
  } catch (error) {
    console.error(error);
    dispatch(rejectError(error.message));
  } finally {
    dispatch(toggleFetching(false));
  }
};

export const updateItem = delta => async (dispatch, getState, { api }) => {
  try {
    const state = getState();
    const resourceName = getResourceName(state);
    const id = getId(state);
    dispatch(toggleFetching(true));
    const item = await api.put(`/sequelize/${resourceName}/${id}`, { body: delta });
    dispatch(resolveUpdatingItem(resourceName, id, item));
  } catch (error) {
    console.error(error);
    dispatch(rejectError(error.message));
  } finally {
    dispatch(toggleFetching(false));
  }
};

export const deleteItems = ids => async (dispatch, getState, { api }) => {
  try {
    const state = getState();
    const resourceName = getResourceName(state);
    dispatch(toggleFetching(true));
    const item = await api.delete(`/sequelize/${resourceName}/`, { body: ids });
    await dispatch(fetchItems());
  } catch (error) {
    console.error(error);
    dispatch(rejectError(error.message));
  } finally {
    dispatch(toggleFetching(false));
  }
};

export const invoke = (method, resourceName, path, options) => async (dispatch, getState, { api }) => {
  const { params = {}, query = {}, body } = options;
  const request = { method: method.toUpperCase(), resourceName, path, params, query, body };
  try {
    dispatch(toggleFetching(true));
    const result = await api[method.toLowerCase()](`/sequelize/${resourceName.toLowerCase()}${path}`, {
      params,
      query,
      body
    });
    return result;
  } catch (error) {
    dispatch(rejectError(error.message, request, reducer));
    throw error;
  } finally {
    dispatch(toggleFetching(false));
  }
};

export const graphql = query => async (dispatch, getState, { graphql }) => {};
