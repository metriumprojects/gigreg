import AppSetting from "../models/AppSetting.js";

const SETTINGS_KEY = "platform";
const DEFAULT_COMMISSION_PERCENT = 5;

const normalizeCommissionPercent = (value) => {
  const percent = Number(value);
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    const error = new Error("Commission must be a number from 0 to 100");
    error.status = 400;
    throw error;
  }
  return Math.round((percent + Number.EPSILON) * 100) / 100;
};

export const getAppSettings = async () => {
  const settings = await AppSetting.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $setOnInsert: { commissionPercent: DEFAULT_COMMISSION_PERCENT } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return {
    commissionPercent: normalizeCommissionPercent(settings?.commissionPercent ?? DEFAULT_COMMISSION_PERCENT),
  };
};

export const updateAppSettings = async ({ commissionPercent }) => {
  const normalizedCommission = normalizeCommissionPercent(commissionPercent);
  const settings = await AppSetting.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { commissionPercent: normalizedCommission },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return {
    commissionPercent: normalizeCommissionPercent(settings.commissionPercent),
  };
};

export const getCommissionRate = async () => {
  const { commissionPercent } = await getAppSettings();
  return commissionPercent / 100;
};
