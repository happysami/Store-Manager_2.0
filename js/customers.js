import { db, collection, doc, addDoc, getDocs, updateDoc, deleteDoc, query, orderBy } from '../firebase/firebase-config.js';
import { showToast, formatCurrency, generateId } from './utils.js';

let customersData = [];

export async function initCustomers() {
    await loadCustomers();
    document.getElementById('customerForm')?.addEventListener('submit', handleCustomerForm);
}

export async function loadCustomers() {
    try {
        const snapshot = await getDocs(query(
            collection(db, 'customers'),
            orderBy('createdAt', 'desc')
        ));
        
        customersData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        renderCustomers(customersData);
    } catch (error) {
        console.error('Error loading customers:', error);
        showToast('Failed to load customers', 'error');
    }
}

function renderCustomers(customers) {
    const container = document.getElementById('customersContainer');
    
    if (customers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>No Customers Yet</h3>
                <p>Add your first customer</p>
                <button class="btn-primary" onclick="showAddCustomerModal()">Add Customer</button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <table class="customers-table">
            <thead>
                <tr>
                    <th>Customer ID</th>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Credit Balance</th>
                    <th>Pending Amount</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${customers.map(customer => `
                    <tr>
                        <td>${customer.customerId || '-'}</td>
                        <td><strong>${customer.name}</strong></td>
                        <td>${customer.phone || '-'}</td>
                        <td>${customer.email || '-'}</td>
                        <td>${formatCurrency(customer.creditBalance || 0)}</td>
                        <td>${formatCurrency(customer.pendingAmount || 0)}</td>
                        <td class="table-actions">
                            <button onclick="editCustomer('${customer.id}')" class="btn-sm">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="deleteCustomer('${customer.id}')" class="btn-sm danger">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Show add customer modal
window.showAddCustomerModal = function() {
    document.getElementById('customerModalTitle').textContent = 'Add Customer';
    document.getElementById('customerForm').reset();
    document.getElementById('customerId').value = '';
    document.getElementById('customerModal').style.display = 'block';
};

// Edit customer
window.editCustomer = async function(id) {
    try {
        const docRef = doc(db, 'customers', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const customer = docSnap.data();
            document.getElementById('customerModalTitle').textContent = 'Edit Customer';
            document.getElementById('customerId').value = id;
            document.getElementById('customerName').value = customer.name || '';
            document.getElementById('customerPhone').value = customer.phone || '';
            document.getElementById('customerEmail').value = customer.email || '';
            document.getElementById('customerAddress').value = customer.address || '';
            document.getElementById('customerCredit').value = customer.creditBalance || 0;
            document.getElementById('customerModal').style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading customer:', error);
        showToast('Failed to load customer', 'error');
    }
};

// Delete customer
window.deleteCustomer = async function(id) {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    
    try {
        await deleteDoc(doc(db, 'customers', id));
        showToast('Customer deleted successfully', 'success');
        await loadCustomers();
    } catch (error) {
        console.error('Error deleting customer:', error);
        showToast('Failed to delete customer', 'error');
    }
};

// Handle customer form
async function handleCustomerForm(e) {
    e.preventDefault();
    
    const id = document.getElementById('customerId').value;
    const name = document.getElementById('customerName').value;
    const phone = document.getElementById('customerPhone').value;
    const email = document.getElementById('customerEmail').value;
    const address = document.getElementById('customerAddress').value;
    const creditBalance = parseFloat(document.getElementById('customerCredit').value) || 0;
    
    if (!name) {
        showToast('Customer name is required', 'error');
        return;
    }
    
    try {
        const customerData = {
            name,
            phone,
            email,
            address,
            creditBalance,
            updatedAt: new Date().toISOString()
        };
        
        if (!id) {
            customerData.customerId = generateId('CUST');
            customerData.createdAt = new Date().toISOString();
            customerData.pendingAmount = 0;
            await addDoc(collection(db, 'customers'), customerData);
            showToast('Customer added successfully!', 'success');
        } else {
            await updateDoc(doc(db, 'customers', id), customerData);
            showToast('Customer updated successfully!', 'success');
        }
        
        closeModal('customerModal');
        await loadCustomers();
    } catch (error) {
        console.error('Error saving customer:', error);
        showToast('Failed to save customer', 'error');
    }
}