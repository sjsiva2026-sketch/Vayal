  // ── Confirm & unlock ─────────────────────────────────────────────────────
  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await upsertDailyPayment(uid, today, {
        status:        'paid',
        paidAt:        new Date().toISOString(),
        paymentMethod: selectedApp || 'upi',
        txnRef:        txnRef || '',
        txnVerified:   paymentStatus === 'success',
      });
      // Clear lock in Firestore
      await updateUser(uid, {
        isLocked:        false,
        paymentDeadline: null,
        commissionDate:  null,
        workStartedAt:   null,
      });
      // Clear lock in context → AppNavigator re-renders → initialRoute = 'OwnerDashboard'
      updateProfile({
        isLocked:        false,
        paymentDeadline: null,
        commissionDate:  null,
        workStartedAt:   null,
      });
      if (amount > 0) {
        await addAppAccountEntry({
          ownerId: uid, ownerName: userProfile?.name || '',
          ownerPhone: userProfile?.phone || '',
          amount, hectare, date: today,
          paymentMethod: selectedApp || 'upi',
          upiId: VAYAL_UPI, txnRef: txnRef || '',
          txnVerified: paymentStatus === 'success',
        });
      }
      setPaid(true);
    } catch (e) {
      Alert.alert('Error', e.message || 'Try again.');
    } finally {
      setConfirming(false);
    }
  };