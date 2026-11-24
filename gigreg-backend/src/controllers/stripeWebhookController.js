import Booking from "../models/Booking.js";
import User from "../models/User.js";
import { fulfillPaidBooking } from "./bookingController.js";
import {
  handleConnectAccountDeauthorized,
  handleConnectAccountUpdate,
} from "./stripeConnectController.js";
import { getStripe } from "../services/stripeService.js";
import { requireCurrency, roundMoney } from "../services/currencyService.js";
import { getCommissionRate } from "../services/appSettingsService.js";

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

    if (event.type === "account.application.deauthorized") {
      if (event.account && String(event.account).startsWith("acct_")) {
        await handleConnectAccountDeauthorized(event.account);
      }
    }

    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object;
      const bookingId = session.metadata?.bookingId;
      if (bookingId) {
        let paymentIntent = null;
        if (session.payment_intent) {
          paymentIntent = await getStripe().paymentIntents.retrieve(session.payment_intent, {
            expand: ["latest_charge.transfer"],
          });
        }

        if (session.payment_status === "paid" || paymentIntent?.status === "succeeded") {
          await fulfillPaidBooking({ bookingId, session, paymentIntent });
        }

        const settlement = {};
        try {
          const teacher = session.metadata?.teacherId
            ? await User.findById(session.metadata.teacherId).select("stripeConnectAccountId")
            : null;
          const destinationPayment = paymentIntent?.latest_charge?.transfer?.destination_payment;
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

        if (Object.keys(settlement).length) {
          await Booking.findByIdAndUpdate(bookingId, { $set: settlement });
        }
      }
    }

    if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
      const bookingId = event.data.object.metadata?.bookingId;
      if (bookingId) {
        const nextStatus = event.type === "checkout.session.expired" ? "cancelled" : "failed";
        await Booking.findOneAndUpdate(
          { _id: bookingId, paymentStatus: "pending" },
          {
            $set: {
              paymentStatus: nextStatus,
              payment_status: nextStatus,
              payoutStatus: "cancelled",
            },
          }
        );
      }
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object;
      const lookup = [{ stripeChargeId: charge.id }];
      if (charge.payment_intent) {
        lookup.push({ stripePaymentIntentId: charge.payment_intent });
      }
      const isFullRefund =
        typeof charge.amount === "number" &&
        charge.amount > 0 &&
        typeof charge.amount_refunded === "number"
          ? charge.amount_refunded >= charge.amount
          : Boolean(charge.refunded);

      if (isFullRefund) {
        const previouslyUnrefunded = await Booking.findOneAndUpdate(
          { $or: lookup, refundStatus: { $ne: "refunded" } },
          {
            $set: {
              refundStatus: "refunded",
              status: "cancelled",
              payoutStatus: "cancelled",
              refundedAt: new Date(),
            },
          },
          { new: false }
        );

        // If full refund originated directly from Stripe Dashboard (not app cancelBooking),
        // reverse teacher's pending balance once atomically.
        if (
          previouslyUnrefunded &&
          previouslyUnrefunded.refundStatus === "none" &&
          previouslyUnrefunded.paymentStatus === "paid" &&
          previouslyUnrefunded.payoutStatus === "pending_completion" &&
          previouslyUnrefunded.teacher
        ) {
          const earningCurrency = requireCurrency(
            previouslyUnrefunded.teacherPayoutCurrency ||
              previouslyUnrefunded.itemSnapshot?.currency ||
              previouslyUnrefunded.lesson_currency ||
              previouslyUnrefunded.currency ||
              "USD"
          );
          const fallbackRate =
            typeof previouslyUnrefunded.commissionRate === "number"
              ? previouslyUnrefunded.commissionRate
              : await getCommissionRate();
          const teacherAmount =
            previouslyUnrefunded.teacherPayoutAmount != null
              ? previouslyUnrefunded.teacherPayoutAmount
              : roundMoney(
                  previouslyUnrefunded.amount - previouslyUnrefunded.amount * fallbackRate,
                  earningCurrency
                );

          if (previouslyUnrefunded.type === "curriculum") {
            await User.findByIdAndUpdate(previouslyUnrefunded.teacher, {
              $inc: { moneyPending: -teacherAmount },
            });
          } else {
            await User.findByIdAndUpdate(previouslyUnrefunded.teacher, {
              $inc: { [`balances.pending.${earningCurrency}`]: -teacherAmount },
            });
          }
        }
      } else {
        await Booking.findOneAndUpdate(
          { $or: lookup, refundStatus: { $nin: ["refunded", "disputed"] } },
          {
            $set: {
              refundStatus: "partial",
              refundedAt: new Date(),
            },
          }
        );
      }
    }

    if (event.type === "charge.dispute.created") {
      const dispute = event.data.object;
      const lookup = [];
      if (dispute.charge) {
        lookup.push({ stripeChargeId: dispute.charge });
      }
      if (dispute.payment_intent) {
        lookup.push({ stripePaymentIntentId: dispute.payment_intent });
      }
      if (lookup.length > 0) {
        await Booking.findOneAndUpdate(
          { $or: lookup, refundStatus: { $ne: "disputed" } },
          {
            $set: {
              refundStatus: "disputed",
              payoutStatus: "cancelled",
              transferError: `Charge disputed (${dispute.reason || "dispute"}): ${dispute.id}`,
            },
          }
        );
      }
    }

    if (event.type === "payout.failed") {
      const payout = event.data.object;
      console.warn(
        `Stripe payout failed: payout=${payout.id} account=${event.account || "platform"} code=${payout.failure_code || "unknown"} message=${payout.failure_message || "none"}`
      );
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing error:", error);
    res.status(500).json({ received: false });
  }
};
