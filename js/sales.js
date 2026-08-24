// ============================================
// SALES.JS - Complete Sales Management Module
// ============================================

// ===== LOAD SALES =====
async function loadSales() {
    try {
        const snapshot = await db.orderBy('sales', 'saleDate', 'desc').get();
        salesData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        renderSales(salesData);
    } catch (error) {
        console.error('Load sales error:', error);
        showToast('Failed to load sales', 'error');
    }
}

// ===== RENDER SALES TABLE =====
function renderSales(sales) {
    const container = document.getElementById('salesContainer');
    
    if (sales.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-shopping-cart"></i>
                <h3>No Sales Yet</h3>
                <p>Start making your first sale</p>
                <button class="btn-primary" onclick="showSaleModal()">New Sale</button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Invoice</th>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Total</th>
                        <th>Payment</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${sales.map(s => `
                        <tr>
                            <td><strong>${s.invoiceNumber || '-'}</strong></td>
                            <td>${new Date(s.saleDate).toLocaleDateString()}</td>
                            <td>${s.customerName || 'Walk-in'}</td>
                            <td>${formatCurrency(s.totalAmount || 0)}</td>
                            <td>${s.paymentMethod || 'cash'}</td>
                            <td><span class="status-badge ${s.status || 'pending'}">${s.status || 'pending'}</span></td>
                            <td class="table-actions">
                                ${s.status === 'pending' && s.paymentMethod === 'pending_payment' ? `
                                    <button class="btn-sm success" onclick="processPayment('${s.id}')" title="Process Payment">
                                        <i class="fas fa-money-bill-wave"></i>
                                    </button>
                                    <button class="btn-sm danger" onclick="cancelPendingPayment('${s.id}')" title="Cancel Payment">
                                        <i class="fas fa-times"></i>
                                    </button>
                                ` : ''}
                                <button class="btn-sm info" onclick="viewSaleDetails('${s.id}')" title="View Details">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ===== FILTER SALES =====
function filterSales() {
    const search = document.getElementById('salesSearch').value.toLowerCase();
    const status = document.getElementById('salesStatusFilter').value;
    let filtered = salesData;
    if (search) filtered = filtered.filter(s => 
        (s.invoiceNumber || '').toLowerCase().includes(search) ||
        (s.customerName || '').toLowerCase().includes(search)
    );
    if (status) filtered = filtered.filter(s => s.status === status);
    renderSales(filtered);
}

// ===== SHOW SALE MODAL =====
function showSaleModal() {
    document.getElementById('saleForm').reset();
    document.getElementById('saleItemsContainer').innerHTML = '';
    document.getElementById('saleSubtotal').textContent = '0.00';
    document.getElementById('saleTax').textContent = '0.00';
    document.getElementById('saleTotal').textContent = '0.00';
    document.getElementById('saleDiscount').value = '0';
    addSaleItem();
    loadSaleCustomers();
    openModal('saleModal');
}

// ===== LOAD SALE CUSTOMERS =====
async function loadSaleCustomers() {
    try {
        const snapshot = await db.get('customers');
        const select = document.getElementById('saleCustomer');
        select.innerHTML = '<option value="">Walk-in Customer</option>' +
            snapshot.docs.map(d => `<option value="${d.id}">${d.data().name}</option>`).join('');
    } catch (error) {
        console.error('Load customers error:', error);
    }
}

// ===== ADD SALE ITEM =====
function addSaleItem() {
    const container = document.getElementById('saleItemsContainer');
    const row = document.createElement('div');
    row.className = 'sale-item-row';
    
    let productOptions = '<option value="">Select Product</option>';
    inventoryData.forEach(p => {
        productOptions += `<option value="${p.id}" data-price="${p.sellingPrice || 0}" data-stock="${p.currentStock || 0}">
            ${p.name} (Stock: ${p.currentStock || 0})
        </option>`;
    });
    
    row.innerHTML = `
        <select class="sale-product" onchange="updateItemFields(this)">
            ${productOptions}
        </select>
        <input type="number" class="sale-qty" placeholder="Qty" min="0" value="1" onchange="calculateSaleTotal()">
        <input type="number" class="sale-price-input" placeholder="Price" step="0.01" onchange="calculateSaleTotal()">
        <button type="button" onclick="this.closest('.sale-item-row').remove(); calculateSaleTotal();">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(row);
}

// ===== UPDATE ITEM FIELDS =====
function updateItemFields(select) {
    const row = select.closest('.sale-item-row');
    const priceInput = row.querySelector('.sale-price-input');
    const qtyInput = row.querySelector('.sale-qty');
    const selected = select.options[select.selectedIndex];
    
    if (selected.value) {
        priceInput.value = selected.dataset.price || 0;
        priceInput.disabled = false;
        qtyInput.disabled = false;
        qtyInput.value = 1;
    } else {
        priceInput.value = '';
        priceInput.disabled = true;
        qtyInput.value = 0;
        qtyInput.disabled = true;
    }
    
    calculateSaleTotal();
}

// ===== CALCULATE SALE TOTAL =====
function calculateSaleTotal() {
    const rows = document.querySelectorAll('.sale-item-row');
    let subtotal = 0;
    let hasValidItem = false;
    
    rows.forEach(row => {
        const productSelect = row.querySelector('.sale-product');
        const qty = parseFloat(row.querySelector('.sale-qty').value) || 0;
        const price = parseFloat(row.querySelector('.sale-price-input').value) || 0;
        
        if (productSelect.value) {
            if (qty === 0 || qty === null || isNaN(qty) || qty === '') {
                subtotal += price;
            } else {
                subtotal += qty * price;
            }
            hasValidItem = true;
        }
    });
    
    const discount = parseFloat(document.getElementById('saleDiscount').value) || 0;
    const tax = subtotal * 0.15;
    const total = subtotal + tax - discount;
    
    document.getElementById('saleSubtotal').textContent = formatCurrency(subtotal);
    document.getElementById('saleTax').textContent = formatCurrency(tax);
    document.getElementById('saleTotal').textContent = formatCurrency(total);
    
    const submitBtn = document.querySelector('#saleForm .btn-primary');
    if (submitBtn) {
        submitBtn.disabled = !hasValidItem;
        submitBtn.style.opacity = hasValidItem ? '1' : '0.5';
        submitBtn.style.cursor = hasValidItem ? 'pointer' : 'not-allowed';
    }
}

// ===== TOGGLE PAYMENT FIELDS =====
function togglePaymentFields() {
    const method = document.getElementById('salePaymentMethod').value;
    document.getElementById('bankField').style.display = method === 'bank_transfer' ? 'block' : 'none';
}

// ===== SALE FORM SUBMIT =====
document.getElementById('saleForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const customerId = document.getElementById('saleCustomer').value;
    const paymentMethod = document.getElementById('salePaymentMethod').value;
    const bank = document.getElementById('saleBank').value;
    const discount = parseFloat(document.getElementById('saleDiscount').value) || 0;
    
    const rows = document.querySelectorAll('.sale-item-row');
    const items = [];
    let hasItem = false;
    
    rows.forEach(row => {
        const productId = row.querySelector('.sale-product').value;
        const quantity = parseInt(row.querySelector('.sale-qty').value) || 0;
        const unitPrice = parseFloat(row.querySelector('.sale-price-input').value) || 0;
        
        if (productId) {
            items.push({ productId, quantity, unitPrice });
            hasItem = true;
        }
    });
    
    if (!hasItem || items.length === 0) {
        showToast('Please add at least one item', 'error');
        return;
    }
    
    let subtotal = 0;
    items.forEach(item => {
        if (item.quantity === 0 || item.quantity === null || isNaN(item.quantity) || item.quantity === '') {
            subtotal += item.unitPrice;
        } else {
            subtotal += item.quantity * item.unitPrice;
        }
    });
    
    const tax = subtotal * 0.15;
    const total = subtotal + tax - discount;
    
    try {
        const batch = db.batch();
        const saleRef = db.doc('sales', Date.now().toString(36) + Math.random().toString(36).substring(2, 6));
        const invoiceNumber = generateId('INV');
        
        for (const item of items) {
            if (item.quantity > 0) {
                const productDoc = await db.doc('products', item.productId).get();
                if (!productDoc.exists) {
                    throw new Error(`Product not found`);
                }
                const productData = productDoc.data();
                if ((productData.currentStock || 0) < item.quantity) {
                    throw new Error(`Insufficient stock for ${productData.name}. Available: ${productData.currentStock}`);
                }
                batch.update(db.doc('products', item.productId), {
                    currentStock: (productData.currentStock || 0) - item.quantity,
                    soldCount: (productData.soldCount || 0) + item.quantity
                });
            }
        }
        
        let customerName = 'Walk-in Customer';
        let customerIdToUpdate = null;
        
        if (customerId) {
            const customerDoc = await db.doc('customers', customerId).get();
            if (customerDoc.exists) {
                customerName = customerDoc.data().name;
                customerIdToUpdate = customerId;
            }
        }
        
        const saleData = {
            invoiceNumber,
            customerId: customerId || null,
            customerName: customerName,
            saleDate: new Date().toISOString(),
            items: items,
            subtotal: subtotal,
            discount: discount,
            tax: tax,
            totalAmount: total,
            paidAmount: paymentMethod === 'pending_payment' ? 0 : total,
            pendingAmount: paymentMethod === 'pending_payment' ? total : 0,
            paymentMethod: paymentMethod,
            bankName: paymentMethod === 'bank_transfer' ? bank : null,
            status: paymentMethod === 'pending_payment' ? 'pending' : 'completed',
            createdAt: new Date().toISOString()
        };
        
        batch.set(saleRef, saleData);
        
        if (paymentMethod === 'pending_payment' && customerIdToUpdate) {
            const customerDoc = await db.doc('customers', customerIdToUpdate).get();
            if (customerDoc.exists) {
                const currentBalance = customerDoc.data().creditBalance || 0;
                batch.update(db.doc('customers', customerIdToUpdate), {
                    creditBalance: currentBalance + total,
                    pendingAmount: (customerDoc.data().pendingAmount || 0) + total
                });
            }
        }
        
        if (paymentMethod === 'pending_payment') {
            const pendingRef = db.doc('pendingPayments', Date.now().toString(36) + Math.random().toString(36).substring(2, 6));
            batch.set(pendingRef, {
                saleId: saleRef.id,
                customerId: customerId || null,
                customerName: customerName,
                amount: total,
                status: 'waiting',
                createdAt: new Date().toISOString()
            });
        }
        
        await batch.commit();
        showToast('Sale completed successfully!', 'success');
        closeModal('saleModal');
        loadSales();
        loadDashboard();
        loadInventory();
        loadCustomers();
    } catch (error) {
        showToast('Failed to create sale: ' + error.message, 'error');
    }
});

// ===== PROCESS PAYMENT - SUPPORTS WALK-IN CUSTOMERS =====
window.processPayment = async function(saleId) {
    try {
        const saleDoc = await db.doc('sales', saleId).get();
        if (!saleDoc.exists) {
            showToast('Sale not found', 'error');
            return;
        }
        
        const sale = saleDoc.data();
        if (sale.status !== 'pending') {
            showToast('This sale is not pending', 'warning');
            return;
        }
        
        // Get customer name - handle both registered and walk-in
        let customerName = 'Walk-in Customer';
        let customerId = null;
        
        if (sale.customerId) {
            const customerDoc = await db.doc('customers', sale.customerId).get();
            if (customerDoc.exists) {
                customerName = customerDoc.data().name;
                customerId = sale.customerId;
            }
        } else {
            // Walk-in customer - use the name from sale or default
            customerName = sale.customerName || 'Walk-in Customer';
        }
        
        const totalPending = sale.pendingAmount || sale.totalAmount || 0;
        
        // Set up payment modal
        document.getElementById('paymentSaleId').value = saleId;
        document.getElementById('paymentCustomerId').value = customerId || ''; // Empty for walk-in
        document.getElementById('paymentInvoice').value = sale.invoiceNumber;
        document.getElementById('paymentCustomerName').value = customerName;
        document.getElementById('paymentTotalAmount').value = formatCurrency(totalPending);
        document.getElementById('paymentMaxAmount').textContent = formatCurrency(totalPending);
        document.getElementById('paymentAmount').value = '';
        document.getElementById('paymentAmount').max = totalPending;
        document.getElementById('paymentRemaining').value = formatCurrency(totalPending);
        
        // Show/hide customer warning for walk-in
        const existingWarning = document.getElementById('walkInWarning');
        if (existingWarning) existingWarning.remove();
        
        if (!sale.customerId) {
            const warning = document.createElement('div');
            warning.id = 'walkInWarning';
            warning.style.cssText = `
                padding: 10px 12px;
                background: rgba(255, 152, 0, 0.15);
                border: 1px solid var(--warning);
                border-radius: var(--radius);
                margin-bottom: 16px;
                color: var(--warning);
                font-size: 13px;
                display: flex;
                align-items: center;
                gap: 8px;
            `;
            warning.innerHTML = `
                <i class="fas fa-info-circle"></i>
                <span>Walk-in customer payment - No credit balance will be affected</span>
            `;
            const modalBody = document.querySelector('#paymentModal .modal-body');
            modalBody.insertBefore(warning, modalBody.firstChild);
        }
        
        document.getElementById('paymentAmount').oninput = function() {
            const total = totalPending;
            const amount = parseFloat(this.value) || 0;
            const remaining = Math.max(0, total - amount);
            document.getElementById('paymentRemaining').value = formatCurrency(remaining);
            
            if (amount > total) {
                this.style.borderColor = 'var(--danger)';
                document.querySelector('#paymentForm .btn-success').disabled = true;
            } else if (amount <= 0) {
                this.style.borderColor = 'var(--danger)';
                document.querySelector('#paymentForm .btn-success').disabled = true;
            } else {
                this.style.borderColor = '';
                document.querySelector('#paymentForm .btn-success').disabled = false;
            }
        };
        
        document.querySelector('#paymentForm .btn-success').disabled = true;
        openModal('paymentModal');
    } catch (error) {
        console.error('Error processing payment:', error);
        showToast('Failed to process payment', 'error');
    }
};

// ===== PAYMENT FORM SUBMIT - SUPPORTS WALK-IN =====
document.getElementById('paymentForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const saleId = document.getElementById('paymentSaleId').value;
    const customerId = document.getElementById('paymentCustomerId').value;
    const paymentMethod = document.getElementById('paymentMethod').value;
    const paymentAmount = parseFloat(document.getElementById('paymentAmount').value) || 0;
    
    if (paymentAmount <= 0) {
        showToast('Please enter a valid payment amount', 'error');
        return;
    }
    
    try {
        const saleDoc = await db.doc('sales', saleId).get();
        if (!saleDoc.exists) {
            showToast('Sale not found', 'error');
            return;
        }
        
        const sale = saleDoc.data();
        const totalPending = sale.pendingAmount || sale.totalAmount || 0;
        
        if (paymentAmount > totalPending) {
            showToast('Payment amount cannot exceed pending amount', 'error');
            return;
        }
        
        const batch = db.batch();
        const isFullPayment = paymentAmount >= totalPending;
        const newPendingAmount = totalPending - paymentAmount;
        
        // Update sale
        if (isFullPayment) {
            batch.update(db.doc('sales', saleId), {
                status: 'completed',
                paidAmount: (sale.paidAmount || 0) + paymentAmount,
                pendingAmount: 0,
                updatedAt: new Date().toISOString()
            });
        } else {
            batch.update(db.doc('sales', saleId), {
                paidAmount: (sale.paidAmount || 0) + paymentAmount,
                pendingAmount: newPendingAmount,
                updatedAt: new Date().toISOString()
            });
        }
        
        // Only update customer credit if customer is registered
        if (customerId) {
            const customerDoc = await db.doc('customers', customerId).get();
            if (customerDoc.exists) {
                const currentBalance = customerDoc.data().creditBalance || 0;
                const currentPending = customerDoc.data().pendingAmount || 0;
                batch.update(db.doc('customers', customerId), {
                    creditBalance: Math.max(0, currentBalance - paymentAmount),
                    pendingAmount: Math.max(0, currentPending - paymentAmount)
                });
            }
        }
        
        // Update pending payment record if exists
        const pendingSnap = await db.where('pendingPayments', 'saleId', '==', saleId).get();
        if (pendingSnap.docs.length > 0) {
            const pendingDoc = pendingSnap.docs[0];
            if (isFullPayment) {
                batch.update(db.doc('pendingPayments', pendingDoc.id), {
                    status: 'paid',
                    paidDate: new Date().toISOString(),
                    paymentMethod: paymentMethod,
                    amountPaid: paymentAmount,
                    updatedAt: new Date().toISOString()
                });
            } else {
                batch.update(db.doc('pendingPayments', pendingDoc.id), {
                    amount: newPendingAmount,
                    amountPaid: (pendingDoc.data().amountPaid || 0) + paymentAmount,
                    updatedAt: new Date().toISOString()
                });
            }
        }
        
        // Create payment record
        const paymentRef = db.doc('payments', Date.now().toString(36) + Math.random().toString(36).substring(2, 6));
        batch.set(paymentRef, {
            paymentId: generateId('PAY'),
            saleId: saleId,
            customerId: customerId || null,
            customerName: sale.customerName || 'Walk-in Customer',
            amount: paymentAmount,
            paymentMethod: paymentMethod,
            paymentDate: new Date().toISOString(),
            status: 'completed',
            isPartial: !isFullPayment,
            isWalkIn: !customerId,
            createdAt: new Date().toISOString()
        });
        
        await batch.commit();
        
        if (isFullPayment) {
            showToast('Full payment processed successfully!', 'success');
        } else {
            showToast(`Partial payment of ${formatCurrency(paymentAmount)} processed. Remaining: ${formatCurrency(newPendingAmount)}`, 'success');
        }
        
        // Remove walk-in warning if exists
        const warning = document.getElementById('walkInWarning');
        if (warning) warning.remove();
        
        closeModal('paymentModal');
        loadSales();
        loadDashboard();
        loadCustomers();
    } catch (error) {
        console.error('Error processing payment:', error);
        showToast('Failed to process payment: ' + error.message, 'error');
    }
});

// ===== CANCEL PENDING PAYMENT =====
window.cancelPendingPayment = async function(saleId) {
    if (!confirm('Are you sure you want to cancel this pending payment? This will remove the amount from customer credit if applicable.')) {
        return;
    }
    
    try {
        const saleDoc = await db.doc('sales', saleId).get();
        if (!saleDoc.exists) {
            showToast('Sale not found', 'error');
            return;
        }
        
        const sale = saleDoc.data();
        if (sale.status !== 'pending') {
            showToast('This sale is not pending', 'warning');
            return;
        }
        
        const pendingAmount = sale.pendingAmount || sale.totalAmount || 0;
        
        const batch = db.batch();
        
        batch.update(db.doc('sales', saleId), {
            status: 'cancelled',
            updatedAt: new Date().toISOString()
        });
        
        // Only update customer credit if customer is registered
        if (sale.customerId && pendingAmount > 0) {
            const customerDoc = await db.doc('customers', sale.customerId).get();
            if (customerDoc.exists) {
                const currentBalance = customerDoc.data().creditBalance || 0;
                const currentPending = customerDoc.data().pendingAmount || 0;
                batch.update(db.doc('customers', sale.customerId), {
                    creditBalance: Math.max(0, currentBalance - pendingAmount),
                    pendingAmount: Math.max(0, currentPending - pendingAmount)
                });
            }
        }
        
        const pendingSnap = await db.where('pendingPayments', 'saleId', '==', saleId).get();
        if (pendingSnap.docs.length > 0) {
            const pendingDoc = pendingSnap.docs[0];
            batch.update(db.doc('pendingPayments', pendingDoc.id), {
                status: 'cancelled',
                updatedAt: new Date().toISOString()
            });
        }
        
        await batch.commit();
        showToast('Pending payment cancelled successfully', 'success');
        loadSales();
        loadDashboard();
        loadCustomers();
    } catch (error) {
        console.error('Error cancelling payment:', error);
        showToast('Failed to cancel payment: ' + error.message, 'error');
    }
};

// ===== SALE DETAILS VIEW =====
window.viewSaleDetails = async function(saleId) {
    try {
        const saleDoc = await db.doc('sales', saleId).get();
        if (!saleDoc.exists) {
            showToast('Sale not found', 'error');
            return;
        }
        
        const sale = saleDoc.data();
        
        // Get customer details if exists
        let customerDetails = null;
        if (sale.customerId) {
            const customerDoc = await db.doc('customers', sale.customerId).get();
            if (customerDoc.exists) {
                customerDetails = customerDoc.data();
            }
        }
        
        // Get pending payment details if exists
        let pendingPayment = null;
        if (sale.status === 'pending' && sale.paymentMethod === 'pending_payment') {
            const pendingSnap = await db.where('pendingPayments', 'saleId', '==', saleId).get();
            if (pendingSnap.docs.length > 0) {
                pendingPayment = pendingSnap.docs[0].data();
            }
        }
        
        // Determine status display
        let statusIcon = '';
        let statusColor = '';
        let statusText = '';
        let statusDescription = '';
        
        switch(sale.status) {
            case 'completed':
                statusIcon = 'fa-check-circle';
                statusColor = 'var(--success)';
                statusText = 'Completed';
                statusDescription = 'Sale has been fully paid and completed';
                break;
            case 'pending':
                statusIcon = 'fa-clock';
                statusColor = 'var(--warning)';
                statusText = 'Pending Payment';
                statusDescription = 'Awaiting payment from customer';
                break;
            case 'cancelled':
                statusIcon = 'fa-times-circle';
                statusColor = 'var(--danger)';
                statusText = 'Cancelled';
                statusDescription = 'Sale has been cancelled';
                break;
            default:
                statusIcon = 'fa-question-circle';
                statusColor = 'var(--gray)';
                statusText = 'Unknown';
                statusDescription = 'Status not recognized';
        }
        
        // Determine payment status
        let paymentStatusText = '';
        let paymentStatusColor = '';
        let paymentStatusIcon = '';
        
        if (sale.paymentMethod === 'pending_payment') {
            if (sale.status === 'completed') {
                paymentStatusText = 'Paid';
                paymentStatusColor = 'var(--success)';
                paymentStatusIcon = 'fa-check-circle';
            } else if (sale.status === 'cancelled') {
                paymentStatusText = 'Cancelled';
                paymentStatusColor = 'var(--danger)';
                paymentStatusIcon = 'fa-times-circle';
            } else {
                paymentStatusText = 'Waiting for Payment';
                paymentStatusColor = 'var(--warning)';
                paymentStatusIcon = 'fa-clock';
            }
        } else {
            paymentStatusText = 'Completed';
            paymentStatusColor = 'var(--success)';
            paymentStatusIcon = 'fa-check-circle';
        }
        
        // Build the HTML
        let html = `
            <!-- Sale Header with Enhanced Status -->
            <div style="margin-bottom:20px;padding:16px;background:var(--bg);border-radius:var(--radius);">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">
                    <div>
                        <h4 style="font-size:18px;color:var(--text);">${sale.invoiceNumber}</h4>
                        <div style="font-size:13px;color:var(--text-secondary);margin-top:4px;">
                            <i class="fas fa-calendar"></i> ${new Date(sale.saleDate).toLocaleString()}
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <!-- Sale Status -->
                        <div style="display:flex;align-items:center;gap:8px;justify-content:flex-end;">
                            <span style="display:inline-flex;align-items:center;gap:6px;padding:6px 16px;border-radius:20px;font-size:14px;font-weight:600;background:${statusColor}15;color:${statusColor};">
                                <i class="fas ${statusIcon}"></i>
                                ${statusText}
                            </span>
                        </div>
                        <!-- Payment Status -->
                        <div style="display:flex;align-items:center;gap:8px;justify-content:flex-end;margin-top:4px;">
                            <span style="display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:500;background:${paymentStatusColor}15;color:${paymentStatusColor};">
                                <i class="fas ${paymentStatusIcon}"></i>
                                Payment: ${paymentStatusText}
                            </span>
                            <span style="font-size:12px;color:var(--text-secondary);">
                                <i class="fas fa-credit-card"></i> ${sale.paymentMethod || 'cash'}
                                ${sale.bankName ? ` - ${sale.bankName}` : ''}
                            </span>
                        </div>
                        <!-- Status Description -->
                        <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">
                            ${statusDescription}
                        </div>
                    </div>
                </div>
                
                <!-- Payment Progress Bar for Pending Payments -->
                ${sale.paymentMethod === 'pending_payment' && sale.status === 'pending' ? `
                    <div style="margin-top:12px;padding:12px;background:var(--card-bg);border-radius:var(--radius);border:1px solid var(--border);">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                            <span style="font-size:13px;font-weight:500;color:var(--text);">
                                <i class="fas fa-hourglass-half" style="color:var(--warning);"></i> Payment Progress
                            </span>
                            <span style="font-size:13px;font-weight:600;color:var(--text);">
                                ${formatCurrency(sale.paidAmount || 0)} / ${formatCurrency(sale.totalAmount || 0)}
                            </span>
                        </div>
                        <div style="width:100%;height:8px;background:var(--bg);border-radius:4px;overflow:hidden;">
                            <div style="height:100%;background:linear-gradient(90deg, var(--warning), var(--success));border-radius:4px;transition:width 0.5s ease;width:${((sale.paidAmount || 0) / (sale.totalAmount || 1)) * 100}%;">
                            </div>
                        </div>
                        <div style="display:flex;justify-content:space-between;margin-top:4px;">
                            <span style="font-size:11px;color:var(--text-secondary);">${((sale.paidAmount || 0) / (sale.totalAmount || 1) * 100).toFixed(0)}% Paid</span>
                            <span style="font-size:11px;color:var(--text-secondary);">${formatCurrency(sale.pendingAmount || 0)} Remaining</span>
                        </div>
                        ${pendingPayment ? `
                            <div style="margin-top:8px;padding:8px;background:var(--bg);border-radius:4px;font-size:12px;color:var(--text-secondary);">
                                <i class="fas fa-info-circle"></i> 
                                Pending since: ${new Date(pendingPayment.createdAt).toLocaleDateString()}
                                ${pendingPayment.expectedDate ? ` | Expected by: ${new Date(pendingPayment.expectedDate).toLocaleDateString()}` : ''}
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
                
                <!-- Payment Summary for Completed Sales -->
                ${sale.status === 'completed' ? `
                    <div style="margin-top:12px;padding:8px 12px;background:rgba(76,175,80,0.1);border-radius:var(--radius);border:1px solid rgba(76,175,80,0.2);">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <span style="font-size:13px;color:var(--success);">
                                <i class="fas fa-check-circle"></i> Payment Completed
                            </span>
                            <span style="font-size:13px;font-weight:600;color:var(--success);">
                                ${formatCurrency(sale.totalAmount)} Paid
                            </span>
                        </div>
                    </div>
                ` : ''}
            </div>
            
            <!-- Customer Information -->
            <div class="detail-section">
                <div class="detail-section-title">
                    <i class="fas fa-user"></i> Customer Information
                </div>
                ${customerDetails ? `
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="label">Name</span>
                            <span class="value customer-clickable" onclick="viewCustomerProfile('${sale.customerId}')">
                                <i class="fas fa-user"></i> ${customerDetails.name}
                            </span>
                        </div>
                        ${customerDetails.phone ? `
                            <div class="detail-item">
                                <span class="label">Phone</span>
                                <span class="value"><i class="fas fa-phone"></i> ${customerDetails.phone}</span>
                            </div>
                        ` : ''}
                        ${customerDetails.email ? `
                            <div class="detail-item">
                                <span class="label">Email</span>
                                <span class="value"><i class="fas fa-envelope"></i> ${customerDetails.email}</span>
                            </div>
                        ` : ''}
                        ${customerDetails.address ? `
                            <div class="detail-item">
                                <span class="label">Address</span>
                                <span class="value"><i class="fas fa-map-marker-alt"></i> ${customerDetails.address}</span>
                            </div>
                        ` : ''}
                        <div class="detail-item">
                            <span class="label">Customer ID</span>
                            <span class="value">${customerDetails.customerId || '-'}</span>
                        </div>
                        ${customerDetails.creditBalance !== undefined ? `
                            <div class="detail-item">
                                <span class="label">Credit Balance</span>
                                <span class="value ${customerDetails.creditBalance > 0 ? 'danger' : ''}">${formatCurrency(customerDetails.creditBalance || 0)}</span>
                            </div>
                        ` : ''}
                    </div>
                ` : `
                    <div style="padding:12px;background:var(--bg);border-radius:var(--radius);text-align:center;color:var(--text-secondary);">
                        <i class="fas fa-user"></i> Walk-in Customer
                    </div>
                `}
            </div>
            
            <!-- Items -->
            <div class="detail-section">
                <div class="detail-section-title">
                    <i class="fas fa-list"></i> Items (${sale.items ? sale.items.length : 0})
                </div>
                ${sale.items && sale.items.length > 0 ? `
                    <table class="detail-items-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th style="text-align:center;">Qty</th>
                                <th style="text-align:right;">Unit Price</th>
                                <th style="text-align:right;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sale.items.map(item => `
                                <tr>
                                    <td>${item.productId || 'Unknown Product'}</td>
                                    <td style="text-align:center;">${item.quantity}</td>
                                    <td style="text-align:right;">${formatCurrency(item.unitPrice)}</td>
                                    <td style="text-align:right;font-weight:500;">${formatCurrency(item.quantity * item.unitPrice)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : `
                    <div style="padding:12px;background:var(--bg);border-radius:var(--radius);text-align:center;color:var(--text-secondary);">
                        No items found
                    </div>
                `}
            </div>
            
            <!-- Financial Summary -->
            <div class="detail-section">
                <div class="detail-section-title">
                    <i class="fas fa-calculator"></i> Financial Summary
                </div>
                <div class="detail-summary">
                    <div class="detail-summary-row">
                        <span class="label">Subtotal</span>
                        <span class="value">${formatCurrency(sale.subtotal || 0)}</span>
                    </div>
                    <div class="detail-summary-row">
                        <span class="label">Discount</span>
                        <span class="value">${formatCurrency(sale.discount || 0)}</span>
                    </div>
                    <div class="detail-summary-row">
                        <span class="label">Tax (15%)</span>
                        <span class="value">${formatCurrency(sale.tax || 0)}</span>
                    </div>
                    <div class="detail-summary-row total">
                        <span class="label">Total Amount</span>
                        <span class="value total-amount">${formatCurrency(sale.totalAmount || 0)}</span>
                    </div>
                    ${sale.paidAmount > 0 ? `
                        <div class="detail-summary-row" style="color:var(--success);">
                            <span class="label">Paid Amount</span>
                            <span class="value success">${formatCurrency(sale.paidAmount)}</span>
                        </div>
                    ` : ''}
                    ${sale.pendingAmount > 0 ? `
                        <div class="detail-summary-row" style="color:var(--danger);">
                            <span class="label">Pending Amount</span>
                            <span class="value pending">${formatCurrency(sale.pendingAmount)}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <!-- Additional Info -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px;background:var(--bg);border-radius:var(--radius);">
                <div>
                    <span style="font-size:12px;color:var(--text-secondary);">Created</span>
                    <div style="font-size:13px;">${new Date(sale.createdAt).toLocaleString()}</div>
                </div>
                ${sale.updatedAt ? `
                    <div>
                        <span style="font-size:12px;color:var(--text-secondary);">Last Updated</span>
                        <div style="font-size:13px;">${new Date(sale.updatedAt).toLocaleString()}</div>
                    </div>
                ` : ''}
                ${sale.remarks ? `
                    <div style="grid-column:1/-1;">
                        <span style="font-size:12px;color:var(--text-secondary);">Remarks</span>
                        <div style="font-size:13px;padding:8px;background:var(--card-bg);border-radius:4px;margin-top:4px;">${sale.remarks}</div>
                    </div>
                ` : ''}
            </div>
        `;
        
        document.getElementById('saleDetailsTitle').textContent = `Sale Details - ${sale.invoiceNumber}`;
        document.getElementById('saleDetailsBody').innerHTML = html;
        openModal('saleDetailsModal');
        
    } catch (error) {
        console.error('Error viewing sale details:', error);
        showToast('Failed to load sale details: ' + error.message, 'error');
    }
};

// ===== VIEW CUSTOMER PROFILE =====
window.viewCustomerProfile = async function(customerId) {
    try {
        const customerDoc = await db.doc('customers', customerId).get();
        if (customerDoc.exists) {
            const customer = customerDoc.data();
            showToast(`
                <div style="padding:10px;max-width:300px;">
                    <h4 style="margin-bottom:8px;">Customer Profile</h4>
                    <p><strong>Name:</strong> ${customer.name}</p>
                    ${customer.phone ? `<p><strong>Phone:</strong> ${customer.phone}</p>` : ''}
                    ${customer.email ? `<p><strong>Email:</strong> ${customer.email}</p>` : ''}
                    ${customer.address ? `<p><strong>Address:</strong> ${customer.address}</p>` : ''}
                    <p><strong>Credit Balance:</strong> ${formatCurrency(customer.creditBalance || 0)}</p>
                    <p><strong>Pending Amount:</strong> ${formatCurrency(customer.pendingAmount || 0)}</p>
                    <button class="btn-primary" onclick="closeModal('saleDetailsModal');viewCustomerCredit('${customerId}')" style="margin-top:8px;width:100%;">
                        View Full Credit Details
                    </button>
                </div>
            `, 'info');
        }
    } catch (error) {
        console.error('Error viewing customer:', error);
        showToast('Failed to load customer details', 'error');
    }
};