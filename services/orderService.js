// Simple in-memory order storage
// TODO: Replace with database (MongoDB, PostgreSQL, etc.) for production

const { v4: uuidv4 } = require('uuid');

class OrderService {
  constructor() {
    // In-memory storage (replace with database)
    this.orders = new Map();
  }
  
  /**
   * Save order
   */
  async saveOrder(orderData) {
    const orderId = uuidv4();
    const order = {
      id: orderId,
      ...orderData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.orders.set(orderId, order);
    
    // TODO: Save to database here
    // await db.orders.insert(order);
    
    console.log(`💾 Order saved: ${orderId}`);
    return orderId;
  }
  
  /**
   * Get order by ID
   */
  async getOrder(orderId) {
    const order = this.orders.get(orderId);
    
    // TODO: Fetch from database
    // const order = await db.orders.findOne({ id: orderId });
    
    return order || null;
  }
  
  /**
   * Get order by Toast order ID
   */
  async getOrderByToastId(toastOrderId) {
    for (const [id, order] of this.orders.entries()) {
      if (order.toastOrderId === toastOrderId) {
        return order;
      }
    }
    
    // TODO: Query database
    // return await db.orders.findOne({ toastOrderId });
    
    return null;
  }
  
  /**
   * Update order status
   */
  async updateOrderStatus(orderId, status) {
    const order = this.orders.get(orderId);
    if (order) {
      order.status = status;
      order.updatedAt = new Date();
      this.orders.set(orderId, order);
      
      // TODO: Update in database
      // await db.orders.updateOne({ id: orderId }, { $set: { status, updatedAt: new Date() } });
      
      console.log(`📝 Order ${orderId} status updated to: ${status}`);
      return true;
    }
    return false;
  }
  
  /**
   * Update order with additional data
   */
  async updateOrder(orderId, updates) {
    const order = this.orders.get(orderId);
    if (order) {
      Object.assign(order, updates);
      order.updatedAt = new Date();
      this.orders.set(orderId, order);
      
      // TODO: Update in database
      // await db.orders.updateOne({ id: orderId }, { $set: { ...updates, updatedAt: new Date() } });
      
      console.log(`📝 Order ${orderId} updated`);
      return true;
    }
    return false;
  }
  
  /**
   * Get orders with shipping (for admin)
   * Only returns orders that have shipping address (merchandise orders)
   */
  async getShippingOrders() {
    const allOrders = Array.from(this.orders.values());
    
    // Filter orders that have shipping (merchandise orders)
    // Only include orders that explicitly have a shippingAddress (not just pickupLocation)
    const shippingOrders = allOrders.filter(order => {
      // Must have shippingAddress (not pickupLocation) - this indicates merchandise order
      const hasShippingAddress = order.shippingAddress && 
        (typeof order.shippingAddress === 'object' || 
         (typeof order.shippingAddress === 'string' && order.shippingAddress.trim().length > 0));
      
      // Also check if order has shippingLabelStatus set (indicates merchandise order)
      const hasShippingLabelStatus = order.shippingLabelStatus !== null && order.shippingLabelStatus !== undefined;
      
      return hasShippingAddress || hasShippingLabelStatus || order.shippingTrackingNumber || order.shippingLabel;
    });
    
    // Map to ShippingOrder format
    return shippingOrders.map(order => ({
      id: order.id,
      orderId: order.id,
      orderNumber: order.orderNumber || `ORD-${order.id.substring(0, 8).toUpperCase()}`,
      customerName: order.customer?.firstName && order.customer?.lastName 
        ? `${order.customer.firstName} ${order.customer.lastName}`
        : order.customer?.email || 'Customer',
      customerEmail: order.customer?.email || '',
      orderDate: order.createdAt || new Date(),
      total: order.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0,
      itemCount: order.items?.length || 0,
      shippingAddress: this.formatShippingAddress(order.shippingAddress || order.pickupLocation),
      trackingNumber: order.shippingTrackingNumber || order.shippingLabel || null,
      labelStatus: order.shippingLabelStatus || 'pending',
      labelCreatedAt: order.shippingLabelCreatedAt || null
    }));
  }
  
  /**
   * Format shipping address for display
   */
  formatShippingAddress(address) {
    if (!address) return 'No address';
    
    if (typeof address === 'string') {
      return address;
    }
    
    // Handle Address object
    const parts = [];
    if (address.street1) parts.push(address.street1);
    if (address.street2) parts.push(address.street2);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.zip || address.zipCode) parts.push(address.zip || address.zipCode);
    
    return parts.join(', ') || 'No address';
  }
  
  /**
   * Update shipping label status
   */
  async updateShippingLabelStatus(orderId, status) {
    const order = this.orders.get(orderId);
    if (order) {
      order.shippingLabelStatus = status;
      order.updatedAt = new Date();
      
      if (status === 'printed') {
        order.shippingLabelPrintedAt = new Date();
      } else if (status === 'shipped') {
        order.shippingLabelShippedAt = new Date();
      }
      
      this.orders.set(orderId, order);
      
      console.log(`📝 Shipping label status for order ${orderId} updated to: ${status}`);
      return true;
    }
    return false;
  }
  
  /**
   * Update order by Toast order ID
   */
  async updateOrderByToastId(toastOrderId, status) {
    const order = await this.getOrderByToastId(toastOrderId);
    if (order) {
      return await this.updateOrderStatus(order.id, status);
    }
    return false;
  }
  
  /**
   * Get all orders (for admin/debugging)
   */
  async getAllOrders() {
    return Array.from(this.orders.values());
    
    // TODO: Fetch from database
    // return await db.orders.find({}).toArray();
  }
}

module.exports = new OrderService();

