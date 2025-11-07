import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import './App.css';

// Import icons
import { 
  FiHome, 
  FiUsers, 
  FiBox, 
  FiShoppingCart, 
  FiLogOut 
} from 'react-icons/fi'; 

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Define standard order statuses
const ORDER_STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

// --- Modal Component ---
function Modal({ isOpen, onClose, children }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>&times;</button>
        {children}
      </div>
    </div>
  );
}

// --- ⭐ NEW: Date Formatting Helper ---
const formatDate = (dateString) => {
  if (!dateString) return 'No date';
  // Formats date to "Nov 7, 2025"
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};


function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); 
  const [profiles, setProfiles] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [selectedUserId, setSelectedUserId] = useState(null); 
  
  // Auth State
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false); 
  const [authMessage, setAuthMessage] = useState('');

  // Profiles Management State
  const [editingProfile, setEditingProfile] = useState(null);

  // Orders Management State
  const [newOrder, setNewOrder] = useState({ user_id: '', total_amount: 0, shipping_address: '', payment_method: 'COD', product_id: '', quantity: 1, price_at_purchase: 0, product_size: '', product_color: '' });
  const [editingOrder, setEditingOrder] = useState(null);

  // Products Management State
  const [newProduct, setNewProduct] = useState({ name: '', description: '', price: 0, stock_quantity: 1, image: null, color: '' });
  const [editingProduct, setEditingProduct] = useState(null);
  
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  // --- AUTHENTICATION & SESSION MANAGEMENT ---
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setLoading(false); 
    };
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // --- DATA FETCHING (Triggered on Auth/Logout) ---
  useEffect(() => {
    if (user && !loading) {
      fetchProfiles();
      fetchOrders();
      fetchProducts();
    }
    if (!user && !loading) {
      setProfiles([]);
      setOrders([]);
      setProducts([]);
    }
  }, [user, loading]);

  // --- UTILITY/API FUNCTIONS (Omitted for brevity, unchanged) ---
  const signIn = async () => {
    setAuthMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthMessage('Sign in failed: ' + error.message);
  };
  const signUp = async () => {
    setAuthMessage('');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setAuthMessage('Sign up failed: ' + error.message);
    } else {
      setAuthMessage('Sign up successful! Please check your email to confirm your account.');
      setIsSigningUp(false);
    }
  };
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };
  const fetchProfiles = async () => {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) console.error('Fetch profiles error:', error);
    else setProfiles(data);
  };
  const fetchOrders = async () => {
    const { data, error } = await supabase.from('orders').select('*, order_items(*), profiles(full_name, id)');
    if (error) console.error('Fetch orders error:', error);
    else setOrders(data);
  };
  const fetchProducts = async () => {
    const { data, error } = await supabase.from('products').select('*');
    if (error) console.error('Fetch products error:', error);
    else setProducts(data);
  };
  const uploadImage = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const { data, error } = await supabase.storage.from('product-images').upload(fileName, file);
    if (error) console.error('Upload image error:', error);
    else return data.path;
  };
  const editProfile = async () => {
    const { error } = await supabase.from('profiles').update({
      username: editingProfile.username, full_name: editingProfile.full_name,
      age: editingProfile.age, phone: editingProfile.phone, address: editingProfile.address
    }).eq('id', editingProfile.id);
    if (error) console.error('Edit profile error:', error);
    else { fetchProfiles(); setEditingProfile(null); }
  };
  const deleteProfile = async (id) => {
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) console.error('Delete profile error:', error);
    else fetchProfiles();
  };
  const viewUserOrders = (userId) => {
    setSelectedUserId(userId);
    setActiveTab('orders');
  };
  const addOrder = async () => {
    // ... (unchanged)
  };
  const editOrder = async () => {
    const { error } = await supabase.from('orders').update({
      status: editingOrder.status, total_amount: editingOrder.total_amount,
      shipping_address: editingOrder.shipping_address, payment_method: editingOrder.payment_method
    }).eq('id', editingOrder.id);
    if (error) console.error('Edit order error:', error);
    else { fetchOrders(); setEditingOrder(null); }
  };
  const deleteOrder = async (id) => {
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) console.error('Delete order error:', error);
    else fetchOrders();
  };
  const addProduct = async () => {
    let imagePath = newProduct.image ? await uploadImage(newProduct.image) : null;
    const { error } = await supabase.from('products').insert({
      name: newProduct.name, description: newProduct.description,
      price: newProduct.price, stock_quantity: newProduct.stock_quantity, 
      image_path: imagePath, color: newProduct.color
    });
    if (error) console.error('Add product error:', error);
    else { 
      fetchProducts(); 
      setNewProduct({ name: '', description: '', price: 0, stock_quantity: 1, image: null, color: '' });
      setIsAddingProduct(false);
    }
  };
  const editProduct = async () => {
    let imagePath = editingProduct.image_path;
    if (editingProduct.image instanceof File) { imagePath = await uploadImage(editingProduct.image); }
    const { error } = await supabase.from('products').update({
      name: editingProduct.name, description: editingProduct.description,
      price: editingProduct.price, stock_quantity: editingProduct.stock_quantity, 
      image_path: imagePath, color: editingProduct.color
    }).eq('id', editingProduct.id);
    if (error) console.error('Edit product error:', error);
    else { fetchProducts(); setEditingProduct(null); }
  };
  const deleteProduct = async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) console.error('Delete product error:', error);
    else fetchProducts();
  };

  // Filter orders
  const filteredOrders = selectedUserId 
    ? orders.filter(order => order.user_id === selectedUserId)
    : orders;

  // --- CONDITIONAL RENDERING ---

  if (loading) {
    return <div className="loading-spinner"></div>;
  }
  
  if (!user) {
    return (
      <div className="auth-container">
        <div> 
          <h1>{isSigningUp ? 'Sign Up for Admin Access' : 'Sign In to Admin Dashboard'}</h1>
          
          {authMessage && <p style={{ color: authMessage.includes('failed') ? 'var(--danger-color)' : 'var(--success-color)', marginBottom: '15px', fontWeight: 'bold' }}>{authMessage}</p>}
          
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
          
          {isSigningUp ? (
            <button onClick={signUp}>Sign Up</button>
          ) : (
            <button onClick={signIn}>Sign In</button>
          )}

          <button 
            className="secondary"
            style={{ marginTop: '10px' }}
            onClick={() => {
              setIsSigningUp(!isSigningUp);
              setAuthMessage('');
              setEmail('');
              setPassword('');
            }}
          >
            {isSigningUp ? 'Already have an account? Sign In' : 'Need Admin Access? Sign Up'}
          </button>
        </div>
      </div>
    );
  }

  // --- Main Dashboard Layout ---
  return (
    <div className="app-layout">
      
      {/* --- Sidebar --- */}
      <nav className="sidebar">
        <div className="sidebar-logo">
          ProfitPulse
        </div>
        <ul className="sidebar-nav">
          <li className={activeTab === 'dashboard' ? 'active' : ''}>
            <button onClick={() => { setActiveTab('dashboard'); setSelectedUserId(null); }}>
              <FiHome />
              <span>Dashboard</span>
            </button>
          </li>
          <li className={activeTab === 'profiles' ? 'active' : ''}>
            <button onClick={() => { setActiveTab('profiles'); setSelectedUserId(null); }}>
              <FiUsers />
              <span>Profiles</span>
            </button>
          </li>
          <li className={activeTab === 'products' ? 'active' : ''}>
            <button onClick={() => { setActiveTab('products'); setSelectedUserId(null); }}>
              <FiBox />
              <span>Products</span>
            </button>
          </li>
          <li className={activeTab === 'orders' ? 'active' : ''}>
            <button onClick={() => { setActiveTab('orders'); setSelectedUserId(null); }}>
              <FiShoppingCart />
              <span>Orders</span>
            </button>
          </li>
        </ul>
        <div className="sidebar-footer">
          <button onClick={signOut}>
            <FiLogOut />
            <span>Sign Out</span>
          </button>
        </div>
      </nav>

      {/* --- Main Content Area --- */}
      <main className="main-content">
        
        {/* --- Dashboard Tab --- */}
        {activeTab === 'dashboard' && (
          <div className="dashboard-tab">
            <h2>Welcome to your Dashboard!</h2>
            <p>Select a tab from the sidebar to get started.</p>
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Users</h3>
                <p>{profiles.length}</p>
              </div>
              <div className="stat-card">
                <h3>Total Products</h3>
                <p>{products.length}</p>
              </div>
              <div className="stat-card">
                <h3>Total Orders</h3>
                <p>{orders.length}</p>
              </div>
            </div>
          </div>
        )}

        {/* --- Profiles Tab --- */}
        {activeTab === 'profiles' && (
          <div className="profiles-tab">
            <h2>👤 User Profiles</h2>
            <ul>
              {profiles.map(profile => (
                <li key={profile.id}>
                  <p>
                    <strong>ID:</strong> {profile.id} | 
                    <strong>Username:</strong> {profile.username} | 
                    <strong>Full Name:</strong> {profile.full_name} 
                  </p>
                  <div className="button-group">
                    <button className="secondary" onClick={() => setEditingProfile(profile)}>Edit Profile</button>
                    <button onClick={() => viewUserOrders(profile.id)}>View Orders</button>
                    <button className="danger" onClick={() => deleteProfile(profile.id)}>Delete Profile</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* --- ⭐ MODIFIED: Orders Tab (now a table) --- */}
        {activeTab === 'orders' && (
          <div className="orders-tab">
            {selectedUserId ? (
              <>
                <h2>📦 Orders for User ID: {selectedUserId}</h2>
                <button className="secondary" onClick={() => setActiveTab('profiles')}>← Back to Profiles</button>
              </>
            ) : (
              <h2>📦 All Orders</h2>
            )}
            
            <hr/>

            {filteredOrders.length > 0 ? (
              <div className="table-container">
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      {!selectedUserId && <th>Customer</th>}
                      <th>Date</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map(order => (
                      <tr key={order.id}>
                        <td>#{order.id}</td>
                        {!selectedUserId && <td>{order.profiles?.full_name || 'N/A'}</td>}
                        <td>{formatDate(order.created_at)}</td>
                        <td>₱{order.total_amount.toFixed(2)}</td>
                        <td>
                          <span className={`status-badge status-${String(order.status).toLowerCase()}`}>
                            {order.status || 'Unknown'}
                          </span>
                        </td>
                        <td>
                          <div className="button-group">
                            <button className="secondary" onClick={() => setEditingOrder(order)}>View/Edit</button>
                            <button className="danger" onClick={() => deleteOrder(order.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No orders found.</p>
            )}
          </div>
        )}
        
        {/* --- Products Tab --- */}
        {activeTab === 'products' && (
          <div className="products-tab">
            <div className="product-header">
              <h2>🛒 Products</h2>
              <button onClick={() => setIsAddingProduct(true)}>+ Add New Product</button>
            </div>

            <ul>
              {products.map(product => (
                <li key={product.id}>
                  {product.image_path ? (
                    <img 
                      src={supabase.storage.from('product-images').getPublicUrl(product.image_path).data.publicUrl} 
                      alt={product.name} 
                    />
                  ) : (
                    <div className="no-image-placeholder">[No Image]</div>
                  )}
                  <div>
                    <strong>{product.name}</strong> - ₱{product.price} ({product.stock_quantity} in stock)
                    {product.color && <span> | Color: {product.color}</span>}
                    <p>{product.description}</p>
                    <div className="button-group">
                      <button className="secondary" onClick={() => setEditingProduct({...product, image: null})}>Edit</button>
                      <button className="danger" onClick={() => deleteProduct(product.id)}>Delete</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>

      {/* --- Modals --- */}
      
      {/* Add Product Modal */}
      <Modal isOpen={isAddingProduct} onClose={() => setIsAddingProduct(false)}>
        <div className="add-form">
          <h3>Add New Product</h3>
          <input type="text" placeholder="Name" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
          <input type="text" placeholder="Description" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
          <input type="number" placeholder="Price" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})} />
          <input type="number" placeholder="Stock Quantity" value={newProduct.stock_quantity} onChange={e => setNewProduct({...newProduct, stock_quantity: parseInt(e.target.value)})} />
          <input type="text" placeholder="Color" value={newProduct.color} onChange={e => setNewProduct({...newProduct, color: e.target.value})} />
          <input type="file" onChange={e => setNewProduct({...newProduct, image: e.target.files[0]})} />
          <button onClick={addProduct}>Add Product</button>
          <button className="secondary" onClick={() => setIsAddingProduct(false)}>Cancel</button>
        </div>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal isOpen={editingProfile !== null} onClose={() => setEditingProfile(null)}>
        {editingProfile && (
          <div className="edit-form">
            <h3>Edit Profile</h3>
            <input type="text" value={editingProfile.username} onChange={e => setEditingProfile({...editingProfile, username: e.target.value})} placeholder="Username" />
            <input type="text" value={editingProfile.full_name} onChange={e => setEditingProfile({...editingProfile, full_name: e.target.value})} placeholder="Full Name" />
            <input type="number" value={editingProfile.age || ''} onChange={e => setEditingProfile({...editingProfile, age: parseInt(e.target.value)})} placeholder="Age" />
            <input type="text" value={editingProfile.phone || ''} onChange={e => setEditingProfile({...editingProfile, phone: e.target.value})} placeholder="Phone" />
            <input type="text" value={editingProfile.address || ''} onChange={e => setEditingProfile({...editingProfile, address: e.target.value})} placeholder="Address" />
            <button onClick={editProfile}>Save</button>
            <button className="secondary" onClick={() => setEditingProfile(null)}>Cancel</button>
          </div>
        )}
      </Modal>

      {/* ⭐ MODIFIED: Edit Order Modal (now with items list) */}
      <Modal isOpen={editingOrder !== null} onClose={() => setEditingOrder(null)}>
        {editingOrder && (
          <div className="edit-form">
            <h3>View/Edit Order (ID: {editingOrder.id})</h3>
            
            {/* Added Order Items List */}
            <h4>Items in this Order:</h4>
            <ul className="modal-item-list">
              {editingOrder.order_items.map((item, index) => (
                <li key={index}>
                  (Qty: {item.quantity}) Product ID: {item.product_id} @ ₱{item.price_at_purchase.toFixed(2)}
                  {item.product_size && ` (Size: ${item.product_size})`}
                  {item.product_color && ` (Color: ${item.product_color})`}
                </li>
              ))}
            </ul>
            <hr />
            
            <label>Status:</label>
            <select 
              value={editingOrder.status} 
              onChange={e => setEditingOrder({...editingOrder, status: e.target.value})}
            >
              {ORDER_STATUSES.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            
            <label>Total Amount:</label>
            <input type="number" value={editingOrder.total_amount} onChange={e => setEditingOrder({...editingOrder, total_amount: parseFloat(e.target.value)})} placeholder="Total Amount" />
            <label>Shipping Address:</label>
            <input type="text" value={editingOrder.shipping_address} onChange={e => setEditingOrder({...editingOrder, shipping_address: e.target.value})} placeholder="Shipping Address" />
            <label>Payment Method:</label>
            <input type="text" value={editingOrder.payment_method} onChange={e => setEditingOrder({...editingOrder, payment_method: e.target.value})} placeholder="Payment Method" />
            
            <button onClick={editOrder}>Save</button>
            <button className="secondary" onClick={() => setEditingOrder(null)}>Cancel</button>
          </div>
        )}
      </Modal>

      {/* Edit Product Modal */}
      <Modal isOpen={editingProduct !== null} onClose={() => setEditingProduct(null)}>
        {editingProduct && (
          <div className="edit-form">
            <h3>Edit Product</h3>
            <input type="text" value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} placeholder="Name" />
            <input type="text" value={editingProduct.description} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} placeholder="Description" />
            <input type="number" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})} placeholder="Price" />
            <input type="number" value={editingProduct.stock_quantity} onChange={e => setEditingProduct({...editingProduct, stock_quantity: parseInt(e.target.value)})} placeholder="Stock Quantity" />
            <input type="text" value={editingProduct.color || ''} onChange={e => setEditingProduct({...editingProduct, color: e.target.value})} placeholder="Color" />
            <label>Replace Image (optional):</label>
            <input type="file" onChange={e => setEditingProduct({...editingProduct, image: e.target.files[0]})} />
            <button onClick={editProduct}>Save</button>
            <button className="secondary" onClick={() => setEditingProduct(null)}>Cancel</button>
          </div>
        )}
      </Modal>

    </div>
  );
}

export default App;