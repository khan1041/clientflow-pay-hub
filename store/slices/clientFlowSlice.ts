



"use client";

import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface ServicePackageItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceInCents: number;
  billingType: string;
  ghlTag: string;
  isPopular: boolean;
}

export interface ClientOrderItem {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  businessName: string | null;
  businessGoal: string | null;
  addOnNames: string[];
  amountInCents: number;
  discountInCents: number;
  currency: string;
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  ghlSyncStatus: "PENDING" | "SYNCED" | "FAILED";
  ghlContactId: string | null;
  ghlErrorMessage: string | null;
  aiOnboardingPlan: string | null;
  aiInternalSteps: string | null;
  createdAt: string;
  package: {
    name: string;
    slug: string;
    ghlTag: string;
  };
}

export interface WebhookLogItem {
  id: string;
  source: string;
  eventType: string;
  status: string;
  payload: string | null;
  errorDetail: string | null;
  orderId: string | null;
  createdAt: string;
}

export interface AddOnOption {
  id: string;
  name: string;
  priceInCents: number;
}

export const AVAILABLE_ADDONS: AddOnOption[] = [
  { id: "ai-voice-agent", name: "AI Voice Lead Qualifier", priceInCents: 19900 },
  { id: "ghl-snapshot", name: "Custom GHL Pipeline Snapshot", priceInCents: 14900 },
  { id: "priority-qa", name: "Webhook Stress Test & SLA Setup", priceInCents: 9900 },
];

interface ClientFlowState {
  packages: ServicePackageItem[];
  selectedPackageId: string;
  selectedAddOnIds: string[];
  promoCode: string;
  discountPercent: number;
  isLoadingPackages: boolean;
  isSubmittingCheckout: boolean;
  checkoutError: string | null;
  checkoutSuccessMessage: string | null;
  isAuthenticated: boolean;
  adminEmail: string | null;
  authLoading: boolean;
  authError: string | null;
  orders: ClientOrderItem[];
  webhookLogs: WebhookLogItem[];
  ordersLoading: boolean;
  ordersError: string | null;
}

const initialState: ClientFlowState = {
  packages: [],
  selectedPackageId: "",
  selectedAddOnIds: [],
  promoCode: "",
  discountPercent: 0,
  isLoadingPackages: false,
  isSubmittingCheckout: false,
  checkoutError: null,
  checkoutSuccessMessage: null,
  isAuthenticated: false,
  adminEmail: null,
  authLoading: true,
  authError: null,
  orders: [],
  webhookLogs: [],
  ordersLoading: false,
  ordersError: null,
};

export const fetchPackages = createAsyncThunk(
  "clientFlow/fetchPackages",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/packages", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) return rejectWithValue(data.error || "Failed to load packages");
      return (data.packages || []) as ServicePackageItem[];
    } catch {
      return rejectWithValue("Network error while loading packages");
    }
  }
);

export const checkAuthSession = createAsyncThunk(
  "clientFlow/checkAuthSession",
  async () => {
    const res = await fetch("/api/auth/session", { cache: "no-store" });
    if (!res.ok) return { authenticated: false, email: null };
    const data = await res.json();
    return {
      authenticated: Boolean(data.authenticated),
      email: data.user?.email || null,
    };
  }
);

export const loginAdmin = createAsyncThunk(
  "clientFlow/loginAdmin",
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      const data = await res.json();
      if (!res.ok) return rejectWithValue(data.error || "Login failed");
      return {
        authenticated: true,
        email: data.user?.email || credentials.email,
      };
    } catch {
      return rejectWithValue("Network error during login");
    }
  }
);

export const logoutAdmin = createAsyncThunk("clientFlow/logoutAdmin", async () => {
  await fetch("/api/auth/logout", { method: "POST" });
  return { authenticated: false, email: null };
});

export const fetchAdminOrders = createAsyncThunk(
  "clientFlow/fetchAdminOrders",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/orders", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        return rejectWithValue({
          status: res.status,
          message: data.error || "Failed to fetch orders",
        });
      }
      return {
        orders: (data.orders || []) as ClientOrderItem[],
        webhookLogs: (data.webhookLogs || []) as WebhookLogItem[],
      };
    } catch {
      return rejectWithValue({
        status: 500,
        message: "Network error while fetching orders",
      });
    }
  }
);

export const createCheckoutSession = createAsyncThunk(
  "clientFlow/createCheckoutSession",
  async (
    payload: {
      packageId: string;
      addOnNames: string[];
      addOnTotalCents: number;
      discountPercent: number;
      clientName: string;
      clientEmail: string;
      clientPhone?: string;
      businessName?: string;
      businessGoal?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) return rejectWithValue(data.error || "Checkout failed");
      return data as { orderId: string; checkoutUrl: string | null; mode: string };
    } catch {
      return rejectWithValue("Network error during checkout");
    }
  }
);

const clientFlowSlice = createSlice({
  name: "clientFlow",
  initialState,
  reducers: {
    selectPackage(state, action: PayloadAction<string>) {
      state.selectedPackageId = action.payload;
      state.checkoutError = null;
      state.checkoutSuccessMessage = null;
    },
    toggleAddOn(state, action: PayloadAction<string>) {
      const exists = state.selectedAddOnIds.includes(action.payload);
      if (exists) {
        state.selectedAddOnIds = state.selectedAddOnIds.filter((id) => id !== action.payload);
      } else {
        state.selectedAddOnIds.push(action.payload);
      }
    },
    setPromoCode(state, action: PayloadAction<string>) {
      state.promoCode = action.payload;
    },
    applyPromoCode(state) {
      const normalized = state.promoCode.trim().toUpperCase();
      if (normalized === "CLIENT10") {
        state.discountPercent = 10;
        state.checkoutError = null;
      } else if (normalized === "") {
        state.discountPercent = 0;
      } else {
        state.discountPercent = 0;
        state.checkoutError = "Invalid promo code. Try CLIENT10 for 10% off.";
      }
    },
    clearCheckoutNotices(state) {
      state.checkoutError = null;
      state.checkoutSuccessMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPackages.pending, (state) => {
        state.isLoadingPackages = true;
      })
      .addCase(fetchPackages.fulfilled, (state, action) => {
        state.isLoadingPackages = false;
        state.packages = action.payload;
        if (!state.selectedPackageId && action.payload.length > 0) {
          const popular = action.payload.find((p) => p.isPopular) || action.payload[0];
          state.selectedPackageId = popular.id;
        }
      })
      .addCase(fetchPackages.rejected, (state, action) => {
        state.isLoadingPackages = false;
        state.checkoutError = (action.payload as string) || "Could not load packages";
      })
      .addCase(checkAuthSession.pending, (state) => {
        state.authLoading = true;
      })
      .addCase(checkAuthSession.fulfilled, (state, action) => {
        state.authLoading = false;
        state.isAuthenticated = action.payload.authenticated;
        state.adminEmail = action.payload.email;
      })
      .addCase(checkAuthSession.rejected, (state) => {
        state.authLoading = false;
        state.isAuthenticated = false;
        state.adminEmail = null;
      })
      .addCase(loginAdmin.pending, (state) => {
        state.authError = null;
      })
      .addCase(loginAdmin.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.adminEmail = action.payload.email;
        state.authError = null;
      })
      .addCase(loginAdmin.rejected, (state, action) => {
        state.isAuthenticated = false;
        state.adminEmail = null;
        state.authError = (action.payload as string) || "Invalid credentials";
      })
      .addCase(logoutAdmin.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.adminEmail = null;
        state.orders = [];
        state.webhookLogs = [];
      })
      .addCase(fetchAdminOrders.pending, (state) => {
        state.ordersLoading = true;
        state.ordersError = null;
      })
      .addCase(fetchAdminOrders.fulfilled, (state, action) => {
        state.ordersLoading = false;
        state.orders = action.payload.orders;
        state.webhookLogs = action.payload.webhookLogs;
      })
      .addCase(fetchAdminOrders.rejected, (state, action) => {
        state.ordersLoading = false;
        const payload = action.payload as { status?: number; message?: string } | undefined;
        if (payload?.status === 401 || payload?.status === 403) {
          state.isAuthenticated = false;
        }
        state.ordersError = payload?.message || "Unauthorized access";
      })
      .addCase(createCheckoutSession.pending, (state) => {
        state.isSubmittingCheckout = true;
        state.checkoutError = null;
        state.checkoutSuccessMessage = null;
      })
      .addCase(createCheckoutSession.fulfilled, (state, action) => {
        state.isSubmittingCheckout = false;
        state.checkoutSuccessMessage = `Order created (${action.payload.orderId}). Redirecting...`;
      })
      .addCase(createCheckoutSession.rejected, (state, action) => {
        state.isSubmittingCheckout = false;
        state.checkoutError = (action.payload as string) || "Checkout failed";
      });
  },
});

export const {
  selectPackage,
  toggleAddOn,
  setPromoCode,
  applyPromoCode,
  clearCheckoutNotices,
} = clientFlowSlice.actions;

export default clientFlowSlice.reducer;