const STORAGE_KEY = "gigreg_proposal_request";
const MESSAGE_STORAGE_KEY = "gigreg_proposal_message";

export const saveProposalRequest = (request) => {
  if (!request) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(request));
  } catch {
    // ignore storage errors
  }
};

export const loadProposalRequest = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveProposalMessage = (message) => {
  try {
    sessionStorage.setItem(MESSAGE_STORAGE_KEY, message || "");
  } catch {
    // ignore storage errors
  }
};

export const loadProposalMessage = () => {
  try {
    return sessionStorage.getItem(MESSAGE_STORAGE_KEY) || "";
  } catch {
    return "";
  }
};

export const clearProposalRequest = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(MESSAGE_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
};

export const isSellerProfileComplete = (user) =>
  Boolean(user?.sellerName?.trim() && user?.dateOfBirth && user?.country?.trim());

export const listingStateFromRequest = (request) => ({
  fromRequest: {
    title: request?.title || "",
    description: request?.description || "",
    category: request?.category || "",
    price: request?.price,
    isOnline: request?.isOnline,
    supportsInPerson: request?.supportsInPerson,
    location: request?.location || "",
  },
  proposalRequest: request || null,
});

export const createListingProposalUrl = (requestId) =>
  `/create-listing?type=proposal&requestId=${requestId}`;

export const sendProposalUrl = (requestId) =>
  `/send-proposal?requestId=${requestId}`;

export const formatRequestDate = (value) => {
  if (!value) return "Date not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not available";
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export const getRequestBuyerId = (request) =>
  request?.user?._id || request?.user || null;
