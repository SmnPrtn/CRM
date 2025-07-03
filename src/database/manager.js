const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class DatabaseManager {
    constructor() {
        this.db = null;
        this.dbPath = path.join(__dirname, '../../data/crm.db');
        this.initialized = false;
    }

    async initialize() {
        try {
            // Ensure data directory exists
            const dataDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            // Connect to database
            await this.connect();
            
            // Create tables
            await this.createTables();
            
            // Create indexes
            await this.createIndexes();
            
            // Initialize with default data if empty
            await this.initializeDefaultData();
            
            this.initialized = true;
            console.log('Database initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize database:', error);
            throw error;
        }
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (error) => {
                if (error) {
                    console.error('Database connection error:', error);
                    reject(error);
                } else {
                    console.log('Connected to SQLite database');
                    resolve();
                }
            });
        });
    }

    createTables() {
        return new Promise((resolve, reject) => {
            const tables = [
                // Companies table
                `CREATE TABLE IF NOT EXISTS companies (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    address TEXT,
                    phone TEXT,
                    email TEXT,
                    website TEXT,
                    notes TEXT,
                    customerNumber TEXT,
                    tags TEXT DEFAULT '[]',
                    contacts TEXT DEFAULT '[]',
                    createdAt TEXT NOT NULL,
                    updatedAt TEXT NOT NULL
                )`,
                
                // Products table
                `CREATE TABLE IF NOT EXISTS products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    price REAL NOT NULL DEFAULT 0,
                    unit TEXT DEFAULT 'Stück',
                    category TEXT,
                    vatRate INTEGER DEFAULT 19,
                    active INTEGER DEFAULT 1,
                    createdAt TEXT NOT NULL,
                    updatedAt TEXT NOT NULL
                )`,
                
                // Invoices table
                `CREATE TABLE IF NOT EXISTS invoices (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    invoiceNumber TEXT NOT NULL UNIQUE,
                    companyId INTEGER NOT NULL,
                    contactId INTEGER,
                    date TEXT NOT NULL,
                    dueDate TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'draft',
                    items TEXT NOT NULL DEFAULT '[]',
                    totalNet REAL NOT NULL DEFAULT 0,
                    totalVat REAL NOT NULL DEFAULT 0,
                    totalGross REAL NOT NULL DEFAULT 0,
                    vatRate INTEGER DEFAULT 19,
                    notes TEXT,
                    paymentTerms TEXT,
                    createdAt TEXT NOT NULL,
                    updatedAt TEXT NOT NULL,
                    FOREIGN KEY (companyId) REFERENCES companies (id)
                )`,
                
                // Reminders table
                `CREATE TABLE IF NOT EXISTS reminders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    description TEXT,
                    dueDate TEXT NOT NULL,
                    priority TEXT DEFAULT 'normal',
                    completed INTEGER DEFAULT 0,
                    companyId INTEGER,
                    invoiceId INTEGER,
                    createdAt TEXT NOT NULL,
                    updatedAt TEXT NOT NULL,
                    FOREIGN KEY (companyId) REFERENCES companies (id),
                    FOREIGN KEY (invoiceId) REFERENCES invoices (id)
                )`,
                
                // Tags table
                `CREATE TABLE IF NOT EXISTS tags (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    color TEXT NOT NULL,
                    createdAt TEXT NOT NULL,
                    updatedAt TEXT NOT NULL
                )`,
                
                // Settings table
                `CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    updatedAt TEXT NOT NULL
                )`
            ];

            let completed = 0;
            const total = tables.length;

            tables.forEach((tableSQL) => {
                this.db.run(tableSQL, (error) => {
                    if (error) {
                        console.error('Error creating table:', error);
                        reject(error);
                        return;
                    }
                    
                    completed++;
                    if (completed === total) {
                        console.log('All database tables created successfully');
                        resolve();
                    }
                });
            });
        });
    }

    createIndexes() {
        return new Promise((resolve, reject) => {
            const indexes = [
                'CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name)',
                'CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(email)',
                'CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)',
                'CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)',
                'CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoiceNumber)',
                'CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(companyId)',
                'CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date)',
                'CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)',
                'CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(dueDate)',
                'CREATE INDEX IF NOT EXISTS idx_reminders_company ON reminders(companyId)'
            ];

            let completed = 0;
            const total = indexes.length;

            indexes.forEach((indexSQL) => {
                this.db.run(indexSQL, (error) => {
                    if (error) {
                        console.error('Error creating index:', error);
                        reject(error);
                        return;
                    }
                    
                    completed++;
                    if (completed === total) {
                        console.log('All database indexes created successfully');
                        resolve();
                    }
                });
            });
        });
    }

    async initializeDefaultData() {
        try {
            // Check if we have any data
            const companies = await this.getCompanies();
            const tags = await this.getTags();
            
            // Initialize default tags if none exist
            if (tags.length === 0) {
                const defaultTags = [
                    { id: 1, name: 'Kunde', color: 'tag-green' },
                    { id: 2, name: 'Interessent', color: 'tag-blue' },
                    { id: 3, name: 'Partner', color: 'tag-purple' },
                    { id: 4, name: 'Lieferant', color: 'tag-orange' }
                ];
                
                for (const tag of defaultTags) {
                    await this.saveTag(tag);
                }
            }
            
            // Initialize default settings if none exist
            const settings = await this.getSettings();
            if (Object.keys(settings).length === 0) {
                const defaultSettings = {
                    companyInfo: JSON.stringify({
                        name: 'Ihr Unternehmen',
                        address: 'Ihre Adresse\n12345 Stadt',
                        phone: '+43 1 234567',
                        email: 'office@ihrunternehmen.at',
                        website: 'www.ihrunternehmen.at',
                        taxNumber: 'ATU12345678'
                    }),
                    invoiceSettings: JSON.stringify({
                        invoiceNumberPrefix: 'R-',
                        nextInvoiceNumber: 1,
                        invoiceNumberPadding: 4,
                        defaultPaymentTerms: 30,
                        defaultPaymentText: 'Zahlung binnen 30 Tagen ohne Abzug.',
                        customerNumberPrefix: 'K-',
                        nextCustomerNumber: 10030,
                        customerNumberPadding: 5
                    }),
                    bankInfo: JSON.stringify({
                        bankName: 'Ihre Bank',
                        iban: 'AT33 2032 0321 0051 6306',
                        bic: 'ASPKAT2LXXX'
                    })
                };
                
                for (const [key, value] of Object.entries(defaultSettings)) {
                    await this.saveSetting(key, value);
                }
            }
            
        } catch (error) {
            console.error('Error initializing default data:', error);
        }
    }

    // Companies CRUD
    getCompanies() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM companies ORDER BY name', [], (error, rows) => {
                if (error) {
                    reject(error);
                } else {
                    const companies = rows.map(row => ({
                        ...row,
                        tags: JSON.parse(row.tags || '[]'),
                        contacts: JSON.parse(row.contacts || '[]')
                    }));
                    resolve(companies);
                }
            });
        });
    }

    saveCompany(company) {
        return new Promise((resolve, reject) => {
            const now = new Date().toISOString();
            const tags = JSON.stringify(company.tags || []);
            const contacts = JSON.stringify(company.contacts || []);
            
            if (company.id) {
                // Update existing company
                const sql = `UPDATE companies SET 
                    name = ?, address = ?, phone = ?, email = ?, website = ?, 
                    notes = ?, customerNumber = ?, tags = ?, contacts = ?, updatedAt = ?
                    WHERE id = ?`;
                
                this.db.run(sql, [
                    company.name, company.address, company.phone, company.email, company.website,
                    company.notes, company.customerNumber, tags, contacts, now, company.id
                ], function(error) {
                    if (error) {
                        reject(error);
                    } else {
                        resolve({ ...company, id: company.id, updatedAt: now });
                    }
                });
            } else {
                // Insert new company
                const sql = `INSERT INTO companies 
                    (name, address, phone, email, website, notes, customerNumber, tags, contacts, createdAt, updatedAt) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                
                this.db.run(sql, [
                    company.name, company.address, company.phone, company.email, company.website,
                    company.notes, company.customerNumber, tags, contacts, now, now
                ], function(error) {
                    if (error) {
                        reject(error);
                    } else {
                        resolve({ ...company, id: this.lastID, createdAt: now, updatedAt: now });
                    }
                });
            }
        });
    }

    deleteCompany(companyId) {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM companies WHERE id = ?', [companyId], function(error) {
                if (error) {
                    reject(error);
                } else {
                    resolve({ success: true, deletedId: companyId });
                }
            });
        });
    }

    // Products CRUD
    getProducts() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM products ORDER BY name', [], (error, rows) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    saveProduct(product) {
        return new Promise((resolve, reject) => {
            const now = new Date().toISOString();
            
            if (product.id) {
                // Update existing product
                const sql = `UPDATE products SET 
                    name = ?, description = ?, price = ?, unit = ?, category = ?, 
                    vatRate = ?, active = ?, updatedAt = ?
                    WHERE id = ?`;
                
                this.db.run(sql, [
                    product.name, product.description, product.price, product.unit, product.category,
                    product.vatRate, product.active ? 1 : 0, now, product.id
                ], function(error) {
                    if (error) {
                        reject(error);
                    } else {
                        resolve({ ...product, id: product.id, updatedAt: now });
                    }
                });
            } else {
                // Insert new product
                const sql = `INSERT INTO products 
                    (name, description, price, unit, category, vatRate, active, createdAt, updatedAt) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                
                this.db.run(sql, [
                    product.name, product.description, product.price, product.unit, product.category,
                    product.vatRate, product.active ? 1 : 0, now, now
                ], function(error) {
                    if (error) {
                        reject(error);
                    } else {
                        resolve({ ...product, id: this.lastID, createdAt: now, updatedAt: now });
                    }
                });
            }
        });
    }

    deleteProduct(productId) {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM products WHERE id = ?', [productId], function(error) {
                if (error) {
                    reject(error);
                } else {
                    resolve({ success: true, deletedId: productId });
                }
            });
        });
    }

    // Invoices CRUD
    getInvoices() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM invoices ORDER BY date DESC', [], (error, rows) => {
                if (error) {
                    reject(error);
                } else {
                    const invoices = rows.map(row => ({
                        ...row,
                        items: JSON.parse(row.items || '[]')
                    }));
                    resolve(invoices);
                }
            });
        });
    }

    saveInvoice(invoice) {
        return new Promise((resolve, reject) => {
            const now = new Date().toISOString();
            const items = JSON.stringify(invoice.items || []);
            
            if (invoice.id) {
                // Update existing invoice
                const sql = `UPDATE invoices SET 
                    invoiceNumber = ?, companyId = ?, contactId = ?, date = ?, dueDate = ?,
                    status = ?, items = ?, totalNet = ?, totalVat = ?, totalGross = ?,
                    vatRate = ?, notes = ?, paymentTerms = ?, updatedAt = ?
                    WHERE id = ?`;
                
                this.db.run(sql, [
                    invoice.invoiceNumber, invoice.companyId, invoice.contactId, invoice.date, invoice.dueDate,
                    invoice.status, items, invoice.totalNet, invoice.totalVat, invoice.totalGross,
                    invoice.vatRate, invoice.notes, invoice.paymentTerms, now, invoice.id
                ], function(error) {
                    if (error) {
                        reject(error);
                    } else {
                        resolve({ ...invoice, id: invoice.id, updatedAt: now });
                    }
                });
            } else {
                // Insert new invoice
                const sql = `INSERT INTO invoices 
                    (invoiceNumber, companyId, contactId, date, dueDate, status, items, 
                     totalNet, totalVat, totalGross, vatRate, notes, paymentTerms, createdAt, updatedAt) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                
                this.db.run(sql, [
                    invoice.invoiceNumber, invoice.companyId, invoice.contactId, invoice.date, invoice.dueDate,
                    invoice.status, items, invoice.totalNet, invoice.totalVat, invoice.totalGross,
                    invoice.vatRate, invoice.notes, invoice.paymentTerms, now, now
                ], function(error) {
                    if (error) {
                        reject(error);
                    } else {
                        resolve({ ...invoice, id: this.lastID, createdAt: now, updatedAt: now });
                    }
                });
            }
        });
    }

    deleteInvoice(invoiceId) {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM invoices WHERE id = ?', [invoiceId], function(error) {
                if (error) {
                    reject(error);
                } else {
                    resolve({ success: true, deletedId: invoiceId });
                }
            });
        });
    }

    // Reminders CRUD
    getReminders() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM reminders ORDER BY dueDate', [], (error, rows) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    saveReminder(reminder) {
        return new Promise((resolve, reject) => {
            const now = new Date().toISOString();
            
            if (reminder.id) {
                // Update existing reminder
                const sql = `UPDATE reminders SET 
                    title = ?, description = ?, dueDate = ?, priority = ?, completed = ?,
                    companyId = ?, invoiceId = ?, updatedAt = ?
                    WHERE id = ?`;
                
                this.db.run(sql, [
                    reminder.title, reminder.description, reminder.dueDate, reminder.priority, reminder.completed ? 1 : 0,
                    reminder.companyId, reminder.invoiceId, now, reminder.id
                ], function(error) {
                    if (error) {
                        reject(error);
                    } else {
                        resolve({ ...reminder, id: reminder.id, updatedAt: now });
                    }
                });
            } else {
                // Insert new reminder
                const sql = `INSERT INTO reminders 
                    (title, description, dueDate, priority, completed, companyId, invoiceId, createdAt, updatedAt) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                
                this.db.run(sql, [
                    reminder.title, reminder.description, reminder.dueDate, reminder.priority, reminder.completed ? 1 : 0,
                    reminder.companyId, reminder.invoiceId, now, now
                ], function(error) {
                    if (error) {
                        reject(error);
                    } else {
                        resolve({ ...reminder, id: this.lastID, createdAt: now, updatedAt: now });
                    }
                });
            }
        });
    }

    deleteReminder(reminderId) {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM reminders WHERE id = ?', [reminderId], function(error) {
                if (error) {
                    reject(error);
                } else {
                    resolve({ success: true, deletedId: reminderId });
                }
            });
        });
    }

    // Tags CRUD
    getTags() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM tags ORDER BY name', [], (error, rows) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    saveTag(tag) {
        return new Promise((resolve, reject) => {
            const now = new Date().toISOString();
            
            if (tag.id) {
                // Update existing tag
                const sql = `UPDATE tags SET name = ?, color = ?, updatedAt = ? WHERE id = ?`;
                this.db.run(sql, [tag.name, tag.color, now, tag.id], function(error) {
                    if (error) {
                        reject(error);
                    } else {
                        resolve({ ...tag, id: tag.id, updatedAt: now });
                    }
                });
            } else {
                // Insert new tag
                const sql = `INSERT INTO tags (name, color, createdAt, updatedAt) VALUES (?, ?, ?, ?)`;
                this.db.run(sql, [tag.name, tag.color, now, now], function(error) {
                    if (error) {
                        reject(error);
                    } else {
                        resolve({ ...tag, id: this.lastID, createdAt: now, updatedAt: now });
                    }
                });
            }
        });
    }

    deleteTag(tagId) {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM tags WHERE id = ?', [tagId], function(error) {
                if (error) {
                    reject(error);
                } else {
                    resolve({ success: true, deletedId: tagId });
                }
            });
        });
    }

    // Settings CRUD
    getSettings() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM settings', [], (error, rows) => {
                if (error) {
                    reject(error);
                } else {
                    const settings = {};
                    rows.forEach(row => {
                        try {
                            settings[row.key] = JSON.parse(row.value);
                        } catch (e) {
                            settings[row.key] = row.value;
                        }
                    });
                    resolve(settings);
                }
            });
        });
    }

    saveSetting(key, value) {
        return new Promise((resolve, reject) => {
            const now = new Date().toISOString();
            const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
            
            const sql = `INSERT OR REPLACE INTO settings (key, value, updatedAt) VALUES (?, ?, ?)`;
            this.db.run(sql, [key, valueStr, now], function(error) {
                if (error) {
                    reject(error);
                } else {
                    resolve({ key, value, updatedAt: now });
                }
            });
        });
    }

    saveSettings(settings) {
        return new Promise(async (resolve, reject) => {
            try {
                for (const [key, value] of Object.entries(settings)) {
                    await this.saveSetting(key, value);
                }
                resolve({ success: true });
            } catch (error) {
                reject(error);
            }
        });
    }

    // Combined operations
    getAllData() {
        return new Promise(async (resolve, reject) => {
            try {
                const [companies, products, invoices, reminders, tags, settings] = await Promise.all([
                    this.getCompanies(),
                    this.getProducts(),
                    this.getInvoices(),
                    this.getReminders(),
                    this.getTags(),
                    this.getSettings()
                ]);

                resolve({
                    companies,
                    products,
                    invoices,
                    reminders,
                    tags,
                    invoiceSettings: settings.invoiceSettings || {},
                    companyInfo: settings.companyInfo || {},
                    bankInfo: settings.bankInfo || {}
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    saveAllData(data) {
        return new Promise(async (resolve, reject) => {
            try {
                // Save settings if provided
                if (data.invoiceSettings) {
                    await this.saveSetting('invoiceSettings', data.invoiceSettings);
                }
                if (data.companyInfo) {
                    await this.saveSetting('companyInfo', data.companyInfo);
                }
                if (data.bankInfo) {
                    await this.saveSetting('bankInfo', data.bankInfo);
                }

                resolve({ success: true });
            } catch (error) {
                reject(error);
            }
        });
    }

    close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((error) => {
                    if (error) {
                        reject(error);
                    } else {
                        this.db = null;
                        this.initialized = false;
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }
}

module.exports = DatabaseManager;