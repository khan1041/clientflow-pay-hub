
"use client";

import { configureStore } from "@reduxjs/toolkit";
import clientFlowReducer from "./slices/clientFlowSlice";

export const store = configureStore({
  reducer: {
    clientFlow: clientFlowReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;