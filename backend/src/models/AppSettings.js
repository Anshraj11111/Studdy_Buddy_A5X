import mongoose from 'mongoose';
import { getConnection } from '../config/db-multi.js';

const appSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    value: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Lazy model creation
let AppSettings;

const getAppSettingsModel = () => {
  if (AppSettings) return AppSettings;
  
  try {
    const conn = getConnection('primary');
    if (conn && conn.readyState === 1) {
      AppSettings = conn.model('AppSettings', appSettingsSchema);
    } else {
      AppSettings = mongoose.model('AppSettings', appSettingsSchema);
    }
  } catch (error) {
    AppSettings = mongoose.model('AppSettings', appSettingsSchema);
  }
  
  return AppSettings;
};

export default getAppSettingsModel();
