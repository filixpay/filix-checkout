'use client';

import { useState, useEffect, Suspense } from 'react';
import { signOut } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { OrderCreateRequest, OrderItemRequest } from '@/types/checkout';
import styles from './order.module.css';

// 生成商户订单号：年月日+6位随机数
function generateMerchantOrderId() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
  return `${year}${month}${day}${random}`;
}

// 计算总金额
function calculateTotalAmount(orderItems: OrderItemRequest[]) {
  return orderItems.reduce((total, item) => {
    const quantity = item.quantity || 0;
    const unitPrice = item.unitPrice || 0;
    return total + (quantity * unitPrice);
  }, 0);
}

function OrderForm() {
  const searchParams = useSearchParams();
  
  const [formData, setFormData] = useState<Partial<OrderCreateRequest>>({
    merchantOrderId: generateMerchantOrderId(),
    subject: '',
    totalAmount: { amount: 0, currency: 'USD' },
    orderItems: [],
    customerName: '',
    customerEmail: '',
    customermobile: ''
  });

  const [orderItems, setOrderItems] = useState<OrderItemRequest[]>([
    {
      businessProductId: '',
      description: '',
      quantity: 1,
      unitPrice: 0
    }
  ]);

  // 从 URL 参数初始化数据
  useEffect(() => {
    const description = searchParams.get('description');
    const businessProductId = searchParams.get('businessProductId');
    const quantity = searchParams.get('quantity');
    const unitPrice = searchParams.get('unitPrice');
    const currency = searchParams.get('currency');

    if (description || businessProductId || quantity || unitPrice || currency) {
      if (description) {
        setFormData(prev => ({ ...prev, subject: description }));
      }
      
      if (currency) {
        setFormData(prev => ({
          ...prev,
          totalAmount: { ...prev.totalAmount!, currency: currency }
        }));
      }

      setOrderItems([{
        businessProductId: businessProductId || '',
        description: description || '',
        quantity: quantity ? Number(quantity) : 1,
        unitPrice: unitPrice ? Number(unitPrice) : 0
      }]);
    }
  }, [searchParams]);

  // 自动计算总金额
  useEffect(() => {
    const total = calculateTotalAmount(orderItems);
    setFormData(prev => ({
      ...prev,
      totalAmount: { ...prev.totalAmount!, amount: total }
    }));
  }, [orderItems]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      totalAmount: { ...prev.totalAmount!, currency: value }
    }));
  };

  const handleOrderItemChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newItems = [...orderItems];
    newItems[index] = { ...newItems[index], [name]: value === '' ? 0 : Number(value) };
    setOrderItems(newItems);
  };

  const addOrderItem = () => {
    setOrderItems([...orderItems, {
      businessProductId: '',
      description: '',
      quantity: 1,
      unitPrice: 0
    }]);
  };

  const removeOrderItem = (index: number) => {
    if (orderItems.length > 1) {
      const newItems = orderItems.filter((_, i) => i !== index);
      setOrderItems(newItems);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const orderData: OrderCreateRequest = {
      ...formData as OrderCreateRequest,
      orderItems
    };
    
    try {
      const response = await fetch('/api/checkout/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      });
      
      const result = await response.json();
      
      if (result.code === 'SUCCESS') {
        const merchantOrderId = result.data.merchantOrderId;
        const paymentTokenResponse = await fetch(`/api/checkout/payment-token/${merchantOrderId}`);
        const paymentTokenResult = await paymentTokenResponse.json();
        
        if (paymentTokenResult.success) {
          const paymentToken = paymentTokenResult.data;
          await signOut({ redirect: false });
          const checkoutUrl = `/?token=${encodeURIComponent(paymentToken)}`;
          window.location.href = checkoutUrl;
        } else {
          alert(`获取支付令牌失败: ${paymentTokenResult.message}`);
        }
      } else {
        alert(`Error creating order: ${result.message}`);
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      alert('Failed to create order. Please try again.');
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Create Order</h1>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Order Information</h2>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="merchantOrderId">Merchant Order ID</label>
              <input
                type="text"
                id="merchantOrderId"
                name="merchantOrderId"
                value={formData.merchantOrderId}
                readOnly
                className={styles.readOnlyInput}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="subject">Order Title</label>
              <input
                type="text"
                id="subject"
                name="subject"
                placeholder="Enter order title"
                value={formData.subject}
                onChange={handleInputChange}
                required
                maxLength={200}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>Currency</label>
              <select
                value={formData.totalAmount?.currency}
                onChange={handleCurrencyChange}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="CNY">CNY</option>
                <option value="JPY">JPY</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>商品明细</h2>
            {orderItems.length < 100 && (
              <button type="button" className={styles.addButton} onClick={addOrderItem}>
                <span>+</span> 添加商品
              </button>
            )}
          </div>

          <div className={styles.itemTable}>
            <div className={styles.tableHeader}>
              <div className={styles.headerCell}>商品ID</div>
              <div className={styles.headerCell}>描述</div>
              <div className={styles.headerCell}>数量</div>
              <div className={styles.headerCell}>单价</div>
              <div className={styles.headerCell}></div>
            </div>

            {orderItems.map((item, index) => (
              <div key={index} className={styles.itemRow}>
                <input
                  type="text"
                  placeholder="商品ID"
                  name="businessProductId"
                  value={item.businessProductId}
                  onChange={(e) => {
                    const { name, value } = e.target;
                    const newItems = [...orderItems];
                    newItems[index] = { ...newItems[index], [name]: value };
                    setOrderItems(newItems);
                  }}
                  className={styles.itemInput}
                />
                <input
                  type="text"
                  placeholder="描述"
                  name="description"
                  value={item.description}
                  onChange={(e) => {
                    const { name, value } = e.target;
                    const newItems = [...orderItems];
                    newItems[index] = { ...newItems[index], [name]: value };
                    setOrderItems(newItems);
                  }}
                  className={styles.itemInput}
                />
                <input
                  type="number"
                  placeholder="1"
                  name="quantity"
                  value={item.quantity}
                  onChange={(e) => handleOrderItemChange(index, e)}
                  step="0.01"
                  min="0"
                  className={styles.itemInput}
                />
                <input
                  type="number"
                  placeholder="0"
                  name="unitPrice"
                  value={item.unitPrice}
                  onChange={(e) => handleOrderItemChange(index, e)}
                  step="0.01"
                  min="0"
                  className={styles.itemInput}
                />
                <div>
                  {orderItems.length > 1 && (
                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => removeOrderItem(index)}
                      title="Remove item"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.summaryBox}>
            <div className={styles.summaryLabel}>总金额</div>
            <div className={styles.summaryAmount}>
              <span className={styles.currencyLabel}>{formData.totalAmount?.currency}</span>
              {formData.totalAmount?.amount.toFixed(2)}
            </div>
          </div>
        </div>
        
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Customer Information</h2>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="customerName">Customer Name</label>
              <input
                type="text"
                id="customerName"
                name="customerName"
                placeholder="John Doe"
                value={formData.customerName}
                onChange={handleInputChange}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="customerEmail">Customer Email</label>
              <input
                type="email"
                id="customerEmail"
                name="customerEmail"
                placeholder="john@example.com"
                value={formData.customerEmail}
                onChange={handleInputChange}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="customermobile">Customer Mobile</label>
              <input
                type="tel"
                id="customermobile"
                name="customermobile"
                placeholder="+1 234 567 890"
                value={formData.customermobile}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </div>
        
        <button type="submit" className={styles.submitButton}>
          Create Order
        </button>
      </form>
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OrderForm />
    </Suspense>
  );
}