/**
 * Cross-tab/Cross-window event bus for production environments
 * Uses BroadcastChannel API with localStorage fallback
 * Works across multiple browser tabs in production
 */

class CrossTabEventBus {
  private channel: BroadcastChannel | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private isClient: boolean;

  constructor() {
    this.isClient = typeof window !== 'undefined';
    
    if (!this.isClient) return;

    // Try BroadcastChannel first (modern browsers, production-ready)
    if ('BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('amir-traders-events');
        this.channel.onmessage = (event) => {
          this.notifyListeners(event.data.type, event.data.payload);
        };
        console.log('✅ CrossTabEventBus: Using BroadcastChannel API');
      } catch (e) {
        console.warn('BroadcastChannel failed, using localStorage fallback', e);
        this.setupLocalStorageFallback();
      }
    } else {
      // Fallback to localStorage for older browsers
      console.log('⚠️ BroadcastChannel not supported, using localStorage fallback');
      this.setupLocalStorageFallback();
    }
  }

  private setupLocalStorageFallback() {
    if (!this.isClient) return;
    
    console.log('✅ CrossTabEventBus: Using localStorage fallback');
    
    // Listen to storage events from other tabs
    window.addEventListener('storage', (e) => {
      if (e.key === 'amir-traders-event' && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          // Only process recent events (within last 5 seconds)
          if (Date.now() - data.timestamp < 5000) {
            this.notifyListeners(data.type, data.payload);
          }
        } catch (err) {
          console.error('Failed to parse event from localStorage', err);
        }
      }
    });
  }

  emit(type: string, payload?: any) {
    if (!this.isClient) return;

    const data = { type, payload, timestamp: Date.now() };
    
    console.log(`📡 CrossTabEventBus emitting: ${type}`, payload);

    if (this.channel) {
      // Use BroadcastChannel - works in production across tabs
      try {
        this.channel.postMessage(data);
      } catch (err) {
        console.error('BroadcastChannel postMessage failed', err);
      }
    } else {
      // Use localStorage fallback
      try {
        localStorage.setItem('amir-traders-event', JSON.stringify(data));
        // Clear after 100ms to allow re-triggering
        setTimeout(() => {
          const current = localStorage.getItem('amir-traders-event');
          if (current === JSON.stringify(data)) {
            localStorage.removeItem('amir-traders-event');
          }
        }, 100);
      } catch (err) {
        console.error('localStorage event emit failed', err);
      }
    }

    // Also notify same-tab listeners immediately
    this.notifyListeners(type, payload);
  }

  on(type: string, callback: Function) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);
    
    console.log(`👂 CrossTabEventBus: Listener added for "${type}" (${this.listeners.get(type)!.size} total)`);

    // Return unsubscribe function
    return () => {
      this.off(type, callback);
    };
  }

  off(type: string, callback: Function) {
    const callbacks = this.listeners.get(type);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(type);
      }
    }
  }

  private notifyListeners(type: string, payload?: any) {
    const callbacks = this.listeners.get(type);
    if (callbacks && callbacks.size > 0) {
      console.log(`🔔 CrossTabEventBus: Notifying ${callbacks.size} listeners for "${type}"`);
      callbacks.forEach(callback => {
        try {
          callback(payload);
        } catch (err) {
          console.error(`Error in event listener for ${type}:`, err);
        }
      });
    }
  }

  destroy() {
    if (this.channel) {
      this.channel.close();
    }
    this.listeners.clear();
  }
}

// Singleton instance
export const crossTabEventBus = new CrossTabEventBus();

// Convenience functions for common events
export const emitStoreUpdated = () => {
  console.log('🏪 Emitting storeUpdated event');
  crossTabEventBus.emit('storeUpdated');
};

export const onStoreUpdated = (callback: Function) => {
  return crossTabEventBus.on('storeUpdated', callback);
};

export const emitProductUpdated = () => crossTabEventBus.emit('productUpdated');
export const onProductUpdated = (callback: Function) => crossTabEventBus.on('productUpdated', callback);

export const emitCustomerUpdated = () => crossTabEventBus.emit('customerUpdated');
export const onCustomerUpdated = (callback: Function) => crossTabEventBus.on('customerUpdated', callback);

export const emitSupplierUpdated = () => crossTabEventBus.emit('supplierUpdated');
export const onSupplierUpdated = (callback: Function) => crossTabEventBus.on('supplierUpdated', callback);

// Stock update events: emitted when stock is added or reduced so listeners (eg. Store Stock page)
// can refresh on-demand instead of polling.
export const emitStockUpdated = () => {
  console.log('📦 Emitting stockUpdated event');
  crossTabEventBus.emit('stockUpdated');
};

export const onStockUpdated = (callback: Function) => {
  return crossTabEventBus.on('stockUpdated', callback);
};

// Sale Invoice events
export const emitSaleInvoiceAdded = () => {
  console.log('📄 Emitting saleInvoiceAdded event');
  crossTabEventBus.emit('saleInvoiceAdded');
};

export const emitSaleInvoiceUpdated = () => {
  console.log('📝 Emitting saleInvoiceUpdated event');
  crossTabEventBus.emit('saleInvoiceUpdated');
};

export const emitSaleInvoiceDeleted = () => {
  console.log('🗑️ Emitting saleInvoiceDeleted event');
  crossTabEventBus.emit('saleInvoiceDeleted');
};

export const onSaleInvoiceChanged = (callback: Function) => {
  const unsub1 = crossTabEventBus.on('saleInvoiceAdded', callback);
  const unsub2 = crossTabEventBus.on('saleInvoiceUpdated', callback);
  const unsub3 = crossTabEventBus.on('saleInvoiceDeleted', callback);
  return () => {
    unsub1();
    unsub2();
    unsub3();
  };
};

// Purchase Invoice events
export const emitPurchaseInvoiceAdded = () => {
  console.log('📦 Emitting purchaseInvoiceAdded event');
  crossTabEventBus.emit('purchaseInvoiceAdded');
};

export const emitPurchaseInvoiceUpdated = () => {
  console.log('📝 Emitting purchaseInvoiceUpdated event');
  crossTabEventBus.emit('purchaseInvoiceUpdated');
};

export const emitPurchaseInvoiceDeleted = () => {
  console.log('🗑️ Emitting purchaseInvoiceDeleted event');
  crossTabEventBus.emit('purchaseInvoiceDeleted');
};

export const onPurchaseInvoiceChanged = (callback: Function) => {
  const unsub1 = crossTabEventBus.on('purchaseInvoiceAdded', callback);
  const unsub2 = crossTabEventBus.on('purchaseInvoiceUpdated', callback);
  const unsub3 = crossTabEventBus.on('purchaseInvoiceDeleted', callback);
  return () => {
    unsub1(); unsub2(); unsub3();
  };
};

// Production events
export const emitProductionAdded = () => {
  console.log('🏭 Emitting productionAdded event');
  crossTabEventBus.emit('productionAdded');
};

export const emitProductionUpdated = () => {
  console.log('🏭 Emitting productionUpdated event');
  crossTabEventBus.emit('productionUpdated');
};

export const emitProductionDeleted = () => {
  console.log('🏭 Emitting productionDeleted event');
  crossTabEventBus.emit('productionDeleted');
};

export const onProductionChanged = (callback: Function) => {
  const unsub1 = crossTabEventBus.on('productionAdded', callback);
  const unsub2 = crossTabEventBus.on('productionUpdated', callback);
  const unsub3 = crossTabEventBus.on('productionDeleted', callback);
  return () => {
    unsub1();
    unsub2();
    unsub3();
  };
};
