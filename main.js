const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const DatabaseManager = require('./src/database/manager');

let mainWindow;
let dbManager;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        icon: path.join(__dirname, 'assets', 'icon.png'),
        title: 'CRM Desktop'
    });

    mainWindow.loadFile('src/renderer/index.html');

    // Open DevTools in development
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(async () => {
    try {
        console.log('CRM Desktop starting...');
        
        // Initialize database
        dbManager = new DatabaseManager();
        await dbManager.initialize();
        console.log('Database initialized successfully');
        
        // Create main window
        createWindow();
        console.log('Main window created');
        
    } catch (error) {
        console.error('Error during app initialization:', error);
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Graceful shutdown
app.on('before-quit', async () => {
    if (dbManager) {
        await dbManager.close();
        console.log('Database closed gracefully');
    }
});

// IPC Handlers für Navigation
ipcMain.on('navigate-to-page', (event, page, params = {}) => {
    const pageMap = {
        'index': 'index.html',
        'companies': 'companies.html',
        'products': 'products.html',
        'invoices': 'invoices.html',
        'create-invoice': 'create-invoice.html',
        'search': 'search.html',
        'reminders': 'reminders.html',
        'admin': 'admin.html'
    };
    
    const targetPage = pageMap[page] || 'index.html';
    const url = `src/renderer/${targetPage}`;
    
    // Parameter für create-invoice page
    if (page === 'create-invoice' && params.edit) {
        global.editInvoiceId = params.edit;
    }
    
    mainWindow.loadFile(url);
});

// IPC Handlers für Datenbank-Operationen
ipcMain.handle('db-get-all-data', async () => {
    try {
        return await dbManager.getAllData();
    } catch (error) {
        console.error('Error getting all data:', error);
        throw error;
    }
});

ipcMain.handle('db-save-all-data', async (event, data) => {
    try {
        await dbManager.saveAllData(data);
        return { success: true };
    } catch (error) {
        console.error('Error saving all data:', error);
        throw error;
    }
});

ipcMain.handle('db-get-companies', async () => {
    try {
        return await dbManager.getCompanies();
    } catch (error) {
        console.error('Error getting companies:', error);
        throw error;
    }
});

ipcMain.handle('db-save-company', async (event, company) => {
    try {
        return await dbManager.saveCompany(company);
    } catch (error) {
        console.error('Error saving company:', error);
        throw error;
    }
});

ipcMain.handle('db-delete-company', async (event, companyId) => {
    try {
        return await dbManager.deleteCompany(companyId);
    } catch (error) {
        console.error('Error deleting company:', error);
        throw error;
    }
});

ipcMain.handle('db-get-products', async () => {
    try {
        return await dbManager.getProducts();
    } catch (error) {
        console.error('Error getting products:', error);
        throw error;
    }
});

ipcMain.handle('db-save-product', async (event, product) => {
    try {
        return await dbManager.saveProduct(product);
    } catch (error) {
        console.error('Error saving product:', error);
        throw error;
    }
});

ipcMain.handle('db-delete-product', async (event, productId) => {
    try {
        return await dbManager.deleteProduct(productId);
    } catch (error) {
        console.error('Error deleting product:', error);
        throw error;
    }
});

ipcMain.handle('db-get-invoices', async () => {
    try {
        return await dbManager.getInvoices();
    } catch (error) {
        console.error('Error getting invoices:', error);
        throw error;
    }
});

ipcMain.handle('db-save-invoice', async (event, invoice) => {
    try {
        return await dbManager.saveInvoice(invoice);
    } catch (error) {
        console.error('Error saving invoice:', error);
        throw error;
    }
});

ipcMain.handle('db-delete-invoice', async (event, invoiceId) => {
    try {
        return await dbManager.deleteInvoice(invoiceId);
    } catch (error) {
        console.error('Error deleting invoice:', error);
        throw error;
    }
});

ipcMain.handle('db-get-reminders', async () => {
    try {
        return await dbManager.getReminders();
    } catch (error) {
        console.error('Error getting reminders:', error);
        throw error;
    }
});

ipcMain.handle('db-save-reminder', async (event, reminder) => {
    try {
        return await dbManager.saveReminder(reminder);
    } catch (error) {
        console.error('Error saving reminder:', error);
        throw error;
    }
});

ipcMain.handle('db-delete-reminder', async (event, reminderId) => {
    try {
        return await dbManager.deleteReminder(reminderId);
    } catch (error) {
        console.error('Error deleting reminder:', error);
        throw error;
    }
});

ipcMain.handle('db-get-tags', async () => {
    try {
        return await dbManager.getTags();
    } catch (error) {
        console.error('Error getting tags:', error);
        throw error;
    }
});

ipcMain.handle('db-save-tag', async (event, tag) => {
    try {
        return await dbManager.saveTag(tag);
    } catch (error) {
        console.error('Error saving tag:', error);
        throw error;
    }
});

ipcMain.handle('db-delete-tag', async (event, tagId) => {
    try {
        return await dbManager.deleteTag(tagId);
    } catch (error) {
        console.error('Error deleting tag:', error);
        throw error;
    }
});

ipcMain.handle('db-get-settings', async () => {
    try {
        return await dbManager.getSettings();
    } catch (error) {
        console.error('Error getting settings:', error);
        throw error;
    }
});

ipcMain.handle('db-save-settings', async (event, settings) => {
    try {
        return await dbManager.saveSettings(settings);
    } catch (error) {
        console.error('Error saving settings:', error);
        throw error;
    }
});

// Global variable for edit invoice ID
global.editInvoiceId = null;
ipcMain.handle('get-edit-invoice-id', () => {
    const id = global.editInvoiceId;
    global.editInvoiceId = null; // Clear after reading
    return id;
});