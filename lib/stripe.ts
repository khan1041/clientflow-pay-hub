

// import Stripe from "stripe";

// const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

// export const stripe = stripeSecretKey
//   ? new Stripe(stripeSecretKey, {
//       apiVersion: "2025-02-24.acacia",
//     })
//   : null;

//import Stripe from "stripe";

//const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

//export const stripe = stripeSecretKey
  //? new Stripe(stripeSecretKey)
 // : null;

import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

export const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

