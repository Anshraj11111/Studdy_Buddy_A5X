import { getConnection } from '../config/db-multi.js';
import { MODEL_DATABASE_MAP } from '../config/model-registry.js';

/**
 * Smart Model Loader for Multi-Database Architecture
 * 
 * This utility automatically routes each model to the correct database connection
 * while maintaining backward compatibility with single-database setups.
 * 
 * Usage in services:
 *   import { getModel } from '../utils/model-loader.js';
 *   const User = getModel('User');
 *   const users = await User.find();
 */

const modelCache = {};

/**
 * Get a model with the correct database connection
 * @param {string} modelName - Name of the model (e.g., 'User', 'Doubt')
 * @returns {mongoose.Model} The model connected to the appropriate database
 */
export const getModel = (modelName) => {
  // Return cached model if already loaded
  if (modelCache[modelName]) {
    return modelCache[modelName];
  }

  try {
    // Check if multi-database mode is enabled
    const isMultiDbMode = process.env.MONGO_URI_PRIMARY || 
                          process.env.MONGO_URI_SECONDARY || 
                          process.env.MONGO_URI_TERTIARY;

    if (!isMultiDbMode) {
      // Single database mode - use default mongoose models
      const mongoose = require('mongoose');
      if (mongoose.models[modelName]) {
        modelCache[modelName] = mongoose.models[modelName];
        return modelCache[modelName];
      }
      throw new Error(`Model ${modelName} not found in single-db mode`);
    }

    // Multi-database mode - get the correct connection
    const dbName = MODEL_DATABASE_MAP[modelName] || 'primary';
    const connection = getConnection(dbName);

    // Check if model already exists on this connection
    if (connection.models[modelName]) {
      modelCache[modelName] = connection.models[modelName];
      return modelCache[modelName];
    }

    throw new Error(`Model ${modelName} not registered on ${dbName} database`);

  } catch (error) {
    console.error(`Error loading model ${modelName}:`, error.message);
    throw error;
  }
};

/**
 * Register a model schema on the appropriate database connection
 * @param {string} modelName - Name of the model
 * @param {mongoose.Schema} schema - Mongoose schema
 * @returns {mongoose.Model} The registered model
 */
export const registerModel = (modelName, schema) => {
  try {
    // Check if multi-database mode is enabled
    const isMultiDbMode = process.env.MONGO_URI_PRIMARY || 
                          process.env.MONGO_URI_SECONDARY || 
                          process.env.MONGO_URI_TERTIARY;

    if (!isMultiDbMode) {
      // Single database mode - use default mongoose
      const mongoose = require('mongoose');
      if (mongoose.models[modelName]) {
        modelCache[modelName] = mongoose.models[modelName];
        return modelCache[modelName];
      }
      const model = mongoose.model(modelName, schema);
      modelCache[modelName] = model;
      return model;
    }

    // Multi-database mode - register on the correct connection
    const dbName = MODEL_DATABASE_MAP[modelName] || 'primary';
    const connection = getConnection(dbName);

    // Check if already registered
    if (connection.models[modelName]) {
      modelCache[modelName] = connection.models[modelName];
      return modelCache[modelName];
    }

    const model = connection.model(modelName, schema);
    modelCache[modelName] = model;
    
    console.log(`✓ Model ${modelName} registered on ${dbName} database`);
    return model;

  } catch (error) {
    console.error(`Error registering model ${modelName}:`, error.message);
    throw error;
  }
};

/**
 * Clear model cache (useful for testing)
 */
export const clearModelCache = () => {
  Object.keys(modelCache).forEach(key => delete modelCache[key]);
};

export default {
  getModel,
  registerModel,
  clearModelCache,
};
