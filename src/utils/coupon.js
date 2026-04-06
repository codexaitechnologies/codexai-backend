/**
 * Coupon validation and discount calculation utility
 * Coupons are stored in DynamoDB - this utility handles validation logic
 */

/**
 * Calculate discount based on coupon type and value
 * @param {Object} coupon - Coupon object from database
 * @param {number} amount - Original amount in rupees
 * @returns {Object} { isValid: boolean, discount: number, finalAmount: number, message: string }
 */
const calculateDiscount = (coupon, amount) => {
  let discount = 0;

  if (coupon.type === 'flat') {
    discount = coupon.value;
  } else if (coupon.type === 'percentage') {
    discount = Math.floor((amount * coupon.value) / 100);

    // Apply max discount cap if specified
    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }
  }

  // Ensure discount doesn't exceed amount
  discount = Math.min(discount, amount);

  return {
    discount: discount,
    finalAmount: amount - discount,
  };
};

/**
 * Validate coupon code and calculate discount
 * Note: This function expects the coupon to already be fetched from the database
 * @param {Object} coupon - Coupon object from database
 * @param {number} amount - Original amount in rupees
 * @returns {Object} { isValid: boolean, discount: number, finalAmount: number, message: string }
 */
const validateAndApplyCoupon = (coupon, amount) => {
  const result = {
    isValid: false,
    discount: 0,
    finalAmount: amount,
    message: '',
    couponDetails: null,
  };

  if (!coupon) {
    result.message = 'Coupon not found';
    return result;
  }

  // Check if coupon is active
  if (!coupon.isActive) {
    result.message = `Coupon code is inactive: ${coupon.couponCode}`;
    return result;
  }

  // Check if coupon has expired
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    result.message = `Coupon code expired: ${coupon.couponCode}`;
    return result;
  }

  // Check minimum amount requirement
  if (coupon.minAmount && amount < coupon.minAmount) {
    result.message = `Minimum order amount for this coupon is ₹${coupon.minAmount}`;
    return result;
  }

  // Check maximum uses
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    result.message = `Coupon usage limit exceeded: ${coupon.couponCode}`;
    return result;
  }

  const discountCalc = calculateDiscount(coupon, amount);

  result.isValid = true;
  result.discount = discountCalc.discount;
  result.finalAmount = discountCalc.finalAmount;
  result.message = `Coupon applied: ${coupon.description}`;
  result.couponDetails = {
    code: coupon.couponCode,
    type: coupon.type,
    description: coupon.description,
    value: coupon.value,
  };

  return result;
};

module.exports = {
  validateAndApplyCoupon,
  calculateDiscount,
};
