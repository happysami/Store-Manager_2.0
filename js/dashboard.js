import { db, collection, query, where, getDocs, onSnapshot } from '../firebase/firebase-config.js';
import { formatCurrency } from './utils.js';

let salesChartInstance = null;
let topProductsChartInstance = null;

export async function initDashboard() {
    // Set up real-time listeners
    setupDashboardListeners();
}

function setupDashboardListeners() {
    // Listen to sales changes
    const salesQuery = query(collection(db, 'sales'), where('status', '==', 'completed'));
    onSnapshot(salesQuery, () => {
        updateDashboard();
    });

    // Listen to product changes
    onSnapshot(collection(db, 'products'), () => {
        updateDashboard();
    });
}

export async function updateDashboard() {
    try {
        // Get stats
        const stats = await getDashboardStats();
        renderStats(stats);
        
        // Update charts
        await renderSalesChart();
        await renderTopProductsChart();
        
        // Get notifications
        await checkNotifications();
    } catch (error) {
        console.error('Error updating dashboard:', error);
    }
}

async function getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Get products
    const productsSnapshot = await getDocs(collection(db, 'products'));
    const products = productsSnapshot.docs.map(doc => doc.data());
    
    // Get sales
    const salesSnapshot = await getDocs(collection(db, 'sales'));
    const sales = salesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Get customers
    const customersSnapshot = await getDocs(collection(db, 'customers'));
    
    // Calculate stats
    const totalProducts = products.filter(p => p.isActive !== false).length;
    const stockValue = products.reduce((sum, p) => sum + (p.currentStock || 0) * (p.purchasePrice || 0), 0);
    const lowStockItems = products.filter(p => (p.currentStock || 0) <= (p.minStock || 5)).length;
    
    const completedSales = sales.filter(s => s.status === 'completed');
    const todaySales = completedSales.filter(s => {
        const saleDate = s.saleDate?.toDate?.() || new Date(s.saleDate);
        return saleDate >= today;
    });
    
    const monthlySales = completedSales.filter(s => {
        const saleDate = s.saleDate?.toDate?.() || new Date(s.saleDate);
        return saleDate >= firstDayOfMonth;
    });
    
    const todayRevenue = todaySales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const monthlyRevenue = monthlySales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const totalCustomers = customersSnapshot.size;
    
    const pendingOrders = sales.filter(s => s.status === 'pending').length;
    const pendingPayments = sales.filter(s => s.paymentMethod === 'pending_payment' && s.status === 'pending')
        .reduce((sum, s) => sum + (s.pendingAmount || 0), 0);
    
    // Calculate today's profit
    let todayProfit = 0;
    for (const sale of todaySales) {
        const items = sale.items || [];
        for (const item of items) {
            const product = products.find(p => p.id === item.productId);
            if (product) {
                const profit = (item.unitPrice - (product.purchasePrice || 0)) * item.quantity;
                todayProfit += profit;
            }
        }
    }
    
    return {
        totalProducts,
        stockValue,
        todayRevenue,
        monthlyRevenue,
        todayProfit,
        totalCustomers,
        lowStockItems,
        pendingOrders,
        pendingPayments
    };
}

function renderStats(stats) {
    const statsHtml = `
        <div class="stat-card">
            <div class="stat-icon"><i class="fas fa-boxes"></i></div>
            <div class="stat-info">
                <h3>${stats.totalProducts}</h3>
                <p>Total Products</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon"><i class="fas fa-money-bill-wave"></i></div>
            <div class="stat-info">
                <h3>${formatCurrency(stats.stockValue)}</h3>
                <p>Stock Value</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon"><i class="fas fa-shopping-cart"></i></div>
            <div class="stat-info">
                <h3>${formatCurrency(stats.todayRevenue)}</h3>
                <p>Today's Sales</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon"><i class="fas fa-calendar-alt"></i></div>
            <div class="stat-info">
                <h3>${formatCurrency(stats.monthlyRevenue)}</h3>
                <p>Monthly Sales</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon"><i class="fas fa-chart-line"></i></div>
            <div class="stat-info">
                <h3>${formatCurrency(stats.todayProfit)}</h3>
                <p>Today's Profit</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon"><i class="fas fa-users"></i></div>
            <div class="stat-info">
                <h3>${stats.totalCustomers}</h3>
                <p>Total Customers</p>
            </div>
        </div>
        <div class="stat-card warning">
            <div class="stat-icon"><i class="fas fa-exclamation-triangle"></i></div>
            <div class="stat-info">
                <h3>${stats.lowStockItems}</h3>
                <p>Low Stock Items</p>
            </div>
        </div>
        <div class="stat-card danger">
            <div class="stat-icon"><i class="fas fa-clock"></i></div>
            <div class="stat-info">
                <h3>${stats.pendingOrders}</h3>
                <p>Pending Orders</p>
            </div>
        </div>
    `;
    
    document.getElementById('dashboardStats').innerHTML = statsHtml;
}

async function renderSalesChart() {
    const ctx = document.getElementById('salesChart').getContext('2d');
    
    // Get last 7 days sales
    const sales = await getLast7DaysSales();
    
    if (salesChartInstance) {
        salesChartInstance.destroy();
    }
    
    salesChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sales.labels,
            datasets: [{
                label: 'Sales',
                data: sales.data,
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => formatCurrency(value)
                    }
                }
            }
        }
    });
}

async function getLast7DaysSales() {
    const labels = [];
    const data = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        labels.push(dateStr);
        
        // Get sales for this date
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        
        const salesQuery = query(
            collection(db, 'sales'),
            where('status', '==', 'completed'),
            where('saleDate', '>=', startDate),
            where('saleDate', '<=', endDate)
        );
        
        const snapshot = await getDocs(salesQuery);
        const dailyTotal = snapshot.docs.reduce((sum, doc) => sum + (doc.data().totalAmount || 0), 0);
        data.push(dailyTotal);
    }
    
    return { labels, data };
}

async function renderTopProductsChart() {
    const ctx = document.getElementById('topProductsChart').getContext('2d');
    
    const products = await getTopProducts();
    
    if (topProductsChartInstance) {
        topProductsChartInstance.destroy();
    }
    
    topProductsChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: products.map(p => p.name),
            datasets: [{
                data: products.map(p => p.quantity),
                backgroundColor: ['#4CAF50', '#2196F3', '#FF9800', '#F44336', '#9C27B0']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

async function getTopProducts() {
    const snapshot = await getDocs(collection(db, 'products'));
    const products