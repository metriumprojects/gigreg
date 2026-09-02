import Booking from "../models/Booking.js";
import User from "../models/User.js";
import { handleConnectAccountUpdate } from "./stripeConnectController.js";
import { getStripe } from "../services/stripeService.js";

export const stripeWebhook = async (req, res) => {
  const signature = req.headers["stripe-signature"];
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).send("STRIPE_WEBHOOK_SECRET is not configured");
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    return res.status(400).send(`Webhook signature verification failed: ${error.message}`);
  }

  try {
    if (event.type === "account.updated") {
      await handleConnectAccountUpdate(event.data.object);
    }

    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object;
      const bookingId = session.metadata?.bookingId;
      if (bookingId) {
        const presentment = session.presentment_details;
        const settlement = {};
        try {
          const teacher = await User.findById(session.metadata?.teacherId).select("stripeConnectAccountId");
          const paymentIntent = await getStripe().paymentIntents.retrieve(session.payment_intent, {
            expand: ["latest_charge.transfer"],
          });
          const destinationPayment = paymentIntent.latest_charge?.transfer?.destination_payment;
          if (teacher?.stripeConnectAccountId && destinationPayment) {
            const destinationCharge = await getStripe().charges.retrieve(
              destinationPayment,
              { expand: ["balance_transaction"] },
              { stripeAccount: teacher.stripeConnectAccountId }
            );
            const transaction = destinationCharge.balance_transaction;
            if (transaction && typeof transaction !== "string") {
              settlement.teacherSettlementAmount = transaction.net;
              settlement.teacherSettlementCurrency = String(transaction.currency).toUpperCase();
              settlement.teacherExchangeRate = transaction.exchange_rate || 1;
            }
          }
        } catch (settlementError) {
          console.error("Unable to record connected-account settlement details:", settlementError.message);
        }
        await Booking.findByIdAndUpdate(bookingId, {
          $set: {
            stripePaymentIntentId: session.payment_intent || undefined,
            stripe_payment_intent_id: session.payment_intent || undefined,
            presentmentAmount: presentment?.presentment_amount,
            presentmentCurrency: presentment?.presentment_currency?.toUpperCase(),
            "meta.stripeCheckoutPaymentStatus": session.payment_status,
            ...settlement,
          },
        });
      }
    }

    if (event.type === "checkout.session.async_payment_failed") {
      const bookingId = event.data.object.metadata?.bookingId;
      if (bookingId) await Booking.findByIdAndUpdate(bookingId, { paymentStatus: "failed", payment_status: "failed" });
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing error:", error);
    res.status(500).json({ received: false });
  }
};
