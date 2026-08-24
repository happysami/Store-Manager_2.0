import { 
    db, storage, collection, doc, setDoc, getDocs, updateDoc, deleteDoc,
    query, orderBy, addDoc, onSnapshot, ref, uploadBytes, getDownloadURL
} from '../firebase/firebase-config.js';
import { showToast, formatCurrency, generateId } from './utils.js';
import { currentUser } from './app.js';

let inventoryData = [];
let inventoryView = 'list';

export async function initInventory() {
    // Set up real-time listener
    onSnapshot(collection(db, 'products'), () => {
        loadInventory();
    });
    
    // Set up form handler
    document.getElementById('productForm').addEventListener('submit', handleProductForm);
    
    // Load categories
    await loadCategories();
}

export async function loadInventory() {
    try {
        const snapshot = await getDocs(query(
            collection(db, 'products'),
            orderBy('createdAt', 'desc')
        ));
        
        inventoryData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        renderInventory(inventoryData);
    } catch (error) {
        console.error('Error loading inventory:', error);
        showToast('Failed to load inventory', 'error');
    }
}

function renderInventory(products) {
    const container = document.getElementById('inventoryContainer');
    
    if (inventoryView === 'grid') {
        container.innerHTML = products.map(product => `
            <div class="inventory-card">
                ${product.imageUrl ? `<img src="${product.imageUrl}" alt="${product.name}">` : ''}
                <div class="inventory-card-body">
                    <h4>${product.name}</h4>
                    <div class="product-id">${product.productId || ''}</div>
                    <div class="product-stock ${product.currentStock <= product.minStock ? 'low-stock' : ''}">
                        Stock: ${product.currentStock || 0}
                    </div>
                    <div class="product-price">
                        <span>${formatCurrency(product.sellingPrice || 0)}</span>
                        <span class="purchase-price">${formatCurrency(product.purchasePrice || 0)}</span>
                    </div>
                    <div class="card-actions">
                        <button onclick="editProduct('${product.id}')" class="btn-sm">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteProduct('${product.id}')" class="btn-sm danger">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    } else {
        container.innerHTML = `
            <table class="inventory-table">
                <thead>
                    <tr>
                        <th>Product ID</th>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Purchase Price</th>
                        <th>Selling Price</th>
                        <th>Stock</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map(product => `
                        <tr>
                            <td>${product.productId || '-'}</td>
                            <td><strong>${product.name}</strong></td>
                            <td>${product.category || '-'}</td>
                            <td>${formatCurrency(product.purchasePrice || 0)}</td>
                            <td>${formatCurrency(product.sellingPrice || 0)}</td>
                            <td class="${product.currentStock <= product.minStock ? 'text-danger' : ''}">
                                ${product.currentStock || 0}
                            </td>
                            <td>
                                <span class="status-badge ${product.currentStock > 0 ? 'success' : 'danger'}">
                                    ${product.currentStock > 0 ? 'In Stock' : 'Out of Stock'}
                                </span>
                            </td>
                            <td class="table-actions">
                                <button onclick="editProduct('${product.id}')" class="btn-sm">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="deleteProduct('${product.id}')" class="btn-sm danger">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
}

// Filter inventory
window.filterInventory = function() {
    const search = document.getElementById('inventorySearch').value.toLowerCase();
    const category = document.getElementById('categoryFilter').value;
    
    let filtered = inventoryData;
    
    if (search) {
        filtered = filtered.filter(p => 
            p.name?.toLowerCase().includes(search) ||
            p.productId?.toLowerCase().includes(search) ||
            p.barcode?.includes(search)
        );
    }
    
    if (category) {
        filtered = filtered.filter(p => p.category === category);
    }
    
    renderInventory(filtered);
};

// Toggle inventory view
window.toggleInventoryView = function(view) {
    inventoryView = view;
    document.querySelectorAll('.view-options .btn-outline').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    renderInventory(inventoryData);
};

// Show add product modal
window.showAddProductModal = function() {
    document.getElementById('productModalTitle').textContent = 'Add Product';
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('productModal').style.display = 'block';
};

// Edit product
window.editProduct = async function(id) {
    try {
        const docRef = doc(db, 'products', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const product = docSnap.data();
            document.getElementById('productModalTitle').textContent = 'Edit Product';
            document.getElementById('productId').value = id;
            document.getElementById('productName').value = product.name || '';
            document.getElementById('productCategory').value = product.category || '';
            document.getElementById('purchasePrice').value = product.purchasePrice || '';
            document.getElementById('sellingPrice').value = product.sellingPrice || '';
            document.getElementById('quantity').value = product.currentStock || 0;
            document.getElementById('minStock').value = product.minStock || 5;
            document.getElementById('productDescription').value = product.description || '';
            document.getElementById('productModal').style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading product:', error);
        showToast('Failed to load product', 'error');
    }
};

// Delete product
window.deleteProduct = async function(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
        await deleteDoc(doc(db, 'products', id));
        showToast('Product deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting product:', error);
        showToast('Failed to delete product', 'error');
    }
};

// Handle product form submit
async function handleProductForm(e) {
    e.preventDefault();
    
    const id = document.getElementById('productId').value;
    const name = document.getElementById('productName').value;
    const category = document.getElementById('productCategory').value;
    const purchasePrice = parseFloat(document.getElementById('purchasePrice').value);
    const sellingPrice = parseFloat(document.getElementById('sellingPrice').value);
    const quantity = parseInt(document.getElementById('quantity').value);
    const minStock = parseInt(document.getElementById('minStock').value);
    const description = document.getElementById('productDescription').value;
    const imageFile = document.getElementById('productImage').files[0];
    
    if (!name || !purchasePrice || !sellingPrice || !quantity) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    
    try {
        let imageUrl = '';
        
        // Upload image if exists
        if (imageFile) {
            const storageRef = ref(storage, `products/${Date.now()}_${imageFile.name}`);
            const uploadResult = await uploadBytes(storageRef, imageFile);
            imageUrl = await getDownloadURL(uploadResult.ref);
        }
        
        const productData = {
            name,
            category,
            purchasePrice,
            sellingPrice,
            currentStock: quantity,
            minStock: minStock || 5,
            description,
            imageUrl,
            productId: generateId('PRD'),
            updatedAt: new Date().toISOString()
        };
        
        if (!id) {
            // Add new product
            productData.createdAt = new Date().toISOString();
            productData.createdBy = currentUser?.uid || 'system';
            await addDoc(collection(db, 'products'), productData);
            showToast('Product added successfully!', 'success');
        } else {
            // Update product
            await updateDoc(doc(db, 'products', id), productData);
            showToast('Product updated successfully!', 'success');
        }
        
        closeModal('productModal');
    } catch (error) {
        console.error('Error saving product:', error);
        showToast('Failed to save product: ' + error.message, 'error');
    }
}

// Load categories
async function loadCategories() {
    try {
        const snapshot = await getDocs(collection(db, 'categories'));
        const categories = snapshot.docs.map(doc => doc.data().name);
        
        const select = document.getElementById('productCategory');
        select.innerHTML = '<option value="">Select Category</option>' +
            categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        
        // Also populate sale product dropdowns
        document.querySelectorAll('.sale-product-select').forEach(sel => {
            sel.innerHTML = '<option value="">Select Product</option>' +
                inventoryData.map(p => `<option value="${p.id}" data-price="${p.sellingPrice}">${p.name}</option>`).join('');
        });
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}