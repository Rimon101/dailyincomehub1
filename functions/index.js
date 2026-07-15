const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// ===== Server-authoritative staking config =====
// These values are the single source of truth. The client sends only
// { coin, duration, amount }; every payout number is recomputed here so a
// tampered client cannot inflate returns.
const COIN_BASE_RATE = {
  BTC: 1.2,
  ETH: 1.5,
  SOL: 1.8,
  BNB: 1.6,
  ADA: 1.0,
  XRP: 1.1,
};

const DURATION_MULTIPLIER = {
  7: 1.0,
  15: 1.25,
  30: 1.5,
};

const MIN_STAKE = 1;

function computeStake(coin, duration, amount) {
  const baseRate = COIN_BASE_RATE[coin];
  const multiplier = DURATION_MULTIPLIER[duration];
  if (baseRate === undefined) {
    throw new HttpsError("invalid-argument", "Unknown coin.");
  }
  if (multiplier === undefined) {
    throw new HttpsError("invalid-argument", "Unknown staking duration.");
  }
  const dailyRate = baseRate * multiplier;
  const dailyYield = amount * (dailyRate / 100);
  const totalInterest = dailyYield * duration;
  const expectedReturn = amount + totalInterest;
  return { dailyRate, expectedReturn };
}

function requireUid(request) {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }
  return request.auth.uid;
}

// ===== submitStake =====
// Debits balance and appends a new active stake atomically.
exports.submitStake = onCall(async (request) => {
  const uid = requireUid(request);
  const coin = String(request.data?.coin || "");
  const duration = Number(request.data?.duration);
  const amount = Number(request.data?.amount);

  if (!Number.isFinite(amount) || amount < MIN_STAKE) {
    throw new HttpsError("invalid-argument", "Invalid stake amount.");
  }

  const { dailyRate, expectedReturn } = computeStake(coin, duration, amount);
  const userRef = db.collection("users").doc(uid);

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) {
      throw new HttpsError("not-found", "User record not found.");
    }
    const data = snap.data();
    if (data.isFrozen === true) {
      throw new HttpsError("permission-denied", "Account is frozen.");
    }

    const balance = Number(data.balance) || 0;
    if (amount > balance) {
      throw new HttpsError("failed-precondition", "Insufficient balance.");
    }

    const now = admin.firestore.Timestamp.now();
    const endMs = now.toMillis() + duration * 24 * 60 * 60 * 1000;
    const endDate = admin.firestore.Timestamp.fromMillis(endMs);

    // ID uses the request time; uniqueness within a user's array is enough.
    const stakeId = "stake_" + now.toMillis() + "_" + Math.floor(now.nanoseconds / 1000);

    const newStake = {
      id: stakeId,
      coin,
      amount,
      duration,
      dailyRate,
      startDate: now,
      endDate,
      expectedReturn,
      status: "active",
    };

    const newTx = {
      type: "Staking Deposit",
      amount: -amount,
      date: now,
      coin,
      duration,
    };

    tx.update(userRef, {
      balance: admin.firestore.FieldValue.increment(-amount),
      stakes: admin.firestore.FieldValue.arrayUnion(newStake),
      transactions: admin.firestore.FieldValue.arrayUnion(newTx),
    });

    return { stakeId, expectedReturn };
  });

  return { success: true, ...result };
});

// ===== cancelStake =====
// Refunds the original principal only (interest forfeited) and marks the
// stake cancelled.
exports.cancelStake = onCall(async (request) => {
  const uid = requireUid(request);
  const stakeId = String(request.data?.stakeId || "");
  if (!stakeId) {
    throw new HttpsError("invalid-argument", "Missing stake id.");
  }

  const userRef = db.collection("users").doc(uid);

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) {
      throw new HttpsError("not-found", "User record not found.");
    }
    const data = snap.data();
    const stakes = Array.isArray(data.stakes) ? data.stakes : [];
    const stake = stakes.find((s) => s.id === stakeId);
    if (!stake) {
      throw new HttpsError("not-found", "Stake not found.");
    }
    if (stake.status !== "active") {
      throw new HttpsError("failed-precondition", "Stake is not active.");
    }

    const refundAmount = Number(stake.amount) || 0;
    const updatedStakes = stakes.map((s) =>
      s.id === stakeId ? { ...s, status: "cancelled" } : s
    );

    const cancelTx = {
      type: "Stake Cancelled (Refund)",
      amount: refundAmount,
      date: admin.firestore.Timestamp.now(),
      coin: stake.coin,
      stakeId,
    };

    tx.update(userRef, {
      balance: admin.firestore.FieldValue.increment(refundAmount),
      stakes: updatedStakes,
      transactions: admin.firestore.FieldValue.arrayUnion(cancelTx),
    });

    return { refundAmount };
  });

  return { success: true, ...result };
});

// ===== claimMaturedStakes =====
// Credits payouts for any active stake whose endDate has passed (server time).
exports.claimMaturedStakes = onCall(async (request) => {
  const uid = requireUid(request);
  const userRef = db.collection("users").doc(uid);

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) {
      throw new HttpsError("not-found", "User record not found.");
    }
    const data = snap.data();
    const stakes = Array.isArray(data.stakes) ? data.stakes : [];
    const nowMs = admin.firestore.Timestamp.now().toMillis();

    let totalReturn = 0;
    const newTransactions = [];

    const updatedStakes = stakes.map((stake) => {
      if (stake.status !== "active") return stake;
      const endMs =
        stake.endDate && stake.endDate.toMillis
          ? stake.endDate.toMillis()
          : new Date(stake.endDate || 0).getTime();
      if (nowMs < endMs) return stake;

      const payout = Number(stake.expectedReturn) || 0;
      totalReturn += payout;
      newTransactions.push({
        type: "Staking Return",
        amount: payout,
        date: admin.firestore.Timestamp.now(),
        coin: stake.coin,
        duration: stake.duration,
      });
      return { ...stake, status: "completed" };
    });

    if (newTransactions.length === 0) {
      return { credited: 0 };
    }

    tx.update(userRef, {
      balance: admin.firestore.FieldValue.increment(totalReturn),
      stakes: updatedStakes,
      transactions: admin.firestore.FieldValue.arrayUnion(...newTransactions),
    });

    return { credited: totalReturn };
  });

  return { success: true, ...result };
});
