import { 
    auth, db, storage, 
    signInWithEmailAndPassword, signOut, onAuthStateChanged,
    collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
    query, where, orderBy, limit, addDoc, onSnapshot, 
    serverTimestamp, increment, runTransaction, writeBatch,
    ref, uploadBytes, getDownloadURL
} from '../firebase/firebase-config.js';

import { initDashboard, updateDashboard } from './dashboard.js';
import { initInventory, loadInventory } from './inventory.js';
import { initSales, loadSales } from './sales.js';
import { initCustomers, loadCustomers } from './customers.js';
import { initSuppliers, loadSuppliers } from './suppliers.js';
import { initReports } from './reports.js';
import { showToast, formatCurrency, generateId } from './utils.js';

// App State
let currentUser = null;
let currentPage = 'dashboard';

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    // Check auth state
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            showDashboard();
            loadUserData();
            initializeApp();
        } else {
            showLogin();
        }
    });

    // Login form handler
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            await signInWithEmailAndPassword(auth, email, password);
            showToast('Login successful!', 'success');
        } catch (error) {
            showToast(error.message, 'error');
        }
    });
});

// Initialize app modules
async function initializeApp() {
    await initDashboard();
    await initInventory();
    await initSales();
    await initCustomers();
    await initSuppliers();
    await initReports();
    
    // Load initial data
    await loadInventory();
    await loadSales();
    await loadCustomers();
    await loadSuppliers();
    await updateDashboard();
}

// Show login page
function showLogin() {
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('dashboardLayout').style.display = 'none';
}

// Show dashboard
function showDashboard() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('dashboardLayout').style.display = 'flex';
}

// Load user data
async function loadUserData() {
    if (!currentUser) return;
    
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (userDoc.exists()) {
        const userData = userDoc.data();
        document.getElementById('userName').textContent = userData.fullName || currentUser.email;
        document.getElementById('userRole').textContent = userData.role || 'Salesman';
        if (userData.photoURL) {
            document.getElementById('userAvatar').src = userData.photoURL;
        }
    }
}

// Show page
window.showPage = function(page) {
    currentPage = page;
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    // Show selected page
    const pageElement = document.getElementById(page + 'Page');
    if (pageElement) pageElement.classList.add('active');
    
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');
    
    // Update title
    const titles = {
        dashboard: 'Dashboard',
        inventory: 'Inventory Management',
        sales: 'Sales Management',
        customers: 'Customer Management',
        suppliers: 'Supplier Management',
        reports: 'Reports'
    };
    document.getElementById('pageTitle').textContent = titles[page] || 'Dashboard';
};

// Toggle sidebar
window.toggleSidebar = function() {
    document.getElementById('sidebar').classList.toggle('collapsed');
};

// Toggle theme
window.toggleTheme = function() {
    document.body.classList.toggle('dark-mode');
    const icon = document.querySelector('.theme-toggle i');
    if (document.body.classList.contains('dark-mode')) {
        icon.className = 'fas fa-sun';
        localStorage.setItem('theme', 'dark');
    } else {
        icon.className = 'fas fa-moon';
        localStorage.setItem('theme', 'light');
    }
};

// Load saved theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    document.querySelector('.theme-toggle i').className = 'fas fa-sun';
}

// Toggle password visibility
window.togglePassword = function() {
    const passwordInput = document.getElementById('loginPassword');
    const icon = document.querySelector('.toggle-password i');
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        icon.className = 'fas fa-eye';
    }
};

// Logout
window.logoutUser = async function() {
    try {
        await signOut(auth);
        showToast('Logged out successfully', 'success');
        showLogin();
    } catch (error) {
        showToast(error.message, 'error');
    }
};

// Close modal
window.closeModal = function(modalId) {
    document.getElementById(modalId).style.display = 'none';
};

// Global search
window.handleGlobalSearch = function(event) {
    const searchTerm = event.target.value.toLowerCase();
    if (searchTerm.length < 2) return;
    
    // Search across different collections
    // Implement search logic here
};

// Export for use in other modules
export { currentUser, db, storage, uploadBytes, getDownloadURL };