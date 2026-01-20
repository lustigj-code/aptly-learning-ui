'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Snowflake, Sparkles, Check, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Modal } from '@/components/ui/Modal';
import { useUser } from '@/store/unifiedStore';
import { cn } from '@/lib/utils';
import { Z_INDEX } from '@/lib/design-tokens';

const STREAK_FREEZE_COST = 100; // XP cost for one streak freeze

type StreakShopProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function StreakShop({ isOpen, onClose }: StreakShopProps) {
  const { user, purchaseStreakFreeze } = useUser();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const currentXP = user?.progress?.xp ?? 0;
  const freezesAvailable = user?.streak?.freezesAvailable ?? 0;
  const canAfford = currentXP >= STREAK_FREEZE_COST;

  const handlePurchase = useCallback(async () => {
    if (!canAfford || isPurchasing) return;

    setIsPurchasing(true);
    setPurchaseError(null);

    try {
      const success = await purchaseStreakFreeze(STREAK_FREEZE_COST);

      if (success) {
        setPurchaseSuccess(true);

        // Fire celebration confetti
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { x: 0.5, y: 0.6 },
          colors: ['#21A8B0', '#FFDE00', '#88B644', '#3B336E'],
          zIndex: Z_INDEX.celebration,
        });

        // Auto-reset success state after animation
        setTimeout(() => {
          setPurchaseSuccess(false);
        }, 2500);
      } else {
        setPurchaseError('Not enough XP to purchase');
      }
    } catch {
      setPurchaseError('Failed to complete purchase');
    } finally {
      setIsPurchasing(false);
    }
  }, [canAfford, isPurchasing, purchaseStreakFreeze]);

  const handleClose = useCallback(() => {
    setPurchaseSuccess(false);
    setPurchaseError(null);
    onClose();
  }, [onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Streak Shop"
      description="Spend your XP to protect your streak"
      size="md"
    >
      <div className="space-y-6">
        {/* XP Balance */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-teal/10 to-light-teal rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal/20 flex items-center justify-center">
              <Sparkles size={20} className="text-teal" />
            </div>
            <div>
              <p className="text-sm text-rich-black/60">Your Balance</p>
              <p className="text-xl font-bold text-navy">{currentXP.toLocaleString()} XP</p>
            </div>
          </div>
        </div>

        {/* Shop Item - Streak Freeze */}
        <div className="border border-light-grey rounded-xl overflow-hidden">
          <div className="p-5">
            <div className="flex items-start gap-4">
              {/* Item Icon */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal to-teal-dark flex items-center justify-center flex-shrink-0">
                <Snowflake size={32} className="text-white" />
              </div>

              {/* Item Details */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-navy text-lg">Streak Freeze</h3>
                <p className="text-sm text-rich-black/60 mt-1">
                  Protect your streak for one day if you miss your learning goal.
                  Use it wisely!
                </p>

                {/* Current Inventory */}
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm text-rich-black/60">You have:</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-light-grey rounded-full text-sm font-medium text-navy">
                    <Snowflake size={14} />
                    {freezesAvailable}
                  </span>
                </div>
              </div>
            </div>

            {/* Price & Purchase */}
            <div className="mt-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-navy">{STREAK_FREEZE_COST}</span>
                <span className="text-rich-black/60">XP</span>
              </div>

              <button
                onClick={handlePurchase}
                disabled={!canAfford || isPurchasing || purchaseSuccess}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all',
                  canAfford && !purchaseSuccess
                    ? 'bg-teal text-white hover:bg-teal-dark active:scale-95'
                    : purchaseSuccess
                    ? 'bg-success text-white'
                    : 'bg-light-grey text-rich-black/40 cursor-not-allowed'
                )}
              >
                {isPurchasing ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <ShoppingBag size={18} />
                    </motion.div>
                    <span>Purchasing...</span>
                  </>
                ) : purchaseSuccess ? (
                  <>
                    <Check size={18} />
                    <span>Purchased!</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag size={18} />
                    <span>Purchase</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Not enough XP warning */}
          {!canAfford && (
            <div className="px-5 py-3 bg-warning/10 border-t border-warning/20 flex items-center gap-2 text-sm text-warning-dark">
              <AlertCircle size={16} />
              <span>You need {STREAK_FREEZE_COST - currentXP} more XP to purchase</span>
            </div>
          )}
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {purchaseError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 p-3 bg-error/10 rounded-xl text-sm text-error"
            >
              <AlertCircle size={16} />
              <span>{purchaseError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Purchase Success Animation */}
        <AnimatePresence>
          {purchaseSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="p-4 bg-gradient-to-r from-success/20 to-teal/20 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ duration: 0.5 }}
                  className="w-12 h-12 rounded-xl bg-success flex items-center justify-center"
                >
                  <Check size={24} className="text-white" />
                </motion.div>
                <div>
                  <motion.p
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="font-semibold text-navy"
                  >
                    Purchase Successful!
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-sm text-rich-black/60"
                  >
                    You now have {freezesAvailable} streak freeze{freezesAvailable !== 1 ? 's' : ''}
                  </motion.p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info Footer */}
        <div className="text-center text-xs text-rich-black/40">
          Earn XP by completing lessons and maintaining your streak
        </div>
      </div>
    </Modal>
  );
}
