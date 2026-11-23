// Web fallback for the R2CStoreKit plugin: there is no App Store on the
// website, so there are no products and no purchase. getProducts returning
// an empty list is the signal the IAP UI hides on — the same signal an
// unconfigured App Store Connect gives on iOS — so one code path covers
// both. purchase / showManageSubscriptions throw, because calling them on
// the web would be a bug (the UI never offers them there).
import { WebPlugin } from '@capacitor/core';

export class R2CStoreKitWeb extends WebPlugin {
  async getProducts() {
    return { products: [] };
  }

  async purchase() {
    throw this.unimplemented('In-app purchases are only available in the iOS app.');
  }

  async getCurrentEntitlements() {
    return { transactions: [] };
  }

  async finishTransaction() {
    return {};
  }

  async showManageSubscriptions() {
    throw this.unimplemented('In-app purchases are only available in the iOS app.');
  }
}
