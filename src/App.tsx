import React, { useState, createContext, useContext, useEffect } from 'react';
import { ShoppingCart, Menu, X, MapPin, MessageCircle, ArrowRight, Utensils, Trash2, Plus, Minus, User, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, RecaptchaVerifier, signInWithPhoneNumber, signOut, doc, getDoc, setDoc, collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs } from './firebase';

// ============ CHOPHOUSE CONFIG — EDIT HERE ============
const WHATSAPP_NUMBER = "2349158819885"; // Change to client number before launch
const RESTAURANT_NAME = "Chophouse Kitchen and Confectioneries";
const DELIVERY_NOTE = "Delivery fee will be confirmed via WhatsApp";
// ======================================================

declare global {
  interface Window {
    recaptchaVerifier: any;
    confirmationResult: any;
  }
}

type CartItem = {
  id: number;
  name: string;
  price: number; 
  quantity: number;
  priceString: string;
};

type UserProfile = {
  name: string;
  phone: string;
  address: string;
  landmark: string;
};

const AuthContext = createContext<any>(null);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [authMessage, setAuthMessage] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const profileDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (profileDoc.exists()) {
            setProfile(profileDoc.data() as UserProfile);
          } else {
            // New user without profile data yet (e.g. from Google sign in)
             const newProfile = {
               name: currentUser.displayName || "",
               phone: currentUser.phoneNumber || "",
               address: "",
               landmark: "",
             };
             setProfile(newProfile);
          }
        } catch (e) {
          console.error("Error fetching user profile", e);
        }
      } else {
        setProfile(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <AuthContext.Provider value={{ user, profile, setProfile, isAuthModalOpen, setIsAuthModalOpen, isProfileDrawerOpen, setIsProfileDrawerOpen, getInitials, authMessage, setAuthMessage }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

const CartContext = createContext<any>(null);

function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 2000);
  };

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      const numericPrice = parseInt(item.price.replace(/[^\d]/g, ''), 10);
      return [...prev, { id: item.id, name: item.name, price: numericPrice, quantity: 1, priceString: item.price }];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        return { ...item, quantity: newQty > 0 ? newQty : 1 };
      }
      return item;
    }));
  };

  const removeItem = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const clearCart = () => setCart([]);

  return (
    <CartContext.Provider value={{ cart, addToCart, updateQuantity, removeItem, clearCart, isCartOpen, setIsCartOpen, toastMessage, showToast }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);

const menuItems = [
  { id: 1, name: 'Jollof Rice', price: '₦1,200', description: 'Smoky party-style jollof, cooked to perfection', category: 'Rice Dishes', image: '/jollof-rice.png' },
  { id: 2, name: 'Fried Rice', price: '₦1,200', description: 'Colourful, flavourful fried rice with mixed vegetables', category: 'Rice Dishes', image: '/fried-rice.png' },
  { id: 3, name: 'White Rice & Stew', price: '₦1,000', description: 'Plain white rice served with rich tomato beef stew', category: 'Rice Dishes', image: '/white-rice-&-stew.png' },
  { id: 4, name: 'Coconut Rice', price: '₦1,300', description: 'Fragrant coconut-infused rice, lightly seasoned', category: 'Rice Dishes', image: '/coconut-rice.png' },

  { id: 5, name: 'Eba & Egusi Soup', price: '₦1,500', description: 'Firm eba paired with rich, melon-based egusi soup', category: 'Swallow & Soup', image: '/eba-and-egusi-soup.png' },
  { id: 6, name: 'Pounded Yam & Bitterleaf Soup', price: '₦1,800', description: 'Smooth pounded yam with traditional bitterleaf', category: 'Swallow & Soup', image: '/pounded-yam-&-bitterleaf-soup.png' },
  { id: 7, name: 'Amala & Ewedu', price: '₦1,500', description: 'Classic Yoruba combination, soft amala with ewedu draw soup', category: 'Swallow & Soup', image: '/amala-&-ewedu.png' },
  { id: 8, name: 'Semo & Okra Soup', price: '₦1,400', description: 'Stretchy semo served with fresh-cut okra soup', category: 'Swallow & Soup', image: '/semo-&-okro-soup.png' },

  { id: 9, name: 'Puff Puff', price: '₦400', description: 'Soft, fluffy deep-fried dough balls, lightly sweetened', category: 'Snacks', image: '/puff-puff.png' },
  { id: 10, name: 'Scotch Egg', price: '₦600', description: 'Boiled egg wrapped in spiced minced meat, deep fried', category: 'Snacks', image: '/scotch-egg.png' },
  { id: 11, name: 'Samosa (3 pcs)', price: '₦700', description: 'Crispy pastry filled with spiced meat and vegetables', category: 'Snacks', image: '/samosa-(3pcs).png' },
  { id: 12, name: 'Spring Roll (3 pcs)', price: '₦700', description: 'Golden fried rolls stuffed with seasoned vegetables', category: 'Snacks', image: '/spring-roll-(3pcs).png' },
  { id: 13, name: 'Meat Pie', price: '₦500', description: 'Buttery shortcrust pastry filled with minced meat and potatoes', category: 'Snacks', image: '/meat-pie.png' },

  { id: 14, name: 'Chin Chin', price: '₦500', description: 'Crunchy fried dough snack, lightly sweetened', category: 'Confectioneries', image: '/chin-chin.png' },
  { id: 15, name: 'Doughnut', price: '₦300', description: 'Soft ring doughnut with sugar glaze', category: 'Confectioneries', image: '/doughnut.png' },
  { id: 16, name: 'Bread Loaf', price: '₦1,000', description: 'Freshly baked soft white bread loaf', category: 'Confectioneries', image: '/bread-loaf.png' },
  { id: 17, name: 'Small Chops (platter)', price: '₦2,500', description: 'Assorted puff puff, samosa, spring roll, and scotch egg', category: 'Confectioneries', image: '/small-chops-(platter).png' },

  { id: 18, name: 'Chapman', price: '₦800', description: 'Classic Nigerian cocktail with Ribena, Fanta, and cucumber', category: 'Drinks', image: '/chapman.png' },
  { id: 19, name: 'Zobo', price: '₦400', description: 'Chilled hibiscus drink, lightly spiced and sweetened', category: 'Drinks', image: '/zobo.png' },
  { id: 20, name: 'Bottled Water', price: '₦200', description: 'Chilled sachet or bottled water', category: 'Drinks', image: '/bottled-water.png' },
  { id: 21, name: 'Soft Drinks', price: '₦400', description: 'Coke, Fanta, Sprite — choose your flavour', category: 'Drinks', image: '/soft-drinks.png' },
];

const categories = ['All', 'Rice Dishes', 'Swallow & Soup', 'Snacks', 'Confectioneries', 'Drinks'];

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { cart, setIsCartOpen } = useCart();
  const { user, profile, setIsAuthModalOpen, setIsProfileDrawerOpen, getInitials } = useAuth();
  const cartCount = cart.reduce((acc: number, item: any) => acc + item.quantity, 0);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`sticky top-0 z-50 bg-brand-white border-b-2 border-brand-orange transition-shadow duration-300 ${isScrolled ? 'shadow-[0_2px_20px_rgba(0,0,0,0.08)]' : 'shadow-none'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pl-4">
        <div className="flex justify-between h-20 items-center">
          
          {/* Logo Area */}
          <div className="flex-shrink-0 flex items-center gap-3 cursor-pointer overflow-visible">
            <img src="/logo.png" alt="Chophouse Kitchen and Confectioneries logo" className="h-14 md:h-16 w-auto object-contain mix-blend-multiply" />
            <div className="flex flex-col justify-center">
              <span className="font-bold text-xl md:text-2xl tracking-tighter text-brand-green-dark leading-none mb-1">CHOPHOUSE</span>
              <span className="text-[10px] md:text-xs font-bold text-brand-gold uppercase tracking-widest leading-none">Kitchen & Confectioneries</span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#menu" className="font-medium text-brand-green-dark hover:text-brand-orange transition-colors">Menu</a>
            <a href="#about" className="font-medium text-brand-green-dark hover:text-brand-orange transition-colors">About Us</a>
            <a href="#whatsapp" className="font-medium flex items-center gap-1.5 text-brand-green-dark hover:text-[#25D366] transition-colors">
              <MessageCircle size={18} />
              <span>Order via WhatsApp</span>
            </a>
            
            <div className="flex items-center gap-3">
              {!user ? (
                <button onClick={() => setIsAuthModalOpen(true)} className="px-4 py-2 rounded-full border-2 border-brand-green text-brand-green font-bold hover:bg-brand-orange hover:border-brand-orange hover:text-white transition-colors">
                  Sign In
                </button>
              ) : (
                <button onClick={() => setIsProfileDrawerOpen(true)} className="w-10 h-10 rounded-full bg-brand-orange text-white font-bold flex items-center justify-center text-sm">
                  {getInitials(profile?.name || user?.displayName || "")}
                </button>
              )}
              <button onClick={() => setIsCartOpen(true)} className="flex items-center gap-2 bg-brand-gold hover:shadow-[0_4px_15px_rgba(232,101,10,0.3)] text-white px-5 py-2.5 rounded-full font-medium transition-transform transform hover:scale-105 active:scale-95 shadow-md">
                <ShoppingCart size={18} />
                <span>{cartCount > 0 ? `View Cart (${cartCount})` : 'View Cart'}</span>
              </button>
            </div>
          </div>

          {/* Mobile Menu Button & Avatar outside */}
          <div className="md:hidden flex items-center gap-3">
            {user && (
              <button onClick={() => setIsProfileDrawerOpen(true)} className="w-9 h-9 rounded-full bg-brand-orange text-white font-bold flex items-center justify-center text-xs">
                {getInitials(profile?.name || user?.displayName || "")}
              </button>
            )}
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="text-brand-green-dark hover:text-brand-orange focus:outline-none p-2"
            >
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav Menu */}
      {isOpen && (
        <div className="md:hidden bg-brand-white border-t border-brand-orange absolute w-full left-0 shadow-lg">
          <div className="px-4 pt-2 pb-6 space-y-2 flex flex-col items-center">
            <a href="#menu" onClick={() => setIsOpen(false)} className="block w-full text-center px-3 py-3 text-brand-green-dark font-medium hover:bg-brand-orange-pale rounded-md">Menu</a>
            <a href="#about" onClick={() => setIsOpen(false)} className="block w-full text-center px-3 py-3 text-brand-green-dark font-medium hover:bg-brand-orange-pale rounded-md">About Us</a>
            <a href="#whatsapp" onClick={() => setIsOpen(false)} className="block w-full text-center px-3 py-3 text-[#25D366] font-medium hover:bg-brand-orange-pale rounded-md flex justify-center items-center gap-2">
              <MessageCircle size={18} /> Order via WhatsApp
            </a>
            <button onClick={() => { setIsCartOpen(true); setIsOpen(false); }} className="flex justify-center items-center gap-2 w-full mt-4 bg-brand-gold text-white px-5 py-3 rounded-full font-medium shadow-md mb-2">
              <ShoppingCart size={18} /> {cartCount > 0 ? `View Cart (${cartCount})` : 'View Cart'}
            </button>
            <div className="w-full h-px bg-brand-green-dark/10 my-2"></div>
            {!user ? (
              <button 
                onClick={() => { setIsAuthModalOpen(true); setIsOpen(false); }} 
                className="w-full bg-brand-orange text-white font-bold py-3 rounded-lg flex items-center justify-center"
              >
                Sign In to Your Account
              </button>
            ) : (
              <div className="flex flex-col w-full gap-2 text-center mt-2">
                <span className="font-bold text-brand-green-dark py-2">Hi, {profile?.name || user?.displayName || 'User'}</span>
                <button 
                  onClick={() => { signOut(auth); setIsOpen(false); }} 
                  className="w-full text-brand-green-dark font-bold py-3 bg-red-100/50 hover:bg-red-100 text-red-600 rounded-lg flex justify-center items-center gap-2"
                >
                  <LogOut size={18} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

function Hero() {
  return (
    <section className="relative w-full h-[80vh] min-h-[600px] flex items-center overflow-hidden">
      {/* Background Gradient & Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--brand-green-dark)_0%,var(--brand-green)_40%,var(--brand-orange)_100%)] animate-ken-burns">
        {/* Subtle patterned overlay to represent texture */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center md:items-start md:text-left">
        <div className="max-w-2xl">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-brand-white leading-[1.1] tracking-tight mb-6 drop-shadow-sm animate-fade-up" style={{ animationDelay: '100ms' }}>
            Real Nigerian Food, Made with Love
          </h1>
          <p className="text-lg md:text-xl text-brand-white/90 mb-10 max-w-xl font-medium animate-fade-up" style={{ animationDelay: '300ms' }}>
            Order fresh Chophouse meals from Idah &mdash; hot, authentic, and delivered direct to your door.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center animate-fade-up" style={{ animationDelay: '500ms' }}>
            <button 
              id="order-now-btn"
              onClick={() => document.querySelector('#menu')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center justify-center gap-2 bg-brand-orange hover:bg-brand-orange-light text-white text-lg font-semibold px-8 py-4 rounded-full transition-all transform hover:-translate-y-1 hover:shadow-xl active:translate-y-0"
            >
              Order Now
              <ArrowRight size={20} className="ml-1" />
            </button>
            <button 
              onClick={() => document.querySelector('#menu')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center justify-center text-brand-white font-medium px-8 py-4 rounded-full border border-brand-white hover:bg-brand-white hover:text-brand-green-dark transition-colors"
            >
              View Menu
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function AddToCartButton({ item }: { item: any }) {
  const { addToCart, showToast } = useCart();
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addToCart(item);
    setAdded(true);
    showToast("✓ Added to cart!");
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <motion.button 
      whileTap={{ scale: 0.95 }}
      animate={added ? { scale: [1, 1.05, 1] } : {}}
      transition={{ duration: 0.2 }}
      onClick={handleAdd} 
      className={`w-full flex items-center justify-center gap-2 font-bold px-4 py-3.5 rounded-xl transition-colors shrink-0 ${
        added 
          ? 'bg-green-500 text-brand-white border border-green-500' 
          : 'bg-brand-white text-brand-orange border border-brand-orange group-hover:bg-brand-orange group-hover:text-brand-white'
      }`}
    >
      {added ? <span>✓ Added!</span> : <span>+ Add to Cart</span>}
    </motion.button>
  );
}

function MenuSection() {
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredItems = activeCategory === 'All' 
    ? menuItems 
    : menuItems.filter(item => item.category === activeCategory);

  return (
    <section id="menu" className="py-24 bg-brand-orange-pale relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center gap-2 text-brand-orange font-bold uppercase tracking-widest text-sm mb-4">
            <span className="w-8 h-[2px] bg-brand-orange"></span>
            Our Menu
            <span className="w-8 h-[2px] bg-brand-orange"></span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-brand-green-dark tracking-tight leading-tight mb-6">
            What Would You Like <br className="hidden sm:block" />to Eat Today?
          </h2>
          <p className="text-lg text-gray-700">
            Fresh, authentic Nigerian dishes made daily. Add to cart and order in seconds.
          </p>
        </div>

        {/* Filters */}
        <div className="flex overflow-x-auto hide-scrollbar mb-12 -mx-4 px-4 sm:mx-0 sm:px-0 sm:justify-center gap-3 sm:gap-4 pb-4">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`relative whitespace-nowrap rounded-full px-6 py-2.5 font-medium transition-all shadow-sm flex-shrink-0 ${
                activeCategory === category
                  ? 'text-brand-white border border-transparent'
                  : 'bg-brand-white text-brand-green border border-brand-green hover:bg-brand-orange-pale hover:text-brand-orange hover:border-brand-orange-pale'
              }`}
            >
              {activeCategory === category && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-brand-orange rounded-full shadow-md z-0"
                  transition={{ type: 'spring', duration: 0.5, bounce: 0.1 }}
                />
              )}
              <span className="relative z-10">{category}</span>
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item, idx) => (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 40, scale: 0.97 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1], delay: idx * 0.1 }}
                key={item.id} 
                className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-gray-100 hover:border-brand-orange hover:border-2 transition-all duration-300 hover:-translate-y-[6px] group flex flex-col"
              >
                {/* Image Placeholder */}
                <div className="relative aspect-square w-full bg-brand-green-dark/5 flex items-center justify-center overflow-hidden">
                   {item.image ? (
                      <img src={item.image} alt={item.name} className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300" />
                   ) : (
                      <div className="text-brand-green/20 transform group-hover:scale-110 transition-transform duration-500">
                         <Utensils size={64} />
                      </div>
                   )}
                   <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                
                {/* Card Content */}
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-3 gap-4">
                    <h3 className="text-xl font-bold text-brand-green-dark leading-tight">{item.name}</h3>
                    <span className="font-bold text-brand-orange text-lg shrink-0">{item.price}</span>
                  </div>
                  <p className="text-gray-500 text-sm mb-6 flex-1 line-clamp-2">
                    {item.description}
                  </p>
                  <AddToCartButton item={item} />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {filteredItems.length === 0 && (
           <div className="text-center text-gray-500 py-12">
             No items found in this category.
           </div>
        )}

      </div>
    </section>
  );
}

function About() {
  return (
    <section id="about" className="py-24 bg-brand-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          
          {/* Left: Image Placeholder */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            className="relative w-full aspect-square md:aspect-[4/3] lg:aspect-square bg-brand-green-dark/10 rounded-3xl overflow-hidden shadow-inner group flex items-center justify-center"
          >
             <img 
               src="/restuarant-image-placeholder.jpg" 
               alt="Chophouse Restaurant" 
               className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-1000"
             />
             
             {/* Decorative element */}
             <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-brand-orange rounded-full opacity-20 blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          </motion.div>

          {/* Right: Text Content */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
            className="flex flex-col justify-center"
          >
            <div className="inline-flex items-center gap-2 text-brand-orange font-bold uppercase tracking-widest text-sm mb-4">
              <span className="w-8 h-[2px] bg-brand-orange"></span>
              Our Story
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-brand-green-dark tracking-tight leading-tight mb-6">
              Rooted in the <br/>Idah Community
            </h2>
            <div className="space-y-4 text-brand-text-dark text-lg leading-relaxed">
              <p>
                Chophouse Kitchen and Confectioneries is more than just an eatery. We are a locally-rooted culinary destination committed to bringing you the very best of authentic Nigerian flavors.
              </p>
              <p>
                From rich, aromatic soups that taste like home to perfectly baked confectioneries, every item on our menu is prepared daily using fresh, locally sourced ingredients. Our chefs pour their passion into creating dishes that celebrate exactly what Nigerian food should be.
              </p>
              <p>
                Whether you're grabbing a quick bite to start your morning or ordering a full feast for the family, Chophouse serves the Idah community with warmth, speed, and unforgettable taste. Come chop with us!
              </p>
            </div>
            
            <div className="mt-10">
               <button className="text-brand-orange font-semibold hover:underline transition-all inline-flex items-center gap-2">
                 Learn more about us
                 <ArrowRight size={16} />
               </button>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}

// Helper icon component for the About section placeholder
function UtensilsCrossed({ size = 24 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"/>
      <path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"/>
      <path d="m2.1 21.8 6.4-6.3"/>
      <path d="m19 5-7 7"/>
    </svg>
  );
}

function Footer() {
  return (
    <footer className="bg-brand-green-dark text-white pt-16 pb-8 border-t-[4px] border-brand-orange">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          
          {/* Brand Col */}
          <div>
            <div className="inline-flex items-center gap-3 mb-6 bg-brand-white p-3 rounded-2xl shadow-sm">
              <img src="/logo.png" alt="Chophouse Kitchen and Confectioneries logo" className="h-14 w-auto object-contain mix-blend-multiply" />
              <div className="flex flex-col justify-center pr-3">
                <span className="font-bold text-xl tracking-tighter text-brand-green-dark leading-none mb-1">CHOPHOUSE</span>
                <span className="text-[10px] font-bold text-brand-gold uppercase tracking-widest leading-none">Kitchen & Confectioneries</span>
              </div>
            </div>
            <p className="text-white/70 max-w-sm mb-6 leading-relaxed">
              Serving the finest and most authentic Nigerian dishes and confectioneries directly to you.
            </p>
          </div>

          {/* Location Col */}
          <div>
            <h3 className="font-bold text-lg mb-6 text-brand-orange">Visit Us</h3>
            <div className="flex items-start gap-3">
              <MapPin className="text-brand-orange mt-1 flex-shrink-0" size={20} />
              <div>
                <p className="font-medium text-white">Chophouse Eatery</p>
                <p className="text-white/70 mt-1">Idah, Kogi State</p>
                <p className="text-white/70">Nigeria</p>
              </div>
            </div>
          </div>

          {/* Contact Col */}
          <div>
            <h3 className="font-bold text-lg mb-6 text-brand-orange">Order & Support</h3>
            <a href="#whatsapp" className="inline-flex items-center gap-3 bg-brand-green-light text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-all mb-4">
              <MessageCircle size={24} />
              Message us on WhatsApp
            </a>
            <p className="text-sm text-white/70">
              Available 8am - 9pm daily for pickup and delivery.
            </p>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-8 border-t border-white/20 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-white/70">
          <p>&copy; {new Date().getFullYear()} Chophouse Kitchen and Confectioneries. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-brand-orange transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-brand-orange transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function CartDrawer() {
  const { cart, updateQuantity, removeItem, isCartOpen, setIsCartOpen, clearCart } = useCart();
  const { user, setIsAuthModalOpen, setAuthMessage } = useAuth();
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  const subtotal = cart.reduce((acc: number, item: any) => acc + item.price * item.quantity, 0);

  const handleCheckoutClick = () => {
    if (user) {
      setIsCheckoutModalOpen(true);
    } else {
      setIsCartOpen(false);
      setAuthMessage("Please sign in to complete your order");
      setIsAuthModalOpen(true);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-[60] flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              transition={{ duration: 0.3 }}
              className="absolute inset-0 bg-black/40" 
              onClick={() => setIsCartOpen(false)}
            />
            <motion.div 
              initial={{ x: '100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '100%' }} 
              transition={{ duration: 0.35, ease: "easeOut" }} 
              className="relative w-[100vw] md:w-full max-w-none md:max-w-md bg-white h-full shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b flex justify-between items-center bg-brand-green-dark text-white">
                <h2 className="text-2xl font-bold text-white">Your Order</h2>
                <button onClick={() => setIsCartOpen(false)} className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-white/10 rounded-full">
                  <X size={24} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-500">
                    <span className="text-4xl mb-4">🥣</span>
                    <p>Your cart is empty. Add some delicious meals!</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {cart.map((item: any) => (
                      <div key={item.id} className="flex gap-4 items-center">
                        <div className="flex-1">
                          <h4 className="font-bold text-brand-green-dark">{item.name}</h4>
                          <p className="text-brand-orange font-medium">₦{item.price.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center border border-brand-orange rounded-lg text-brand-orange">
                            <button onClick={() => updateQuantity(item.id, -1)} className="p-2 hover:bg-brand-orange-pale"><Minus size={16} /></button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} className="p-2 hover:bg-brand-orange-pale"><Plus size={16} /></button>
                          </div>
                          <button onClick={() => removeItem(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 border-t bg-gray-50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-600">Subtotal:</span>
                    <span className="font-bold text-xl text-brand-green-dark">₦{subtotal.toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-6">{DELIVERY_NOTE}</p>
                  
                  <div className="space-y-3">
                    <button onClick={handleCheckoutClick} className="w-full bg-brand-orange hover:bg-brand-orange-light text-white font-bold py-4 rounded-xl transition-colors animate-pulse-orange inline-block">
                      Order via WhatsApp →
                    </button>
                    <div className="relative group">
                      <button disabled className="w-full bg-transparent border-2 border-gray-200 text-gray-400 font-bold py-4 rounded-xl cursor-not-allowed">
                        Pay Online
                      </button>
                      <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Coming Soon</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isCheckoutModalOpen && (
        <CheckoutModal 
          onClose={() => setIsCheckoutModalOpen(false)} 
          cart={cart} 
          subtotal={subtotal} 
          clearCart={() => {
            clearCart();
            setIsCartOpen(false);
          }} 
        />
      )}
    </>
  );
}

function CheckoutModal({ onClose, cart, subtotal, clearCart }: { onClose: () => void, cart: any[], subtotal: number, clearCart: () => void }) {
  const { user, profile } = useAuth();
  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<{name?: string, phone?: string, address?: string}>({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      if (profile.name) setName(profile.name);
      if (profile.phone) setPhone(profile.phone);
      if (profile.address) setAddress(profile.address);
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: any = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!phone.trim()) newErrors.phone = 'Phone number is required';
    if (!address.trim()) newErrors.address = 'Delivery address is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      if (user) {
        await addDoc(collection(db, "orders"), {
          userId: user.uid,
          customerName: name,
          customerPhone: phone,
          customerAddress: address,
          orderNote: note,
          items: cart,
          subtotal: subtotal,
          status: "pending",
          timestamp: serverTimestamp()
        });
      }
    } catch (e) {
      console.error("Error saving order: ", e);
    }

    let message = `🍽️ *New Order — ${RESTAURANT_NAME}*\n\n`;
    message += `📋 *Order Details:*\n`;
    cart.forEach(item => {
      message += `• ${item.quantity}x ${item.name} — ₦${(item.price * item.quantity).toLocaleString()}\n`;
    });
    message += `\n💰 *Subtotal: ₦${subtotal.toLocaleString()}*\n\n`;
    message += `👤 *Customer Details:*\n`;
    message += `Name: ${name}\n`;
    message += `Phone: ${phone}\n`;
    message += `Address: ${address}\n\n`;
    message += `📝 Note: ${note.trim() ? note : "None"}\n\n`;
    message += `_Sent from ${RESTAURANT_NAME} website_`;

    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
    setSuccess(true);
    setTimeout(() => {
      clearCart();
    }, 3000);
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60" onClick={() => { clearCart(); onClose(); }}></div>
        <div className="relative bg-white rounded-2xl w-full max-w-md p-8 text-center">
           <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
             <MessageCircle size={32} />
           </div>
           <h3 className="text-2xl font-bold text-brand-green-dark mb-2">Order Sent!</h3>
           <p className="text-gray-600 mb-6">Your order has been sent! We'll confirm via WhatsApp shortly.</p>
           <button onClick={() => { clearCart(); onClose(); }} className="w-full bg-brand-orange text-white font-bold py-3 rounded-xl">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
          <h3 className="text-xl font-bold text-brand-green-dark">Almost there! Tell us where to deliver</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className={`w-full border p-3 rounded-xl outline-none focus:border-brand-orange ${errors.name ? 'border-red-500' : 'border-gray-200'}`} placeholder="Enter your full name" />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={`w-full border p-3 rounded-xl outline-none focus:border-brand-orange ${errors.phone ? 'border-red-500' : 'border-gray-200'}`} placeholder="Enter your phone number" />
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address</label>
              <textarea value={address} onChange={e => setAddress(e.target.value)} rows={3} className={`w-full border p-3 rounded-xl outline-none focus:border-brand-orange resize-none ${errors.address ? 'border-red-500' : 'border-gray-200'}`} placeholder="Enter your full delivery address"></textarea>
              {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order Note (Optional)</label>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} className="w-full border border-gray-200 p-3 rounded-xl outline-none focus:border-brand-orange resize-none" placeholder="Any special requests?"></textarea>
            </div>
          </div>
          
          <button type="submit" className="w-full bg-brand-green-dark hover:opacity-90 text-white font-bold py-4 rounded-xl transition-colors mt-8 flex items-center justify-center gap-2">
            Send Order on WhatsApp →
          </button>
        </form>
      </div>
    </div>
  );
}

function AwardBanner() {
  return (
    <div className="w-full bg-brand-orange text-brand-white py-4 overflow-hidden relative">
      <div className="absolute inset-0 animate-shimmer" style={{ backgroundImage: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)" }}></div>
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center justify-center">
        <div className="font-bold text-lg md:text-xl flex items-center justify-center gap-2">
          <span>🏆</span>
          <span>Meritorious Award — Best Eatery in Idah, Kogi State</span>
        </div>
        <p className="text-sm md:text-base font-medium opacity-90 mt-1">
          Presented by the National Youth Council of Nigeria (NYCN), Idah Chapter
        </p>
      </div>
    </div>
  );
}

function Testimonials() {
  const reviews = [
    {
      id: 1,
      stars: "★★★★★",
      review: "Their meal is top notch. Their pastries are on another level. Everything is just very okay with this eatery.",
      name: "Mary Ogohi",
      subtitle: "Google Review · 5 stars",
    },
    {
      id: 2,
      stars: "★★★★★",
      review: "Chophouse is one of the best restaurants known in my city. Known for their great disposition towards satisfying their customers and making them happy.",
      name: "Patricia Okoliko",
      subtitle: "Google Review · 5 stars",
    },
    {
      id: 3,
      stars: "★★★★★",
      review: "Beautiful service delivery.",
      name: "Dr. Francis A. Egu",
      subtitle: "Google Review · Local Guide · 5 stars",
    }
  ];

  return (
    <section className="py-24 bg-brand-green-dark relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center gap-2 text-brand-orange-light font-bold uppercase tracking-widest text-sm mb-4">
            <span className="w-8 h-[2px] bg-brand-orange-light"></span>
            WHAT PEOPLE SAY
            <span className="w-8 h-[2px] bg-brand-orange-light"></span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight mb-6">
            Customers Review
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {reviews.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1], delay: idx * 0.1 }}
              className="bg-brand-white rounded-3xl p-8 shadow-sm border border-brand-orange border-l-4 flex flex-col h-full"
            >
              <div className="text-brand-gold text-2xl tracking-widest mb-4">{item.stars}</div>
              <p className="text-gray-600 italic text-lg leading-relaxed flex-1 mb-6">
                "{item.review}"
              </p>
              <div>
                <h4 className="font-bold text-brand-green-dark text-lg">{item.name}</h4>
                <p className="text-sm text-gray-500 mt-1">{item.subtitle}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PhotoGallery() {
  const images = [1, 2, 3, 4, 5, 6, 7, 8];
  
  return (
    <section className="py-24 bg-brand-orange-pale relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-12">
        <div className="inline-flex items-center justify-center gap-2 text-brand-orange font-bold uppercase tracking-widest text-sm mb-4">
          <span className="w-8 h-[2px] bg-brand-orange"></span>
          OUR COMMUNITY
          <span className="w-8 h-[2px] bg-brand-orange"></span>
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-brand-green-dark tracking-tight leading-tight mb-4">
          Come Experience Chophouse
        </h2>
        <p className="text-lg text-gray-700 max-w-2xl mx-auto">
          Real moments from our kitchen, our customers, and our community in Idah.
        </p>
      </div>

      <div className="w-full flex overflow-hidden group">
        <div className="flex animate-marquee group-hover:[animation-play-state:paused] w-max">
          {[...images, ...images].map((imgNum, idx) => (
            <div key={idx} className="relative w-[320px] h-[280px] rounded-xl mx-3 overflow-hidden flex-shrink-0 group/item bg-gray-200">
               <img 
                 src={`/gallery-${imgNum}.jpg`} 
                 alt={`Gallery moment ${imgNum}`} 
                 className={`gallery-${imgNum} absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover/item:scale-105`} 
               />
               <div className="absolute inset-0 bg-black/0 group-hover/item:bg-black/10 transition-colors duration-300 pointer-events-none"></div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center mt-8 text-gray-500 font-medium text-sm">
        📍 Serving Idah, Kogi State since day one.
      </div>
    </section>
  );
}

function FloatingMobileCart() {
  const { cart, setIsCartOpen } = useCart();
  const cartCount = cart.reduce((acc: number, item: any) => acc + item.quantity, 0);

  return (
    <button
      onClick={() => setIsCartOpen(true)}
      className="md:hidden fixed bottom-5 right-5 z-[9999] bg-brand-orange text-white font-bold rounded-full px-5 py-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.25)] flex items-center gap-2"
    >
      <span>🛒</span>
      {cartCount > 0 ? (
        <span className="flex items-center gap-1.5">
          View Cart 
          <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full min-w-[20px] text-center">{cartCount}</span>
        </span>
      ) : (
        <span>Cart</span>
      )}
    </button>
  );
}

function MobileToast() {
  const { toastMessage } = useCart();

  return (
    <AnimatePresence>
      {toastMessage && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          style={{ position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)', zIndex: 99999 }}
          className="md:hidden bg-brand-green-dark text-white text-sm px-5 py-2.5 rounded-lg whitespace-nowrap shadow-lg flex items-center justify-center"
        >
          {toastMessage}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AuthModal() {
  const { isAuthModalOpen, setIsAuthModalOpen, setProfile, authMessage, setAuthMessage } = useAuth();
  const { setIsCartOpen } = useCart();
  const [tab, setTab] = useState<'signin'|'signup'>('signin');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');

  const mapAuthError = (code: string) => {
    switch (code) {
      case 'auth/invalid-phone-number': return "Please enter a valid Nigerian phone number";
      case 'auth/invalid-verification-code': return "Incorrect OTP. Please try again";
      case 'auth/too-many-requests': return "Too many attempts. Please wait a few minutes";
      case 'auth/popup-closed-by-user': return "Google sign-in was cancelled";
      case 'auth/user-not-found': return "User not found. Please sign up.";
      default: return "An error occurred. Please try again.";
    }
  };

  const handleSendOTP = async () => {
    setError('');
    let formattedPhone = phone;
    if (formattedPhone.startsWith('0')) formattedPhone = '+234' + formattedPhone.slice(1);
    else if (!formattedPhone.startsWith('+')) formattedPhone = '+234' + formattedPhone;
    
    try {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: (response: any) => {}
        });
      }
      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier);
      window.confirmationResult = confirmationResult;
      setOtpSent(true);
    } catch (e: any) {
      console.error(e);
      setError(mapAuthError(e.code));
    }
  };

  const handleVerifyOTP = async () => {
    setError('');
    try {
      const result = await window.confirmationResult.confirm(otp);
      const user = result.user;
      await handlePostAuth(user);
    } catch (e: any) {
      setError(mapAuthError(e.code));
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await handlePostAuth(result.user);
    } catch (e: any) {
      setError(mapAuthError(e.code));
    }
  };

  const handlePostAuth = async (user: any) => {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const newProfile = {
        name: name || user.displayName || '',
        phone: user.phoneNumber || phone || '',
        address: '',
        landmark: '',
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      };
      await setDoc(userRef, newProfile);
      setProfile(newProfile);
    } else {
      await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
    }
    
    const wasCheckoutRedirect = !!authMessage;
    setAuthMessage('');
    setIsAuthModalOpen(false);

    // Show a toast here
    const toastMessage = `Welcome back, ${name || user.displayName || 'Friend'}! 👋`;
    
    // Create a temporary element to show the toast since we're outside useCart maybe? Wait, we can get it from useCart!
    
    if (wasCheckoutRedirect) {
      setIsCartOpen(true);
    }
  };

  const handleClose = () => {
    setAuthMessage('');
    setIsAuthModalOpen(false);
  };

  if (!isAuthModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={handleClose}></div>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
      >
        <div className="bg-brand-green-dark p-6 relative text-center">
          <span className="font-bold text-xl tracking-tighter text-white block">CHOPHOUSE</span>
          <button onClick={handleClose} className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-full">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 pt-2">
          {authMessage && (
            <div className="text-center text-brand-orange font-bold mt-4 mb-4">{authMessage}</div>
          )}

          {/* Tabs */}
          <div className="flex border-b mb-6 mt-4">
            <button onClick={() => { setTab('signin'); setOtpSent(false); setOtp(''); }} className={`flex-1 py-3 font-medium text-sm transition-all border-b-2 ${tab === 'signin' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-gray-500 hover:text-gray-900'}`}>Sign In</button>
            <button onClick={() => { setTab('signup'); setOtpSent(false); setOtp(''); }} className={`flex-1 py-3 font-medium text-sm transition-all border-b-2 ${tab === 'signup' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-gray-500 hover:text-gray-900'}`}>Sign Up</button>
          </div>

        {error && <div className="mb-4 text-red-500 text-sm font-medium text-center bg-red-50 p-2 rounded-lg">{error}</div>}

        {tab === 'signup' && (
          <div className="mb-4">
            <input 
              type="text" 
              placeholder="Full Name" 
              value={name} 
              onChange={e => setName(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 mb-3 focus:outline-none focus:ring-2 focus:ring-brand-orange"
            />
          </div>
        )}

        <div className="mb-4 flex gap-2">
           <span className="bg-gray-100 text-gray-500 rounded-xl px-4 flex items-center justify-center font-medium border border-gray-200">+234</span>
           <input 
             type="tel" 
             placeholder="Phone Number" 
             value={phone} 
             onChange={e => setPhone(e.target.value)}
             className="flex-1 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-orange"
           />
        </div>

        {!otpSent ? (
          <button onClick={handleSendOTP} disabled={!phone || (tab==='signup' && !name)} className="w-full bg-brand-orange hover:bg-brand-orange-light min-h-[44px] text-white font-bold py-3 rounded-xl disabled:opacity-50">
            Send OTP
          </button>
        ) : (
          <div className="mb-4 animate-fade-up">
            <input 
               type="text" 
               placeholder="6-digit OTP" 
               value={otp} 
               onChange={e => setOtp(e.target.value)}
               className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 mb-3 text-center tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-brand-orange"
            />
            <button onClick={handleVerifyOTP} disabled={otp.length < 6} className="w-full bg-brand-orange hover:bg-brand-orange-light text-white min-h-[44px] font-bold py-3 rounded-xl disabled:opacity-50">
              Verify OTP
            </button>
          </div>
        )}

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gray-200"></div>
          <span className="text-gray-400 text-sm">— or —</span>
          <div className="flex-1 h-px bg-gray-200"></div>
        </div>

        <button onClick={handleGoogleSignIn} className="w-full flex items-center justify-center gap-3 bg-white border border-brand-green hover:bg-gray-50 text-brand-green-dark min-h-[44px] font-bold py-3 rounded-xl transition-colors">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        {tab === 'signup' && (
          <p className="text-xs text-center text-gray-500 mt-6">
            By signing up you agree to receive order updates via WhatsApp
          </p>
        )}
        </div>
      </motion.div>
    </div>
  );
}

function ProfileDrawer() {
  const { user, profile, isProfileDrawerOpen, setIsProfileDrawerOpen, getInitials } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || user?.displayName || '');
      setPhone(profile.phone || user?.phoneNumber || '');
      setAddress(profile.address || '');
      setLandmark(profile.landmark || '');
      fetchOrders();
    }
  }, [profile, isProfileDrawerOpen]);

  const fetchOrders = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, "orders"), where("userId", "==", user.uid), orderBy("timestamp", "desc"), limit(5));
      const snap = await getDocs(q);
      setOrders(snap.docs.map(d => ({id: d.id, ...d.data()})));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, "users", user.uid), {
        name, phone, address, landmark
      }, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setIsProfileDrawerOpen(false);
  };

  return (
    <AnimatePresence>
      {isProfileDrawerOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="absolute inset-0 bg-black/40" 
            onClick={() => setIsProfileDrawerOpen(false)}
          />
          <motion.div 
            initial={{ x: '100%' }} 
            animate={{ x: 0 }} 
            exit={{ x: '100%' }} 
            transition={{ duration: 0.35, ease: "easeOut" }} 
            className="relative w-[100vw] md:w-full max-w-none md:max-w-md bg-white h-full shadow-2xl flex flex-col"
          >
            <div className="p-6 border-b flex justify-between items-center bg-brand-white">
              <h2 className="text-2xl font-bold text-brand-green-dark">My Profile</h2>
              <div className="flex items-center gap-4">
                <button onClick={handleSignOut} className="text-red-500 font-bold text-sm hover:underline flex items-center gap-1">
                  <LogOut size={16} /> Sign Out
                </button>
                <button onClick={() => setIsProfileDrawerOpen(false)} className="p-2 hover:bg-gray-200 rounded-full">
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 bg-brand-orange rounded-full flex items-center justify-center text-3xl font-bold text-white mb-4">
                  {getInitials(name)}
                </div>
                <h3 className="text-lg font-bold text-gray-900">{name}</h3>
                <p className="text-gray-500 text-sm mt-1">{phone || user?.email}</p>
              </div>

              <div>
                <h4 className="font-bold text-brand-green-dark mb-4 flex items-center gap-2 border-b pb-2">
                  <User size={18} /> Edit Details
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600 block mb-1">Full Name</label>
                    <input type="text" value={name} onChange={e=>setName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-brand-orange" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 block mb-1">Phone Number</label>
                    <input type="text" value={phone} onChange={e=>setPhone(e.target.value)} readOnly={user?.phoneNumber ? true : false} className={`w-full border border-gray-200 rounded-lg px-4 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-brand-orange ${user?.phoneNumber ? 'bg-gray-100 text-gray-500' : 'bg-gray-50'}`} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 block mb-1">Delivery Address</label>
                    <textarea value={address} onChange={e=>setAddress(e.target.value)} rows={2} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange"></textarea>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 block mb-1">Nearest Landmark (Optional)</label>
                    <input type="text" value={landmark} onChange={e=>setLandmark(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-brand-orange" />
                  </div>
                  <button onClick={handleSave} className="w-full min-h-[44px] bg-brand-orange hover:bg-brand-orange-light text-white font-bold py-3 rounded-lg transition-colors">
                    {saved ? "Profile updated ✓" : "Save Profile"}
                  </button>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-brand-green-dark mb-4 flex items-center gap-2 border-b pb-2">
                  <ShoppingCart size={18} /> My Orders
                </h4>
                {orders.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">You haven't placed any orders yet. Start exploring our menu!</p>
                ) : (
                  <div className="space-y-3 mt-4">
                    {orders.map(order => (
                       <div key={order.id} className="border border-gray-100 rounded-lg p-4 bg-gray-50 shadow-sm">
                         <div className="flex justify-between items-start mb-2">
                           <span className="text-xs text-gray-500">{order.timestamp?.toDate ? order.timestamp.toDate().toLocaleDateString() : 'Just now'}</span>
                           <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${order.status==='pending'?'bg-brand-orange-pale text-brand-orange' : order.status==='confirmed'?'bg-green-100 text-brand-green':'bg-gray-200 text-gray-500'}`}>{order.status}</span>
                         </div>
                         <div className="text-sm font-medium text-gray-800 mb-1">
                           {order.items?.map((i:any)=>`${i.quantity}x ${i.name}`).join(', ')}
                         </div>
                         <div className="font-bold text-brand-green-dark">₦{order.subtotal?.toLocaleString()}</div>
                       </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <div className="min-h-screen bg-brand-white flex flex-col font-sans selection:bg-brand-orange selection:text-white">
          <Navbar />
          <main className="flex-1">
            <Hero />
            <AwardBanner />
            <MenuSection />
            <About />
            <Testimonials />
            <PhotoGallery />
          </main>
          <Footer />
          <CartDrawer />
          <AuthModal />
          <ProfileDrawer />
          <MobileToast />
          <FloatingMobileCart />
          <div id="recaptcha-container"></div>
        </div>
      </CartProvider>
    </AuthProvider>
  );
}

